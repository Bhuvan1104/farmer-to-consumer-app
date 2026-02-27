from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from django.db.models import Q

from .models import Order
from .serializers import (
    OrderSerializer,
    DeliveryMetricsSerializer,
    DeliveryMetricsResultSerializer
)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        consumer_orders = Q(consumer=user)
        farmer_orders = Q(product__farmer=user)

        queryset = Order.objects.filter(consumer_orders | farmer_orders)

        return queryset.order_by("-created_at")

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
    from rest_framework.exceptions import PermissionDenied

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()

        # Only consumer can delete
        if order.consumer != request.user:
            raise PermissionDenied("You cannot delete this order.")

        # Allow delete only if cancelled or delivered
        if order.status not in ["cancelled", "delivered"]:
            raise PermissionDenied("Only rejected or delivered orders can be removed.")

        return super().destroy(request, *args, **kwargs)

    # ✅ DELIVERY METRICS
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
            temperature_controlled=serializer.validated_data.get("temperature_controlled", True),
            product_type=serializer.validated_data.get("product_type", "vegetables")
        )
        if "error" in metrics:
            return Response(
            {"detail": metrics["error"]},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result_serializer = DeliveryMetricsResultSerializer(metrics)

        return Response(result_serializer.data, status=status.HTTP_200_OK)