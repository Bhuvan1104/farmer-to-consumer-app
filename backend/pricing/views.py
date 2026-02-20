from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
import random

@api_view(['POST'])
def predict_shelf_life(request):
    freshness = round(random.uniform(0.5, 1.0), 2)
    days_remaining = int(freshness * 10)

    return Response({
        "freshness_score": freshness,
        "estimated_days_remaining": days_remaining
    })


@api_view(['POST'])
def dynamic_price(request):
    base_price = float(request.data.get("price"))
    freshness = float(request.data.get("freshness"))

    suggested_price = base_price * freshness

    return Response({
        "suggested_price": round(suggested_price, 2)
    })