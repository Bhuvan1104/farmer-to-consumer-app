from django.urls import path
from .views import (
    predict_freshness_view,
    dynamic_price_view,
    advanced_price_view,
    ml_price_view
)

urlpatterns = [

    path(
        'predict-freshness/',
        predict_freshness_view,
        name="predict-freshness"
    ),

    path(
        'dynamic-price/',
        dynamic_price_view,
        name="dynamic-price"
    ),

    path(
        'advanced-dynamic-price/',
        advanced_price_view,
        name="advanced-price"
    ),

    path(
        'predict-price-ml/',
        ml_price_view,
        name="ml-price"
    ),
]