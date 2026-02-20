from django.urls import path
from .views import predict_shelf_life, dynamic_price

urlpatterns = [
    path('predict-shelf-life/', predict_shelf_life),
    path('dynamic-price/', dynamic_price),
]