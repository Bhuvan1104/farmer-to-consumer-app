from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsFarmer, IsOwnerOrAdmin

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsFarmer()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsFarmer(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Product.objects.all()
        farmer = self.request.query_params.get("farmer", None)
        if farmer is not None:
            queryset = queryset.filter(farmer__username=farmer)
        return queryset


@api_view(["POST"])
def generate_product_description(request):
    name = request.data.get("name")
    category = request.data.get("category")

    if not name:
        return Response({"error": "Product name is required"}, status=status.HTTP_400_BAD_REQUEST)

    description = f"""
    Fresh {name} sourced directly from trusted farms.
    Category: {category}.
    Carefully harvested to ensure premium quality,
    optimal freshness, and rich natural taste.
    Perfect for healthy and organic living.
    """

    return Response({"generated_description": description.strip()}, status=status.HTTP_200_OK)
