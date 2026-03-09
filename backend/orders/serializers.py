from rest_framework import serializers
from .models import Order, CartItem


class OrderSerializer(serializers.ModelSerializer):

    consumer_username = serializers.CharField(
        source='consumer.username',
        read_only=True
    )

    product_name = serializers.CharField(
        source='product.name',
        read_only=True
    )

    product_price = serializers.DecimalField(
        source="product.price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    product_image = serializers.SerializerMethodField()

    farmer_username = serializers.CharField(
        source='product.farmer.username',
        read_only=True
    )

    def get_product_image(self, obj):
        request = self.context.get("request")

        if obj.product and obj.product.image:
            url = obj.product.image.url
            if request:
                return request.build_absolute_uri(url)
            return url

        return None

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = [
            "consumer",
            "subtotal",
            "shipping_cost",
            "tax",
            "total_price",
            "created_at",
            "updated_at"
        ]


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.name',
        read_only=True
    )
    product_price = serializers.DecimalField(
        source='product.price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_price",
            "quantity"
        ]


# Delivery Metrics Serializers remain unchanged
# =============================
# DELIVERY METRICS SERIALIZERS
# =============================

class DeliveryMetricsSerializer(serializers.Serializer):
    farmer_location = serializers.CharField(required=True)
    customer_location = serializers.CharField(required=True)
    freshness_score = serializers.FloatField(
        required=False,
        default=0.8,
        min_value=0,
        max_value=1
    )
    temperature_controlled = serializers.BooleanField(
        required=False,
        default=True
    )
    product_type = serializers.ChoiceField(
        required=False,
        default='vegetables',
        choices=['vegetables', 'fruits', 'dairy', 'meats', 'herbs', 'berries']
    )


class CoordinatesSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class DeliveryMetricsResultSerializer(serializers.Serializer):
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