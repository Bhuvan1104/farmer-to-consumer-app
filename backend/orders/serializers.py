from rest_framework import serializers

from .models import CartItem, Order


class OrderSerializer(serializers.ModelSerializer):
    consumer_username = serializers.CharField(source="consumer.username", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_price = serializers.DecimalField(source="product.price", max_digits=10, decimal_places=2, read_only=True)
    product_category = serializers.CharField(source="product.category", read_only=True)
    product_freshness_score = serializers.FloatField(source="product.freshness_score", read_only=True, allow_null=True)
    farmer_username = serializers.CharField(source="product.farmer.username", read_only=True)
    farmer_dispatch_location = serializers.CharField(source="product.farmer.dispatch_location", read_only=True)
    farmer_dispatch_latitude = serializers.FloatField(source="product.farmer.dispatch_latitude", read_only=True, allow_null=True)
    farmer_dispatch_longitude = serializers.FloatField(source="product.farmer.dispatch_longitude", read_only=True, allow_null=True)
    product_image = serializers.SerializerMethodField()

    def get_product_image(self, obj):
        request = self.context.get("request")
        if obj.product and obj.product.image:
            url = obj.product.image.url
            return request.build_absolute_uri(url) if request else url
        return None

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = ["consumer", "subtotal", "shipping_cost", "tax", "total_price", "created_at", "updated_at"]


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_price = serializers.DecimalField(source="product.price", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_name", "product_price", "quantity"]


class DeliveryMetricsSerializer(serializers.Serializer):
    farmer_location = serializers.CharField(required=True)
    farmer_latitude = serializers.FloatField(required=False, allow_null=True)
    farmer_longitude = serializers.FloatField(required=False, allow_null=True)
    customer_location = serializers.CharField(required=True)
    customer_latitude = serializers.FloatField(required=False, allow_null=True)
    customer_longitude = serializers.FloatField(required=False, allow_null=True)
    freshness_score = serializers.FloatField(required=False, default=0.8, min_value=0, max_value=1)
    temperature_controlled = serializers.BooleanField(required=False, default=True)
    product_type = serializers.ChoiceField(required=False, default="vegetables", choices=["vegetables", "fruits", "dairy", "meats", "herbs", "berries"])


class BatchDeliveryStopSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(required=False)
    customer_name = serializers.CharField(required=False, allow_blank=True, default="")
    customer_location = serializers.CharField(required=True)
    customer_latitude = serializers.FloatField(required=False, allow_null=True)
    customer_longitude = serializers.FloatField(required=False, allow_null=True)
    product_name = serializers.CharField(required=False, allow_blank=True, default="Produce")
    freshness_score = serializers.FloatField(required=False, default=0.8, min_value=0, max_value=1)
    quantity = serializers.IntegerField(required=False, default=1, min_value=1)
    product_type = serializers.ChoiceField(required=False, default="vegetables", choices=["vegetables", "fruits", "dairy", "meats", "herbs", "berries"])


class BatchDeliveryMetricsSerializer(serializers.Serializer):
    farmer_location = serializers.CharField(required=True)
    farmer_latitude = serializers.FloatField(required=False, allow_null=True)
    farmer_longitude = serializers.FloatField(required=False, allow_null=True)
    temperature_controlled = serializers.BooleanField(required=False, default=True)
    deliveries = BatchDeliveryStopSerializer(many=True)


class DeliveryAddressDetailsSerializer(serializers.Serializer):
    farmer_input = serializers.CharField(required=False, allow_blank=True)
    customer_input = serializers.CharField(required=False, allow_blank=True)
    farmer_normalized = serializers.CharField(required=False, allow_blank=True)
    customer_normalized = serializers.CharField(required=False, allow_blank=True)
    farmer_resolved = serializers.CharField(required=False, allow_blank=True)
    customer_resolved = serializers.CharField(required=False, allow_blank=True)


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
    addresses = DeliveryAddressDetailsSerializer(required=False)
    coordinates = serializers.DictField()


class BatchDeliveryResultSerializer(serializers.Serializer):
    origin = serializers.DictField()
    total_orders = serializers.IntegerField()
    total_distance_km = serializers.FloatField()
    estimated_total_hours = serializers.FloatField()
    average_spoilage_risk_percentage = serializers.FloatField()
    route_efficiency_score = serializers.FloatField()
    temperature_controlled = serializers.BooleanField()
    is_viable = serializers.BooleanField()
    recommendation = serializers.CharField()
    stops = serializers.ListField()
