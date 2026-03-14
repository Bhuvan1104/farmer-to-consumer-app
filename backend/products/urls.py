from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, generate_product_description

router = DefaultRouter()
router.register('', ProductViewSet, basename='product')

# Keep custom endpoints before router URLs so names like "generate-description"
# are not consumed by the viewset detail route as a product ID.
urlpatterns = [
    path(
        "generate-description/",
        generate_product_description,
        name="generate-product-description"
    ),
] + router.urls
