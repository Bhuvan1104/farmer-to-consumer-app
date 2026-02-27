from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Product
from .serializers import ProductSerializer
from users.permissions import FarmerCanCreateOrUpdate, IsFarmer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, FarmerCanCreateOrUpdate]

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsFarmer()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Product.objects.all()
        farmer = self.request.query_params.get('farmer', None)
        if farmer is not None:
            queryset = queryset.filter(farmer__username=farmer)
        return queryset


# ✅ MOVE THIS OUTSIDE THE CLASS
@api_view(["POST"])
def generate_product_description(request):

    name = request.data.get("name")
    category = request.data.get("category")

    if not name:
        return Response(
            {"error": "Product name is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    description = f"""
    Fresh {name} sourced directly from trusted farms.
    Category: {category}.
    Carefully harvested to ensure premium quality,
    optimal freshness, and rich natural taste.
    Perfect for healthy and organic living.
    """

    return Response(
        {
            "generated_description": description.strip()
        },
        status=status.HTTP_200_OK
    )