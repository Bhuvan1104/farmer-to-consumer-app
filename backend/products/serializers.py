from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    farmer_username = serializers.CharField(source='farmer.username', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'farmer', 'farmer_username', 'name', 'category', 'price', 'quantity', 'image', 'freshness_score']
        read_only_fields = ['id', 'farmer', 'farmer_username']