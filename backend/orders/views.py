import os
import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from products.models import Product
from users.address_utils import normalize_address_text
from users.models import Address

from .delivery_service import DeliveryOptimizer
from .models import CartItem, Order
from .serializers import BatchDeliveryMetricsSerializer, BatchDeliveryResultSerializer, CartItemSerializer, DeliveryMetricsResultSerializer, DeliveryMetricsSerializer, OrderSerializer


def _get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()

    if not key_id or not key_secret:
        raise ValueError("Razorpay keys are not configured in backend environment.")

    try:
        import razorpay  # pylint: disable=import-outside-toplevel
    except ImportError as exc:  # pragma: no cover - environment-specific
        raise ImportError("Razorpay SDK is not installed. Run: pip install razorpay") from exc

    client = razorpay.Client(auth=(key_id, key_secret))
    return client, key_id


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Order.objects.filter(Q(consumer=user) | Q(product__farmer=user)).order_by("-created_at")

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data.get("quantity", 1)
        subtotal = Decimal(product.price) * Decimal(quantity)
        shipping_cost = Decimal("50.00")
        tax = subtotal * Decimal("0.05")
        total_price = subtotal + shipping_cost + tax
        serializer.save(consumer=self.request.user, subtotal=subtotal, shipping_cost=shipping_cost, tax=tax, total_price=total_price)

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        requested_status = request.data.get("status")
        user = request.user

        if requested_status == "cancelled":
            is_customer_cancel = order.consumer == user and order.status in ["pending", "confirmed"]
            is_farmer_reject = getattr(order.product, "farmer_id", None) == user.id and order.status in ["pending", "confirmed"]

            if not (is_customer_cancel or is_farmer_reject):
                raise PermissionDenied("Only pending or confirmed orders can be cancelled/rejected.")

            with transaction.atomic():
                locked_order = Order.objects.select_for_update().select_related("product").get(pk=order.pk)
                if locked_order.status == "cancelled":
                    serializer = self.get_serializer(locked_order)
                    return Response(serializer.data)

                locked_order.product.quantity = F("quantity") + locked_order.quantity
                locked_order.product.save(update_fields=["quantity"])
                locked_order.status = "cancelled"
                locked_order.save(update_fields=["status", "updated_at"])
                locked_order.refresh_from_db()

            serializer = self.get_serializer(locked_order)
            return Response(serializer.data)

        allowed_farmer_transitions = {
            "pending": {"confirmed"},
            "confirmed": {"packed"},
            "packed": {"shipped"},
            "shipped": {"out_for_delivery"},
            "out_for_delivery": {"delivered"},
        }

        is_farmer = getattr(order.product, "farmer_id", None) == user.id
        if is_farmer and requested_status in allowed_farmer_transitions.get(order.status, set()):
            order.status = requested_status
            order.save(update_fields=["status", "updated_at"])
            order.refresh_from_db()
            serializer = self.get_serializer(order)
            return Response(serializer.data)

        raise PermissionDenied("You are not allowed to make this status change.")

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        if order.consumer != request.user:
            raise PermissionDenied("You cannot delete this order.")
        if order.status not in ["cancelled", "delivered"]:
            raise PermissionDenied("Only cancelled or delivered orders can be removed.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="delivery/calculate")
    def calculate_delivery_metrics(self, request):
        serializer = DeliveryMetricsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        optimizer = DeliveryOptimizer()
        metrics = optimizer.calculate_delivery_metrics(
            farmer_location={
                "address": serializer.validated_data["farmer_location"],
                "latitude": serializer.validated_data.get("farmer_latitude"),
                "longitude": serializer.validated_data.get("farmer_longitude"),
            },
            customer_location={
                "address": serializer.validated_data["customer_location"],
                "latitude": serializer.validated_data.get("customer_latitude"),
                "longitude": serializer.validated_data.get("customer_longitude"),
            },
            freshness_score=serializer.validated_data.get("freshness_score", 0.8),
            temperature_controlled=serializer.validated_data.get("temperature_controlled", True),
            product_type=serializer.validated_data.get("product_type", "vegetables"),
        )
        if "error" in metrics:
            return Response({"detail": metrics["error"]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DeliveryMetricsResultSerializer(metrics).data)

    @action(detail=False, methods=["post"], url_path="delivery/batch-calculate")
    def batch_delivery_metrics(self, request):
        serializer = BatchDeliveryMetricsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        optimizer = DeliveryOptimizer()
        metrics = optimizer.calculate_batch_delivery_metrics(
            farmer_location={
                "address": serializer.validated_data["farmer_location"],
                "latitude": serializer.validated_data.get("farmer_latitude"),
                "longitude": serializer.validated_data.get("farmer_longitude"),
            },
            deliveries=[
                {
                    **item,
                    "customer_location": {
                        "address": item["customer_location"],
                        "latitude": item.get("customer_latitude"),
                        "longitude": item.get("customer_longitude"),
                    },
                }
                for item in serializer.validated_data["deliveries"]
            ],
            temperature_controlled=serializer.validated_data.get("temperature_controlled", True),
        )
        if "error" in metrics:
            return Response({"detail": metrics["error"]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(BatchDeliveryResultSerializer(metrics).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product = Product.objects.get(id=request.data.get("product_id"))
    quantity = int(request.data.get("quantity", 1))
    cart_item, created = CartItem.objects.get_or_create(user=request.user, product=product)
    cart_item.quantity = cart_item.quantity + quantity if not created else quantity
    cart_item.save()
    return Response({"message": "Added to cart"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_cart(request):
    return Response(CartItemSerializer(CartItem.objects.filter(user=request.user), many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cart_count(request):
    return Response({"count": CartItem.objects.filter(user=request.user).count()})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    try:
        CartItem.objects.get(id=item_id, user=request.user).delete()
        return Response({"message": "Item removed"})
    except CartItem.DoesNotExist:
        return Response({"error": "Item not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def checkout(request):
    cart_items = CartItem.objects.filter(user=request.user)
    if not cart_items.exists():
        return Response({"error": "Cart is empty"}, status=400)

    payment_method = request.data.get("payment_method")
    if payment_method in {"UPI", "CARD"} and not request.data.get("razorpay_payment_id"):
        return Response({"error": "Digital payment is not verified yet."}, status=400)
    if payment_method in {"UPI", "CARD"} and os.getenv("STRICT_DIGITAL_PAYMENT", "0") == "1":
        payment_id = str(request.data.get("razorpay_payment_id") or "")
        order_id = str(request.data.get("razorpay_order_id") or "")
        if payment_id.startswith("sim_") or order_id.startswith("sim_"):
            return Response(
                {"error": "Simulated digital payments are disabled in strict mode."},
                status=400,
            )

    address_id = request.data.get("address_id")
    raw_address = request.data.get("address")
    final_address = ""
    final_latitude = None
    final_longitude = None

    if address_id:
        try:
            saved_address = Address.objects.get(id=address_id, user=request.user)
            final_address = saved_address.normalized_address or saved_address.address
            final_latitude = saved_address.latitude
            final_longitude = saved_address.longitude
        except Address.DoesNotExist:
            return Response({"error": "Selected address was not found."}, status=404)
    elif raw_address:
        cleaned = normalize_address_text(raw_address)
        final_address = cleaned["normalized"] or raw_address.strip()
        final_latitude = request.data.get("latitude")
        final_longitude = request.data.get("longitude")

    if not final_address:
        return Response({"error": "Delivery address is required"}, status=400)

    with transaction.atomic():
        for item in cart_items:
            product = item.product
            if product.quantity < item.quantity:
                return Response({"error": f"Not enough stock for {product.name}"}, status=400)
            product.quantity -= item.quantity
            product.save()
            Order.objects.create(
                consumer=request.user,
                product=product,
                quantity=item.quantity,
                payment_method=payment_method,
                delivery_address=final_address,
                delivery_latitude=final_latitude,
                delivery_longitude=final_longitude,
            )
        cart_items.delete()

    return Response({"message": "Order placed successfully", "delivery_address": final_address, "delivery_latitude": final_latitude, "delivery_longitude": final_longitude})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_payment_order(request):
    try:
        amount = int(request.data.get("amount", 0))
    except (TypeError, ValueError):
        return Response({"error": "Invalid amount"}, status=400)

    if amount <= 0:
        return Response({"error": "Amount must be greater than zero"}, status=400)

    currency = str(request.data.get("currency", "INR")).upper()
    payment_mode = str(request.data.get("payment_mode", "UPI")).upper()

    try:
        client, key_id = _get_razorpay_client()
        receipt = f"fd_{request.user.id}_{uuid.uuid4().hex[:12]}"
        order_data = {
            "amount": amount,
            "currency": currency,
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "user_id": str(request.user.id),
                "payment_mode": payment_mode,
            },
        }
        created = client.order.create(order_data)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=500)
    except ImportError as exc:
        return Response({"error": str(exc)}, status=500)
    except Exception as exc:  # pragma: no cover - gateway/runtime failures
        return Response({"error": f"Failed to create payment order: {exc}"}, status=500)

    return Response(
        {
            "key": key_id,
            "order_id": created.get("id"),
            "amount": created.get("amount"),
            "currency": created.get("currency", currency),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_payment_signature(request):
    razorpay_order_id = request.data.get("razorpay_order_id")
    razorpay_payment_id = request.data.get("razorpay_payment_id")
    razorpay_signature = request.data.get("razorpay_signature")

    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        return Response({"error": "Missing Razorpay verification fields"}, status=400)

    try:
        client, _ = _get_razorpay_client()
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=500)
    except ImportError as exc:
        return Response({"error": str(exc)}, status=500)
    except Exception:
        return Response({"error": "Payment signature verification failed"}, status=400)

    return Response({"verified": True})
