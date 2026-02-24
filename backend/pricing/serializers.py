from rest_framework import serializers


class FreshnessUploadSerializer(serializers.Serializer):
    """
    Serializer for image upload and freshness prediction.
    """
    image = serializers.ImageField(
        required=True,
        help_text="Upload an image of a product for freshness analysis"
    )
    
    def validate_image(self, value):
        """
        Validate the uploaded image.
        """
        # Check file size (max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "Image size must not exceed 5MB"
            )
        
        # Check file type
        allowed_formats = ['jpeg', 'jpg', 'png', 'webp']
        if not any(value.name.lower().endswith(f'.{fmt}') for fmt in allowed_formats):
            raise serializers.ValidationError(
                f"Image format must be one of: {', '.join(allowed_formats)}"
            )
        
        return value


class FreshnessResultSerializer(serializers.Serializer):
    """
    Serializer for freshness prediction results.
    """
    freshness_score = serializers.FloatField(
        help_text="Freshness score between 0 and 1"
    )
    estimated_remaining_days = serializers.IntegerField(
        help_text="Estimated days the product remains fresh"
    )
    freshness_category = serializers.CharField(
        help_text="Category of freshness (Excellent, Good, Fair, Poor, Not Fresh)"
    )


class DynamicPriceSerializer(serializers.Serializer):
    """
    Serializer for dynamic price calculation.
    """
    base_price = serializers.FloatField(
        required=True,
        min_value=0,
        help_text="Original price of the product"
    )
    freshness_score = serializers.FloatField(
        required=True,
        min_value=0,
        max_value=1,
        help_text="Freshness score between 0 and 1"
    )


class DynamicPriceResultSerializer(serializers.Serializer):
    """
    Serializer for dynamic price calculation results.
    """
    base_price = serializers.FloatField()
    freshness_score = serializers.FloatField()
    suggested_price = serializers.FloatField()
    discount_percentage = serializers.FloatField()


class AdvancedDynamicPriceSerializer(serializers.Serializer):
    """
    Serializer for advanced dynamic price calculation with multiple factors.
    """
    base_price = serializers.FloatField(
        required=True,
        min_value=0.01,
        help_text="Original product price"
    )
    freshness_score = serializers.FloatField(
        required=True,
        min_value=0,
        max_value=1,
        help_text="Freshness score between 0 and 1"
    )
    demand_index = serializers.IntegerField(
        required=True,
        min_value=1,
        max_value=10,
        help_text="Demand index between 1 (very low) and 10 (very high)"
    )
    season = serializers.ChoiceField(
        required=False,
        choices=['low', 'moderate', 'normal', 'high', 'very_high'],
        help_text="Season: low, moderate, normal, high, or very_high. If omitted, auto-detects.",
        allow_null=True
    )
    variance = serializers.FloatField(
        required=False,
        default=0.05,
        min_value=0,
        max_value=0.5,
        help_text="Price range variance percentage (default 0.05 = 5%)"
    )
    include_range = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Include min/max price range in response"
    )


class AdvancedPriceFactorSerializer(serializers.Serializer):
    """
    Serializer for individual pricing factors.
    """
    score = serializers.FloatField(required=False)
    category = serializers.CharField(required=False)
    multiplier = serializers.FloatField()
    discount = serializers.IntegerField(required=False)
    index = serializers.IntegerField(required=False)
    level = serializers.CharField(required=False)
    percentage_change = serializers.FloatField()
    impact = serializers.CharField()
    description = serializers.CharField(required=False)
    season = serializers.CharField(required=False)


class AdvancedDynamicPriceResultSerializer(serializers.Serializer):
    """
    Serializer for advanced dynamic price calculation results.
    """
    base_price = serializers.FloatField()
    suggested_price = serializers.FloatField()
    price_difference = serializers.FloatField()
    percentage_change = serializers.FloatField()
    final_discount_percentage = serializers.FloatField()
    
    # Factor details
    freshness_factor = AdvancedPriceFactorSerializer()
    demand_factor = AdvancedPriceFactorSerializer()
    seasonal_factor = AdvancedPriceFactorSerializer()
    
    # Explanation
    explanation = serializers.CharField()
    calculation_formula = serializers.CharField()


class MLPricePredictionSerializer(serializers.Serializer):
    """
    Serializer for ML-based price prediction request.
    """
    base_price = serializers.FloatField(
        required=True,
        min_value=0.01,
        help_text="Current base price of the product"
    )
    freshness_score = serializers.FloatField(
        required=True,
        min_value=0,
        max_value=1,
        help_text="Freshness score between 0 and 1"
    )
    demand_index = serializers.IntegerField(
        required=True,
        min_value=1,
        max_value=10,
        help_text="Demand index between 1 (very low) and 10 (very high)"
    )
    seasonal_factor = serializers.FloatField(
        required=True,
        min_value=0.7,
        max_value=1.3,
        help_text="Seasonal multiplier between 0.7 and 1.3"
    )


class PriceFactorSerializer(serializers.Serializer):
    """Serializer for pricing factors."""
    factor = serializers.CharField()
    importance = serializers.FloatField()


class MLPricePredictionResultSerializer(serializers.Serializer):
    """
    Serializer for ML price prediction results.
    """
    predicted_price = serializers.FloatField()
    base_price = serializers.FloatField()
    price_change = serializers.FloatField()
    percentage_change = serializers.FloatField()
    confidence = serializers.CharField()
    top_factors = PriceFactorSerializer(many=True)
    recommendation = serializers.CharField()
