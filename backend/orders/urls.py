from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, calculate_delivery_metrics

router = DefaultRouter()
router.register(r'', OrderViewSet)

urlpatterns = [
    path('delivery/calculate/', calculate_delivery_metrics, name='calculate-delivery'),
    path('', include(router.urls)),
]