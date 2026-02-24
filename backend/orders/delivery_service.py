"""
Delivery Logistics Service

Calculates delivery metrics based on farmer and customer locations:
- Distance between locations
- Estimated delivery time
- Spoilage risk based on freshness and transport time
"""

import logging
import math
from datetime import timedelta
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
import warnings

warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


class DeliveryOptimizer:
    """
    Optimizes delivery logistics and calculates spoilage risk.
    
    Features:
    - Distance calculation using geodesic distance
    - Delivery time estimation
    - Spoilage risk assessment
    """
    
    # Average delivery speed (km/hour)
    DELIVERY_SPEED_KMH = 25
    
    # Spoilage parameters
    SPOILAGE_BASE_RATE = 0.001  # 0.1% per km
    FRESHNESS_MULTIPLIER = 0.02  # Rate changes with freshness
    TEMPERATURE_IMPACT = 0.0005  # Additional risk per km if high temp
    
    def __init__(self):
        """Initialize delivery optimizer."""
        self.geocoder = Nominatim(user_agent="farmer_app")
        self.logger = logger
    
    def calculate_delivery_metrics(
        self,
        farmer_location,
        customer_location,
        freshness_score=0.8,
        temperature_controlled=True,
        product_type="vegetables"
    ):
        """
        Calculate delivery metrics for a product shipment.
        
        Args:
            farmer_location: Tuple of (latitude, longitude) or address string
            customer_location: Tuple of (latitude, longitude) or address string
            freshness_score: Freshness score 0-1
            temperature_controlled: Whether delivery has temperature control
            product_type: Type of product (vegetables, fruits, dairy, etc.)
        
        Returns:
            Dict with distance, delivery time, and spoilage risk
        """
        try:
            # Get coordinates
            farmer_coords = self._get_coordinates(farmer_location)
            customer_coords = self._get_coordinates(customer_location)
            
            # Calculate distance
            distance_km = self._calculate_distance(farmer_coords, customer_coords)
            
            # Calculate delivery time
            delivery_time = self._calculate_delivery_time(distance_km)
            
            # Calculate spoilage risk
            spoilage_risk = self._calculate_spoilage_risk(
                distance_km,
                freshness_score,
                temperature_controlled,
                product_type
            )
            
            # Generate recommendation
            recommendation = self._get_delivery_recommendation(spoilage_risk, delivery_time)
            
            return {
                'distance_km': round(distance_km, 2),
                'distance_miles': round(distance_km * 0.621371, 2),
                'estimated_delivery_hours': round(delivery_time.total_seconds() / 3600, 1),
                'estimated_delivery_time': delivery_time.isoformat(),
                'spoilage_risk_percentage': round(spoilage_risk * 100, 2),
                'spoilage_category': self._get_spoilage_category(spoilage_risk),
                'temperature_controlled': temperature_controlled,
                'freshness_score': freshness_score,
                'product_type': product_type,
                'recommendation': recommendation,
                'is_viable': spoilage_risk < 0.30,  # Less than 30% risk is acceptable
                'coordinates': {
                    'farmer': {'latitude': farmer_coords[0], 'longitude': farmer_coords[1]},
                    'customer': {'latitude': customer_coords[0], 'longitude': customer_coords[1]}
                }
            }
        
        except Exception as e:
            logger.error(f"Error in calculate_delivery_metrics: {str(e)}")
            raise
    
    def _get_coordinates(self, location):
        """
        Get coordinates from location (address or tuple).
        
        Args:
            location: Address string or (latitude, longitude) tuple
        
        Returns:
            Tuple of (latitude, longitude)
        """
        if isinstance(location, (tuple, list)) and len(location) == 2:
            return tuple(map(float, location))
        
        # Try to geocode address
        try:
            result = self.geocoder.geocode(location, timeout=10)
            if result:
                return (result.latitude, result.longitude)
            else:
                raise ValueError(f"Could not geocode location: {location}")
        except Exception as e:
            logger.error(f"Geocoding error: {str(e)}")
            raise
    
    @staticmethod
    def _calculate_distance(coord1, coord2):
        """
        Calculate distance between two coordinates using geodesic.
        
        Args:
            coord1: (latitude, longitude) tuple
            coord2: (latitude, longitude) tuple
        
        Returns:
            Distance in kilometers
        """
        distance = geodesic(coord1, coord2).kilometers
        return max(0, distance)  # Minimum 0 km
    
    def _calculate_delivery_time(self, distance_km):
        """
        Estimate delivery time based on distance.
        
        Args:
            distance_km: Distance in kilometers
        
        Returns:
            timedelta object with estimated delivery time
        """
        # Base time (loading, sorting, etc.)
        base_time_minutes = 30
        
        # Travel time
        travel_time_hours = distance_km / self.DELIVERY_SPEED_KMH
        travel_time_minutes = travel_time_hours * 60
        
        total_minutes = base_time_minutes + travel_time_minutes
        return timedelta(minutes=total_minutes)
    
    def _calculate_spoilage_risk(
        self,
        distance_km,
        freshness_score,
        temperature_controlled,
        product_type
    ):
        """
        Calculate spoilage risk based on multiple factors.
        
        Args:
            distance_km: Distance in kilometers
            freshness_score: Freshness score 0-1
            temperature_controlled: Whether delivery is temperature controlled
            product_type: Type of product
        
        Returns:
            Spoilage risk as percentage (0-1)
        """
        # Base spoilage from distance
        base_risk = distance_km * self.SPOILAGE_BASE_RATE
        
        # Adjust for freshness (fresher produce lasts longer)
        freshness_adjustment = 1 - (freshness_score * self.FRESHNESS_MULTIPLIER)
        spoilage_risk = base_risk * freshness_adjustment
        
        # Add temperature impact if not controlled
        if not temperature_controlled:
            spoilage_risk += distance_km * self.TEMPERATURE_IMPACT
        
        # Product type adjustments
        product_factors = {
            'vegetables': 1.0,
            'fruits': 0.9,      # More resilient
            'dairy': 1.3,        # More sensitive
            'meats': 1.5,        # Very sensitive
            'herbs': 1.4,        # Delicate
            'berries': 1.2,      # Moderately sensitive
        }
        
        factor = product_factors.get(product_type.lower(), 1.0)
        spoilage_risk = spoilage_risk * factor
        
        # Cap at reasonable maximum
        return min(0.95, max(0, spoilage_risk))
    
    @staticmethod
    def _get_spoilage_category(risk):
        """Get category name for spoilage risk."""
        if risk < 0.10:
            return "Very Low Risk"
        elif risk < 0.20:
            return "Low Risk"
        elif risk < 0.30:
            return "Moderate Risk"
        elif risk < 0.50:
            return "High Risk"
        else:
            return "Very High Risk"
    
    def _get_delivery_recommendation(self, spoilage_risk, delivery_time):
        """Generate recommendation based on delivery metrics."""
        hours = delivery_time.total_seconds() / 3600
        
        if spoilage_risk > 0.50:
            return "❌ Not recommended - Too high spoilage risk"
        elif spoilage_risk > 0.30:
            return "⚠️ Risky - Requires urgent delivery and/or temperature control"
        elif spoilage_risk > 0.20:
            return "✅ Acceptable - Consider temperature control"
        elif hours > 12:
            return "✅ Viable - Schedule delivery for optimal freshness"
        else:
            return "✅ Good - Safe for standard delivery"
    
    def optimize_delivery_route(self, locations, freshness_score=0.8):
        """
        Optimize delivery for multiple locations.
        
        Args:
            locations: List of dicts with farmer_location and customer_location
            freshness_score: Average freshness score
        
        Returns:
            List of optimized deliveries sorted by distance/time
        """
        results = []
        
        for i, route in enumerate(locations):
            try:
                metrics = self.calculate_delivery_metrics(
                    route['farmer_location'],
                    route['customer_location'],
                    freshness_score
                )
                metrics['route_id'] = i + 1
                results.append(metrics)
            except Exception as e:
                logger.error(f"Error optimizing route {i}: {str(e)}")
        
        # Sort by distance (closest first for faster delivery)
        results.sort(key=lambda x: x['distance_km'])
        
        return results
    
    def calculate_batch_delivery(self, locations, freshness_score=0.8):
        """
        Calculate batch delivery metrics for multiple stops.
        
        Args:
            locations: List of location tuples
            freshness_score: Freshness of product
        
        Returns:
            Total distance, time, and aggregated risk
        """
        if len(locations) < 2:
            raise ValueError("Need at least 2 locations for batch delivery")
        
        total_distance = 0
        current_location = locations[0]
        
        for next_location in locations[1:]:
            coord1 = self._get_coordinates(current_location) if isinstance(current_location, str) else current_location
            coord2 = self._get_coordinates(next_location) if isinstance(next_location, str) else next_location
            
            distance = self._calculate_distance(coord1, coord2)
            total_distance += distance
            current_location = next_location
        
        # Calculate metrics for batch
        delivery_time = self._calculate_delivery_time(total_distance)
        spoilage_risk = self._calculate_spoilage_risk(
            total_distance,
            freshness_score,
            temperature_controlled=True,
            product_type="vegetables"
        )
        
        return {
            'total_distance_km': round(total_distance, 2),
            'total_delivery_hours': round(delivery_time.total_seconds() / 3600, 1),
            'num_stops': len(locations),
            'average_spoilage_risk': round(spoilage_risk * 100, 2),
            'recommendation': self._get_delivery_recommendation(spoilage_risk, delivery_time)
        }


# Convenience function
def calculate_delivery(farmer_location, customer_location, freshness_score=0.8, temp_controlled=True):
    """
    Quick convenience function to calculate delivery metrics.
    
    Args:
        farmer_location: Farmer's location (address or coordinates)
        customer_location: Customer's location (address or coordinates)
        freshness_score: Product freshness 0-1
        temp_controlled: Temperature controlled delivery
    
    Returns:
        Delivery metrics
    """
    optimizer = DeliveryOptimizer()
    return optimizer.calculate_delivery_metrics(
        farmer_location,
        customer_location,
        freshness_score,
        temp_controlled
    )
