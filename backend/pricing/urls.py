from django.urls import path
from .views import (
    predict_shelf_life,
    predict_freshness_from_image,
    dynamic_price,
    advanced_dynamic_price,
    predict_crop_price_ml
)

urlpatterns = [
    path('predict-shelf-life/', predict_shelf_life, name='predict-shelf-life'),
    path('predict-freshness/', predict_freshness_from_image, name='predict-freshness'),
    path('dynamic-price/', dynamic_price, name='dynamic-price'),
    path('advanced-dynamic-price/', advanced_dynamic_price, name='advanced-dynamic-price'),
    path('predict-price-ml/', predict_crop_price_ml, name='predict-price-ml'),
]