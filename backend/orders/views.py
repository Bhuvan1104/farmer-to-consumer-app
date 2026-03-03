from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from decimal import Decimal
from django.db.models import Q

from products.models import Product
from .models import Order, CartItem
from .serializers import (
    OrderSerializer,
    CartItemSerializer,
    DeliveryMetricsSerializer,
    DeliveryMetricsResultSerializer
)


# =========================
# ORDER VIEWSET
# =========================

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        consumer_orders = Q(consumer=user)
        farmer_orders = Q(product__farmer=user)

        return Order.objects.filter(
            consumer_orders | farmer_orders
        ).order_by("-created_at")

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data.get("quantity", 1)

        subtotal = Decimal(product.price) * Decimal(quantity)
        shipping_cost = Decimal("50.00")
        tax = subtotal * Decimal("0.05")
        total_price = subtotal + shipping_cost + tax

        serializer.save(
            consumer=self.request.user,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            tax=tax,
            total_price=total_price
        )

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()

        if order.consumer != request.user:
            raise PermissionDenied("You cannot delete this order.")

        if order.status not in ["cancelled", "delivered"]:
            raise PermissionDenied(
                "Only cancelled or delivered orders can be removed."
            )

        return super().destroy(request, *args, **kwargs)

    # DELIVERY METRICS (ONLY HERE — NOT BELOW)
    @action(detail=False, methods=["post"], url_path="delivery/calculate")
    def calculate_delivery_metrics(self, request):
        serializer = DeliveryMetricsSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        from .delivery_service import DeliveryOptimizer

        optimizer = DeliveryOptimizer()

        metrics = optimizer.calculate_delivery_metrics(
            farmer_location=serializer.validated_data["farmer_location"],
            customer_location=serializer.validated_data["customer_location"],
            freshness_score=serializer.validated_data.get("freshness_score", 0.8),
            temperature_controlled=serializer.validated_data.get(
                "temperature_controlled", True
            ),
            product_type=serializer.validated_data.get(
                "product_type", "vegetables"
            ),
        )

        if "error" in metrics:
            return Response(
                {"detail": metrics["error"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result_serializer = DeliveryMetricsResultSerializer(metrics)
        return Response(result_serializer.data)


# =========================
# CART FUNCTIONS
# =========================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get("product_id")
    quantity = int(request.data.get("quantity", 1))

    product = Product.objects.get(id=product_id)

    cart_item, created = CartItem.objects.get_or_create(
        user=request.user,
        product=product,
    )

    if not created:
        cart_item.quantity += quantity
    else:
        cart_item.quantity = quantity

    cart_item.save()

    return Response({"message": "Added to cart"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_cart(request):
    cart_items = CartItem.objects.filter(user=request.user)
    serializer = CartItemSerializer(cart_items, many=True)
    return Response(serializer.data)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cart_count(request):
    count = CartItem.objects.filter(user=request.user).count()
    return Response({"count": count})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    try:
        cart_item = CartItem.objects.get(id=item_id, user=request.user)
        cart_item.delete()
        return Response({"message": "Item removed from cart"})
    except CartItem.DoesNotExist:
        return Response({"error": "Item not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkout(request):
    payment_method = request.data.get("payment_method")

    cart_items = CartItem.objects.filter(user=request.user)

    if not cart_items.exists():
        return Response({"error": "Cart is empty"}, status=400)

    with transaction.atomic():
        for item in cart_items:
            product = item.product

            # 🔥 Check stock availability
            if product.quantity < item.quantity:
                return Response(
                    {"error": f"Not enough stock for {product.name}"},
                    status=400
                )

            # 🔥 Reduce stock
            product.quantity -= item.quantity
            product.save()

            Order.objects.create(
                consumer=request.user,
                product=product,
                quantity=item.quantity,
                payment_method=payment_method
            )

        cart_items.delete()

    return Response({"message": "Order placed successfully"})