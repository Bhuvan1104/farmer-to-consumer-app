from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    farmer_username = serializers.CharField(source='farmer.username', read_only=True)

    class Meta:
        model = Product
        fields = "__all__"