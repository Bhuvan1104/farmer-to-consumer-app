from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ProductViewSet, generate_product_description

router = DefaultRouter()
router.register('', ProductViewSet, basename='product')

urlpatterns = router.urls + [
    path(
        "generate-description/",
        generate_product_description,
        name="generate-product-description"
    ),
]