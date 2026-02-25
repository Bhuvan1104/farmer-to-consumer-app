from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import OrderViewSet, calculate_delivery_metrics

router = DefaultRouter()
router.register('', OrderViewSet, basename='order')

urlpatterns = router.urls + [
	path('delivery/calculate/', calculate_delivery_metrics, name='calculate-delivery-metrics'),
]