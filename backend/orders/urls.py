from .views import (
    OrderViewSet,
    add_to_cart,
    view_cart,
    checkout,
    remove_from_cart,
    cart_count,
    create_payment_order,
    verify_payment_signature,
)
from rest_framework.routers import DefaultRouter
from django.urls import path, include

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='orders')

urlpatterns = [
    path("cart/add/", add_to_cart),
    path("cart/", view_cart),
    path("cart/remove/<int:item_id>/", remove_from_cart),
    path("cart/count/", cart_count),
    path("checkout/", checkout),
    path("payments/create-order/", create_payment_order),
    path("payments/verify/", verify_payment_signature),

    path("", include(router.urls)),
]
