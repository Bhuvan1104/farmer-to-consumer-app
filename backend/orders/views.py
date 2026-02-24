from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
import logging
from .models import Order
from .serializers import OrderSerializer, DeliveryMetricsSerializer, DeliveryMetricsResultSerializer
from users.permissions import ConsumerCanCreateOrder, IsOwnerOrAdmin

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, ConsumerCanCreateOrder]
    
    def perform_create(self, serializer):
        """
        Set the consumer field to the current user when creating an order.
        """
        serializer.save(consumer=self.request.user)
    
    def get_queryset(self):
        """
        Filter orders by user role:
        - Consumers see only their own orders
        - Farmers see orders for their products
        - Admins see all orders
        """
        user = self.request.user
        
        if user.is_superuser:
            return Order.objects.all()
        elif user.role == 'consumer':
            return Order.objects.filter(consumer=user)
        elif user.role == 'farmer':
            return Order.objects.filter(product__farmer=user)
        else:
            return Order.objects.none()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_delivery_metrics(request):
    """
    Calculate delivery metrics for order fulfillment.
    
    Computes:
    - Distance between farmer and customer
    - Estimated delivery time
    - Spoilage risk based on freshness and distance
    
    Expected payload:
    {
        "farmer_location": "Farm Address or 40.7128,-74.0060",
        "customer_location": "Customer Address or 34.0522,-118.2437",
        "freshness_score": 0.85,
        "temperature_controlled": true,
        "product_type": "vegetables"
    }
    
    Returns:
        {
            "distance_km": 150.5,
            "estimated_delivery_hours": 6.5,
            "spoilage_risk_percentage": 15.2,
            "is_viable": true,
            "recommendation": "..."
        }
    """
    try:
        from .delivery_service import DeliveryOptimizer
        
        # Validate request
        serializer = DeliveryMetricsSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Invalid request",
                    "details": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get validated data
        data = serializer.validated_data
        
        # Calculate metrics
        optimizer = DeliveryOptimizer()
        metrics = optimizer.calculate_delivery_metrics(
            farmer_location=data['farmer_location'],
            customer_location=data['customer_location'],
            freshness_score=data.get('freshness_score', 0.8),
            temperature_controlled=data.get('temperature_controlled', True),
            product_type=data.get('product_type', 'vegetables')
        )
        
        # Validate result with serializer
        result_serializer = DeliveryMetricsResultSerializer(metrics)
        
        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK
        )
    
    except ValueError as e:
        logger.error(f"Validation error in calculate_delivery_metrics: {str(e)}")
        return Response(
            {
                "error": "Invalid location or parameters",
                "detail": str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    except Exception as e:
        logger.error(f"Error in calculate_delivery_metrics: {str(e)}")
        return Response(
            {
                "error": "Error calculating delivery metrics",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )