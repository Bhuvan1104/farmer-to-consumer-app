"""
Dynamic Pricing Service for the Farmer-to-Consumer App

Calculates suggested prices based on multiple factors:
- Base price (cost of product)
- Freshness score (0-1)
- Demand index (1-10)
- Seasonal multiplier (0.7-1.3)
"""

import logging
from datetime import datetime
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class DynamicPricingCalculator:
    """
    Calculates dynamic prices using freshness, demand, and seasonal factors.
    
    Pricing Formula:
    Suggested Price = Base Price × Freshness Multiplier × Demand Multiplier × Seasonal Multiplier
    """
    
    # Freshness score ranges and corresponding multipliers
    FRESHNESS_TIERS = {
        (0.8, 1.0): {"multiplier": 1.0, "category": "Excellent", "discount": 0},
        (0.6, 0.8): {"multiplier": 0.85, "category": "Good", "discount": 15},
        (0.4, 0.6): {"multiplier": 0.65, "category": "Fair", "discount": 35},
        (0.2, 0.4): {"multiplier": 0.40, "category": "Poor", "discount": 60},
        (0.0, 0.2): {"multiplier": 0.20, "category": "Not Fresh", "discount": 80},
    }
    
    # Demand index conversion (1-10 scale to multiplier 0.5-1.5)
    # Demand index 1 = very low (0.5x), 5 = normal (1.0x), 10 = very high (1.5x)
    DEMAND_MIN = 1
    DEMAND_MAX = 10
    DEMAND_MULTIPLIER_MIN = 0.5
    DEMAND_MULTIPLIER_MAX = 1.5
    
    # Seasonal multipliers (low to high season)
    SEASONAL_MULTIPLIERS = {
        "low": 0.7,          # Off season - price reduction
        "moderate": 0.95,    # Shoulder season - slight reduction
        "normal": 1.0,       # Normal supply - no change
        "high": 1.2,         # Peak season - price increase
        "very_high": 1.3,    # Peak demand - maximum increase
    }
    
    def __init__(self):
        """Initialize the pricing calculator."""
        self.logger = logger
    
    @staticmethod
    def get_freshness_multiplier(freshness_score: float) -> Dict[str, any]:
        """
        Get freshness multiplier and category based on score.
        
        Args:
            freshness_score: Float between 0 and 1
            
        Returns:
            Dict with multiplier, category, and discount percentage
        """
        for (min_score, max_score), tier_info in DynamicPricingCalculator.FRESHNESS_TIERS.items():
            if min_score <= freshness_score <= max_score:
                return {
                    "multiplier": tier_info["multiplier"],
                    "category": tier_info["category"],
                    "discount": tier_info["discount"],
                    "score_range": f"{min_score:.1f}-{max_score:.1f}"
                }
        
        # Fallback (should not reach here with valid input)
        return {
            "multiplier": 0.5,
            "category": "Invalid",
            "discount": 50,
            "score_range": "0.0-1.0"
        }
    
    @staticmethod
    def get_demand_multiplier(demand_index: int) -> Dict[str, any]:
        """
        Convert demand index (1-10) to price multiplier (0.5-1.5).
        
        Args:
            demand_index: Integer between 1 and 10
            
        Returns:
            Dict with multiplier, demand level, and impact description
        """
        # Clamp demand index to valid range
        if demand_index < DynamicPricingCalculator.DEMAND_MIN:
            demand_index = DynamicPricingCalculator.DEMAND_MIN
        elif demand_index > DynamicPricingCalculator.DEMAND_MAX:
            demand_index = DynamicPricingCalculator.DEMAND_MAX
        
        # Linear interpolation from DEMAND_MIN to DEMAND_MAX
        multiplier = (
            DynamicPricingCalculator.DEMAND_MULTIPLIER_MIN +
            (demand_index - DynamicPricingCalculator.DEMAND_MIN) *
            (DynamicPricingCalculator.DEMAND_MULTIPLIER_MAX - DynamicPricingCalculator.DEMAND_MULTIPLIER_MIN) /
            (DynamicPricingCalculator.DEMAND_MAX - DynamicPricingCalculator.DEMAND_MIN)
        )
        
        # Determine demand level
        if demand_index <= 2:
            level = "Very Low"
            impact = "Price reduction due to low demand"
        elif demand_index <= 4:
            level = "Low"
            impact = "Slight price reduction"
        elif demand_index <= 6:
            level = "Normal"
            impact = "No adjustment"
        elif demand_index <= 8:
            level = "High"
            impact = "Moderate price increase"
        else:
            level = "Very High"
            impact = "Significant price increase"
        
        return {
            "multiplier": round(multiplier, 3),
            "demand_index": demand_index,
            "demand_level": level,
            "impact": impact,
            "percentage_change": round((multiplier - 1.0) * 100, 1)
        }
    
    @staticmethod
    def get_seasonal_multiplier(season: str = None) -> Dict[str, any]:
        """
        Get seasonal multiplier based on season or current date.
        
        Args:
            season: Optional season string ('low', 'moderate', 'normal', 'high', 'very_high')
                   If None, auto-detects based on current month
            
        Returns:
            Dict with multiplier, season, and impact description
        """
        if season is None:
            season = DynamicPricingCalculator._auto_detect_season()
        
        season = season.lower()
        
        # Validate season
        if season not in DynamicPricingCalculator.SEASONAL_MULTIPLIERS:
            season = "normal"
        
        multiplier = DynamicPricingCalculator.SEASONAL_MULTIPLIERS[season]
        
        season_descriptions = {
            "low": "Off-season supply abundant",
            "moderate": "Shoulder season with moderate supply",
            "normal": "Normal supply and demand",
            "high": "Peak season with higher demand",
            "very_high": "Very high demand season",
        }
        
        return {
            "multiplier": multiplier,
            "season": season,
            "description": season_descriptions.get(season, "Unknown"),
            "percentage_change": round((multiplier - 1.0) * 100, 1)
        }
    
    @staticmethod
    def _auto_detect_season() -> str:
        """
        Auto-detect season based on current month.
        
        Assumes Northern Hemisphere agriculture model:
        - Winter (Dec-Feb): Low season, cold storage vegetables
        - Spring (Mar-May): Moderate, spring crops start
        - Summer (Jun-Aug): High, peak vegetable season
        - Fall (Sep-Nov): Normal to high, harvest season
        
        Returns:
            Season string
        """
        month = datetime.now().month
        
        if month in [12, 1, 2]:
            return "low"
        elif month in [3, 4, 5]:
            return "moderate"
        elif month in [6, 7, 8]:
            return "high"
        else:  # 9, 10, 11
            return "normal"
    
    def calculate_dynamic_price(
        self,
        base_price: float,
        freshness_score: float,
        demand_index: int,
        season: str = None
    ) -> Dict[str, any]:
        """
        Calculate dynamic price with all factors.
        
        Args:
            base_price: Original product price (float)
            freshness_score: Freshness score 0-1 (float)
            demand_index: Current demand level 1-10 (int)
            season: Optional season ('low', 'moderate', 'normal', 'high', 'very_high')
            
        Returns:
            Dict with suggested price, all factors, and detailed explanation
        """
        try:
            # Validate inputs
            if base_price <= 0:
                raise ValueError("Base price must be greater than 0")
            
            if not 0 <= freshness_score <= 1:
                raise ValueError("Freshness score must be between 0 and 1")
            
            if not 1 <= demand_index <= 10:
                raise ValueError("Demand index must be between 1 and 10")
            
            # Get all factors
            freshness_factor = self.get_freshness_multiplier(freshness_score)
            demand_factor = self.get_demand_multiplier(demand_index)
            seasonal_factor = self.get_seasonal_multiplier(season)
            
            # Calculate final price
            freshness_mult = freshness_factor["multiplier"]
            demand_mult = demand_factor["multiplier"]
            seasonal_mult = seasonal_factor["multiplier"]
            
            suggested_price = base_price * freshness_mult * demand_mult * seasonal_mult
            
            # Calculate savings/markup
            price_difference = suggested_price - base_price
            percentage_change = (price_difference / base_price) * 100
            
            # Additional insights
            insights = self._generate_insights(
                base_price,
                suggested_price,
                freshness_factor,
                demand_factor,
                seasonal_factor
            )
            
            # Compile result
            result = {
                "base_price": round(base_price, 2),
                "suggested_price": round(suggested_price, 2),
                "price_difference": round(price_difference, 2),
                "percentage_change": round(percentage_change, 2),
                "final_discount_percentage": round(
                    (1 - suggested_price / base_price) * 100, 2
                ) if suggested_price < base_price else 0,
                
                # Factor details
                "freshness_factor": {
    "score": round(freshness_score, 2),
    "category": freshness_factor["category"],
    "multiplier": freshness_factor["multiplier"],
    "discount": freshness_factor["discount"],
    "percentage_change": round((freshness_factor["multiplier"] - 1.0) * 100, 1),  # ✅ ADD THIS
    "impact": f"Freshness: {freshness_factor['category']} ({freshness_factor['discount']}% discount)"
},
                
                "demand_factor": {
                    "index": demand_factor["demand_index"],
                    "level": demand_factor["demand_level"],
                    "multiplier": demand_factor["multiplier"],
                    "percentage_change": demand_factor["percentage_change"],
                    "impact": demand_factor["impact"]
                },
                
                "seasonal_factor": {
                    "season": seasonal_factor["season"],
                    "multiplier": seasonal_factor["multiplier"],
                    "percentage_change": seasonal_factor["percentage_change"],
                    "description": seasonal_factor["description"],
                    "impact": f"Season: {seasonal_factor['season'].title()}"
                },
                
                # Explanation
                "explanation": "\n".join(insights),
                "calculation_formula": (
                    f"Suggested Price = {base_price} × {freshness_mult} (freshness) × "
                    f"{demand_mult} (demand) × {seasonal_mult} (seasonal) = {round(suggested_price, 2)}"
                )
            }
            
            return result
        
        except ValueError as e:
            logger.error(f"ValueError in calculate_dynamic_price: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in calculate_dynamic_price: {str(e)}")
            raise
    
    @staticmethod
    def _generate_insights(
        base_price: float,
        suggested_price: float,
        freshness_factor: Dict,
        demand_factor: Dict,
        seasonal_factor: Dict
    ) -> List[str]:
        """
        Generate human-readable insights about the pricing.
        
        Args:
            base_price: Original price
            suggested_price: Calculated price
            freshness_factor: Freshness details
            demand_factor: Demand details
            seasonal_factor: Seasonal details
            
        Returns:
            List of insight strings
        """
        insights = []
        
        # Base insight
        if suggested_price > base_price:
            diff = round(suggested_price - base_price, 2)
            insights.append(f"Price increased by ${diff} (+{((suggested_price - base_price) / base_price * 100):.1f}%)")
        elif suggested_price < base_price:
            diff = round(base_price - suggested_price, 2)
            insights.append(f"Price reduced by ${diff} (-{((base_price - suggested_price) / base_price * 100):.1f}%)")
        else:
            insights.append("Price remains unchanged")
        
        # Freshness insight
        insights.append(f"Freshness: {freshness_factor['category']} - {freshness_factor['discount']}% off base price")
        
        # Demand insight
        if demand_factor["demand_index"] >= 7:
            insights.append(f"High demand ({demand_factor['demand_level']}) justifies price premium")
        elif demand_factor["demand_index"] <= 3:
            insights.append(f"Low demand ({demand_factor['demand_level']}) requires competitive pricing")
        else:
            insights.append(f"Moderate demand ({demand_factor['demand_level']}) - balanced pricing")
        
        # Seasonal insight
        if seasonal_factor["percentage_change"] > 0:
            insights.append(
                f"Peak season ({seasonal_factor['season']}) enables {seasonal_factor['percentage_change']:.1f}% markup"
            )
        elif seasonal_factor["percentage_change"] < 0:
            insights.append(
                f"Off-season ({seasonal_factor['season']}) requires {abs(seasonal_factor['percentage_change']):.1f}% reduction"
            )
        
        # Recommendation
        insights.append(f"Recommended selling price: ${round(suggested_price, 2)}")
        
        return insights
    
    def calculate_price_range(
        self,
        base_price: float,
        freshness_score: float,
        demand_index: int,
        season: str = None,
        variance: float = 0.05
    ) -> Dict[str, any]:
        """
        Calculate a recommended price range with variance.
        
        Args:
            base_price: Original price
            freshness_score: Freshness score 0-1
            demand_index: Demand level 1-10
            season: Optional season
            variance: Pricing variance percentage (default 5%)
            
        Returns:
            Dict with min, suggested, max prices and range insights
        """
        main_price = self.calculate_dynamic_price(
            base_price,
            freshness_score,
            demand_index,
            season
        )
        
        suggested_price = main_price["suggested_price"]
        variance_amount = suggested_price * variance
        
        return {
            "minimum_price": round(suggested_price - variance_amount, 2),
            "suggested_price": suggested_price,
            "maximum_price": round(suggested_price + variance_amount, 2),
            "variance_percentage": variance * 100,
            "price_range_insights": [
                f"Competitive price: ${round(suggested_price - variance_amount, 2)}",
                f"Suggested price: ${suggested_price}",
                f"Premium price: ${round(suggested_price + variance_amount, 2)}"
            ],
            "full_calculation": main_price
        }


# Convenience function for quick pricing
def calculate_price(
    base_price: float,
    freshness_score: float,
    demand_index: int,
    season: str = None
) -> Dict[str, any]:
    """
    Quick convenience function to calculate dynamic price.
    
    Args:
        base_price: Original price
        freshness_score: Freshness score 0-1
        demand_index: Demand index 1-10
        season: Optional season
        
    Returns:
        Dynamic pricing calculation result
    """
    calculator = DynamicPricingCalculator()
    return calculator.calculate_dynamic_price(
        base_price,
        freshness_score,
        demand_index,
        season
    )
