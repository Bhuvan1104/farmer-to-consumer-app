from PIL import Image
import numpy as np
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import (
    AdvancedDynamicPriceSerializer,
    DynamicPriceSerializer,
    FreshnessUploadSerializer,
    MLPricePredictionSerializer,
)
from .services.freshness_service import predict_freshness
from .services.ml_price_service import predict_ml_price
from .services.pricing_service import advanced_price, dynamic_price
from .services.shelf_life_service import predict_shelf_life


@api_view(["POST"])
def predict_freshness_view(request):
    serializer = FreshnessUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": "Invalid request", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        image_file = serializer.validated_data["image"]
        image = Image.open(image_file).convert("RGB")
        img = np.array(image)

        freshness_score = predict_freshness(img)
        shelf = predict_shelf_life(freshness_score)

        return Response(
            {
                "freshness_score": round(float(freshness_score), 3),
                "estimated_remaining_days": shelf["remaining_days"],
                "freshness_category": shelf["category"],
            },
            status=status.HTTP_200_OK,
        )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response(
            {"error": "Freshness prediction failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def dynamic_price_view(request):
    serializer = DynamicPriceSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": "Invalid request", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        data = serializer.validated_data
        result = dynamic_price(data["base_price"], data["freshness_score"])

        return Response(
            {
                "base_price": round(data["base_price"], 2),
                "freshness_score": round(data["freshness_score"], 2),
                "suggested_price": result["suggested_price"],
                "discount_percentage": result["discount_percentage"],
            },
            status=status.HTTP_200_OK,
        )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def advanced_price_view(request):
    serializer = AdvancedDynamicPriceSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": "Invalid request", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        data = serializer.validated_data

        suggested_price = advanced_price(
            data["base_price"],
            data["freshness_score"],
            data["demand_index"],
            data.get("season", "normal"),
        )

        base_price = float(data["base_price"])
        percentage_change = ((suggested_price - base_price) / base_price) * 100

        response = {
            "base_price": round(base_price, 2),
            "suggested_price": round(suggested_price, 2),
            "percentage_change": round(percentage_change, 2),
            "explanation": "Price adjusted using freshness, demand, and seasonal factors",
        }

        if data.get("include_range"):
            variance = float(data.get("variance", 0.05))
            spread = suggested_price * variance
            response["price_range"] = {
                "minimum_price": round(suggested_price - spread, 2),
                "maximum_price": round(suggested_price + spread, 2),
                "variance_percentage": round(variance * 100, 2),
            }

        return Response(response, status=status.HTTP_200_OK)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def ml_price_view(request):
    serializer = MLPricePredictionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": "Invalid request", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        data = serializer.validated_data
        result = predict_ml_price(
            data["base_price"],
            data["freshness_score"],
            data["demand_index"],
            data["seasonal_factor"],
        )

        return Response(result, status=status.HTTP_200_OK)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response(
            {"error": "ML price prediction failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
