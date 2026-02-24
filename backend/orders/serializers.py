from rest_framework import serializers
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    consumer_username = serializers.CharField(source='consumer.username', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'consumer', 'consumer_username', 'product', 'product_name', 'quantity', 'total_price', 'status']
        read_only_fields = ['id', 'consumer', 'consumer_username', 'product_name']


class DeliveryMetricsSerializer(serializers.Serializer):
    """Serializer for delivery metrics calculation request."""
    farmer_location = serializers.CharField(
        required=True,
        help_text="Farmer's location (address or 'latitude,longitude')"
    )
    customer_location = serializers.CharField(
        required=True,
        help_text="Customer's location (address or 'latitude,longitude')"
    )
    freshness_score = serializers.FloatField(
        required=False,
        default=0.8,
        min_value=0,
        max_value=1,
        help_text="Product freshness score"
    )
    temperature_controlled = serializers.BooleanField(
        required=False,
        default=True,
        help_text="Whether delivery has temperature control"
    )
    product_type = serializers.ChoiceField(
        required=False,
        default='vegetables',
        choices=['vegetables', 'fruits', 'dairy', 'meats', 'herbs', 'berries'],
        help_text="Type of product being delivered"
    )


class CoordinatesSerializer(serializers.Serializer):
    """Serializer for coordinates."""
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class DeliveryMetricsResultSerializer(serializers.Serializer):
    """Serializer for delivery metrics results."""
    distance_km = serializers.FloatField()
    distance_miles = serializers.FloatField()
    estimated_delivery_hours = serializers.FloatField()
    estimated_delivery_time = serializers.CharField()
    spoilage_risk_percentage = serializers.FloatField()
    spoilage_category = serializers.CharField()
    temperature_controlled = serializers.BooleanField()
    freshness_score = serializers.FloatField()
    product_type = serializers.CharField()
    recommendation = serializers.CharField()
    is_viable = serializers.BooleanField()
    coordinates = serializers.DictField()