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
from .services.crop_detection_service import detect_crop
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

        freshness_result = predict_freshness(img)
        if isinstance(freshness_result, tuple):
            freshness_score, model_label = freshness_result
        else:
            freshness_score = freshness_result
            model_label = None

        detected_crop = "unknown"
        crop_confidence = None
        crop_error = None
        try:
            crop_result = detect_crop(img)
            if isinstance(crop_result, tuple):
                detected_crop, crop_confidence = crop_result
            else:
                detected_crop = str(crop_result)
        except Exception as crop_exc:
            detected_crop = "unknown"
            crop_confidence = None
            crop_error = str(crop_exc)

        shelf = predict_shelf_life(freshness_score, detected_crop)

        payload = {
            "freshness_score": round(float(freshness_score), 3),
            "estimated_remaining_days": shelf["remaining_days"],
            "freshness_category": shelf["category"],
            "detected_crop": detected_crop,
        }
        if crop_confidence is not None:
            payload["crop_confidence"] = round(float(crop_confidence), 3)
        if crop_error is not None:
            payload["crop_detection_error"] = crop_error
        if model_label is not None:
            payload["model_label"] = model_label

        return Response(payload, status=status.HTTP_200_OK)
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
        shelf_life_days = data.get("estimated_remaining_days")
        result = dynamic_price(data["base_price"], data["freshness_score"], shelf_life_days)

        response = {
            "base_price": round(data["base_price"], 2),
            "freshness_score": round(data["freshness_score"], 2),
            "estimated_remaining_days": shelf_life_days,
            "suggested_price": result["suggested_price"],
            "discount_percentage": result["discount_percentage"],
            "factor_stats": result.get("factor_stats", []),
            "reasoning": result.get("reasoning", []),
            "statistics": result.get("statistics", {}),
        }
        return Response(response, status=status.HTTP_200_OK)
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
        shelf_life_days = data.get("estimated_remaining_days")

        result = advanced_price(
            data["base_price"],
            data["freshness_score"],
            data["demand_index"],
            data.get("season", "normal"),
            shelf_life_days,
        )

        response = {
            "base_price": result["base_price"],
            "freshness_score": round(float(data["freshness_score"]), 3),
            "estimated_remaining_days": shelf_life_days,
            "demand_index": data["demand_index"],
            "suggested_price": result["suggested_price"],
            "percentage_change": result["statistics"]["percentage_change"],
            "factor_stats": result.get("factor_stats", []),
            "reasoning": result.get("reasoning", []),
            "statistics": result.get("statistics", {}),
            "explanation": "Price adjusted using freshness score, remaining shelf life, market demand, and seasonal factors.",
        }

        if data.get("include_range"):
            variance = float(data.get("variance", 0.05))
            spread = result["suggested_price"] * variance
            response["price_range"] = {
                "minimum_price": round(result["suggested_price"] - spread, 2),
                "maximum_price": round(result["suggested_price"] + spread, 2),
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
            data.get("estimated_remaining_days"),
        )

        return Response(result, status=status.HTTP_200_OK)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response(
            {"error": "ML price prediction failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
