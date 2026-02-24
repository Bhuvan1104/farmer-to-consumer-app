from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Product
from .serializers import ProductSerializer
from users.permissions import FarmerCanCreateOrUpdate, IsOwnerOrAdmin


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, FarmerCanCreateOrUpdate]
    
    def perform_create(self, serializer):
        """
        Set the farmer field to the current user when creating a product.
        """
        serializer.save(farmer=self.request.user)
    
    def get_queryset(self):
        """
        Optionally filter products by farmer.
        """
        queryset = Product.objects.all()
        farmer = self.request.query_params.get('farmer', None)
        if farmer is not None:
            queryset = queryset.filter(farmer__username=farmer)
        return queryset