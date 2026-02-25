import os
import tempfile
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
#from .model_service import FreshnessPredictor
from .pricing_service import DynamicPricingCalculator
from .serializers import (
    FreshnessUploadSerializer,
    FreshnessResultSerializer,
    DynamicPriceSerializer,
    DynamicPriceResultSerializer,
    AdvancedDynamicPriceSerializer,
    AdvancedDynamicPriceResultSerializer
)

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict_freshness_from_image(request):
    """
    API endpoint to predict freshness score and remaining days from an image.
    
    Expected payload: Form-data with 'image' field
    
    Returns:
        {
            "freshness_score": 0.85,
            "estimated_remaining_days": 12,
            "freshness_category": "Excellent"
        }
    """
    try:
        # Validate request
        serializer = FreshnessUploadSerializer(data=request.FILES)
        
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Invalid request",
                    "details": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get uploaded image
        image_file = serializer.validated_data['image']
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(
            suffix=f'{os.path.splitext(image_file.name)[1]}',
            delete=False
        ) as tmp_file:
            # Write uploaded file to temporary location
            for chunk in image_file.chunks():
                tmp_file.write(chunk)
            tmp_path = tmp_file.name
        
        try:
            # Load model and make prediction
            prediction = FreshnessPredictor.predict(tmp_path)
            
            # Validate result with serializer
            result_serializer = FreshnessResultSerializer(prediction)
            
            return Response(
                result_serializer.data,
                status=status.HTTP_200_OK
            )
        
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    except Exception as e:
        logger.error(f"Error in predict_freshness_from_image: {str(e)}")
        return Response(
            {
                "error": "Error processing image",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dynamic_price(request):
    """
    API endpoint to calculate dynamic price based on freshness score.
    
    Expected payload:
    {
        "base_price": 100.0,
        "freshness_score": 0.85
    }
    
    Returns:
        {
            "base_price": 100.0,
            "freshness_score": 0.85,
            "suggested_price": 85.0,
            "discount_percentage": 15.0
        }
    """
    try:
        # Validate request
        serializer = DynamicPriceSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Invalid request",
                    "details": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        base_price = serializer.validated_data['base_price']
        freshness_score = serializer.validated_data['freshness_score']
        
        # Calculate suggested price
        suggested_price = base_price * freshness_score
        discount_percentage = ((base_price - suggested_price) / base_price) * 100
        
        # Prepare result
        result = {
            'base_price': round(base_price, 2),
            'freshness_score': round(freshness_score, 2),
            'suggested_price': round(suggested_price, 2),
            'discount_percentage': round(discount_percentage, 2)
        }
        
        # Validate result with serializer
        result_serializer = DynamicPriceResultSerializer(result)
        
        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error in dynamic_price: {str(e)}")
        return Response(
            {
                "error": "Error calculating price",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Keep old endpoint for backward compatibility
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict_shelf_life(request):
    """
    Legacy endpoint for shelf life prediction.
    Now redirects to predict_freshness_from_image.
    """
    import random
    
    freshness = round(random.uniform(0.5, 1.0), 2)
    days_remaining = int(freshness * 10)

    return Response({
        "freshness_score": freshness,
        "estimated_days_remaining": days_remaining
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def advanced_dynamic_price(request):
    """
    Advanced dynamic pricing endpoint with multiple factors.
    
    Calculates suggested price using:
    - Base price (original product cost)
    - Freshness score (0-1, from image analysis)
    - Demand index (1-10, market demand)
    - Seasonal multiplier (off-season to peak season)
    
    Expected payload:
    {
        "base_price": 100.0,
        "freshness_score": 0.85,
        "demand_index": 7,
        "season": "high",  # optional: low, moderate, normal, high, very_high
        "include_range": false,  # optional: include min/max price range
        "variance": 0.05  # optional: price range variance (default 5%)
    }
    
    Returns:
    {
        "base_price": 100.0,
        "suggested_price": 110.25,
        "price_difference": 10.25,
        "percentage_change": 10.25,
        "final_discount_percentage": 0.0,
        "freshness_factor": {
            "score": 0.85,
            "category": "Excellent",
            "multiplier": 1.0,
            "discount": 0,
            "impact": "Freshness: Excellent (0% discount)"
        },
        "demand_factor": {
            "index": 7,
            "level": "High",
            "multiplier": 1.333,
            "percentage_change": 33.3,
            "impact": "Moderate price increase"
        },
        "seasonal_factor": {
            "season": "high",
            "multiplier": 1.2,
            "percentage_change": 20.0,
            "description": "Peak season with higher demand",
            "impact": "Season: High"
        },
        "explanation": "Price increased by $10.25 (+10.25%)...",
        "calculation_formula": "..."
    }
    """
    try:
        # Validate request
        serializer = AdvancedDynamicPriceSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Invalid request",
                    "details": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract validated data
        base_price = serializer.validated_data['base_price']
        freshness_score = serializer.validated_data['freshness_score']
        demand_index = serializer.validated_data['demand_index']
        season = serializer.validated_data.get('season', None)
        include_range = serializer.validated_data.get('include_range', False)
        variance = serializer.validated_data.get('variance', 0.05)
        
        # Calculate dynamic price using the service
        calculator = DynamicPricingCalculator()
        
        result = calculator.calculate_dynamic_price(
            base_price=base_price,
            freshness_score=freshness_score,
            demand_index=demand_index,
            season=season
        )
        
        # Add price range if requested
        if include_range:
            price_range = calculator.calculate_price_range(
                base_price=base_price,
                freshness_score=freshness_score,
                demand_index=demand_index,
                season=season,
                variance=variance
            )
            result['price_range'] = {
                'minimum_price': price_range['minimum_price'],
                'suggested_price': price_range['suggested_price'],
                'maximum_price': price_range['maximum_price'],
                'variance_percentage': price_range['variance_percentage'],
                'insights': price_range['price_range_insights']
            }
        
        # Validate result with serializer
        result_serializer = AdvancedDynamicPriceResultSerializer(result)
        
        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK
        )
    
    except ValueError as e:
        logger.error(f"Validation error in advanced_dynamic_price: {str(e)}")
        return Response(
            {
                "error": "Invalid parameters",
                "detail": str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    except Exception as e:
        logger.error(f"Error in advanced_dynamic_price: {str(e)}")
        return Response(
            {
                "error": "Error calculating dynamic price",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict_crop_price_ml(request):
    """
    ML-based price prediction endpoint.
    
    Uses trained RandomForestRegressor to predict next week's crop price.
    
    Expected payload:
    {
        "base_price": 100.0,
        "freshness_score": 0.85,
        "demand_index": 7,
        "seasonal_factor": 1.2
    }
    
    Returns:
        {
            "predicted_price": 125.50,
            "base_price": 100.0,
            "price_change": 25.50,
            "percentage_change": 25.5,
            "confidence": "High",
            "top_factors": [...],
            "recommendation": "..."
        }
    """
    try:
        from .ml_price_predictor import PricePredictor
        from .serializers import MLPricePredictionSerializer, MLPricePredictionResultSerializer
        
        # Validate request
        serializer = MLPricePredictionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    "error": "Invalid request",
                    "details": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get validated data
        base_price = serializer.validated_data['base_price']
        freshness_score = serializer.validated_data['freshness_score']
        demand_index = serializer.validated_data['demand_index']
        seasonal_factor = serializer.validated_data['seasonal_factor']
        
        # Get prediction
        predictor = PricePredictor()
        prediction = predictor.predict_next_week_price(
            base_price,
            freshness_score,
            demand_index,
            seasonal_factor
        )
        
        # Validate result with serializer
        result_serializer = MLPricePredictionResultSerializer(prediction)
        
        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK
        )
    
    except ValueError as e:
        logger.error(f"Validation error in predict_crop_price_ml: {str(e)}")
        return Response(
            {
                "error": "Invalid parameters",
                "detail": str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    except Exception as e:
        logger.error(f"Error in predict_crop_price_ml: {str(e)}")
        return Response(
            {
                "error": "Error predicting price",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )