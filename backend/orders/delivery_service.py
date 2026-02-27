"""
Delivery Logistics Service
"""

import logging
import math
from datetime import timedelta
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import warnings

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


class DeliveryOptimizer:

    DELIVERY_SPEED_KMH = 25
    SPOILAGE_BASE_RATE = 0.001
    FRESHNESS_MULTIPLIER = 0.02
    TEMPERATURE_IMPACT = 0.0005

    def __init__(self):
        self.geocoder = Nominatim(user_agent="farmer_consumer_app_v1")
        self.logger = logger

    def calculate_delivery_metrics(
        self,
        farmer_location,
        customer_location,
        freshness_score=0.8,
        temperature_controlled=True,
        product_type="vegetables",
    ):
        try:
            farmer_coords = self._get_coordinates(farmer_location)
            customer_coords = self._get_coordinates(customer_location)

            distance_km = self._calculate_distance(farmer_coords, customer_coords)
            delivery_time = self._calculate_delivery_time(distance_km)

            spoilage_risk = self._calculate_spoilage_risk(
                distance_km,
                freshness_score,
                temperature_controlled,
                product_type,
            )

            recommendation = self._get_delivery_recommendation(
                spoilage_risk, delivery_time
            )

            return {
                "distance_km": round(distance_km, 2),
                "distance_miles": round(distance_km * 0.621371, 2),
                "estimated_delivery_hours": round(
                    delivery_time.total_seconds() / 3600, 1
                ),
                "estimated_delivery_time": str(delivery_time),
                "spoilage_risk_percentage": round(spoilage_risk * 100, 2),
                "spoilage_category": self._get_spoilage_category(spoilage_risk),
                "temperature_controlled": temperature_controlled,
                "freshness_score": freshness_score,
                "product_type": product_type,
                "recommendation": recommendation,
                "is_viable": spoilage_risk < 0.30,
                "coordinates": {
                    "farmer": {
                        "latitude": farmer_coords[0],
                        "longitude": farmer_coords[1],
                    },
                    "customer": {
                        "latitude": customer_coords[0],
                        "longitude": customer_coords[1],
                    },
                },
            }

        except Exception as e:
            logger.error(f"Delivery calculation error: {str(e)}")
            return {"error": str(e)}

    def _get_coordinates(self, location):

        if not location:
            raise ValueError("Location cannot be empty.")

        if isinstance(location, (tuple, list)) and len(location) == 2:
            return tuple(map(float, location))

        try:
            result = self.geocoder.geocode(location, timeout=10)

            if not result:
                raise ValueError(f"Location not found: {location}")

            return (result.latitude, result.longitude)

        except (GeocoderTimedOut, GeocoderServiceError):
            raise ValueError(
                "Geocoding service unavailable. Please try again later."
            )

    @staticmethod
    def _calculate_distance(coord1, coord2):
        return max(0, geodesic(coord1, coord2).kilometers)

    def _calculate_delivery_time(self, distance_km):
        base_minutes = 30
        travel_minutes = (distance_km / self.DELIVERY_SPEED_KMH) * 60
        return timedelta(minutes=base_minutes + travel_minutes)

    def _calculate_spoilage_risk(
        self,
        distance_km,
        freshness_score,
        temperature_controlled,
        product_type,
    ):
        base_risk = distance_km * self.SPOILAGE_BASE_RATE
        freshness_adjustment = 1 - (freshness_score * self.FRESHNESS_MULTIPLIER)
        spoilage_risk = base_risk * freshness_adjustment

        if not temperature_controlled:
            spoilage_risk += distance_km * self.TEMPERATURE_IMPACT

        product_factors = {
            "vegetables": 1.0,
            "fruits": 0.9,
            "dairy": 1.3,
            "meats": 1.5,
            "herbs": 1.4,
            "berries": 1.2,
        }

        factor = product_factors.get(product_type.lower(), 1.0)
        spoilage_risk *= factor

        return min(0.95, max(0, spoilage_risk))

    @staticmethod
    def _get_spoilage_category(risk):
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
        hours = delivery_time.total_seconds() / 3600

        if spoilage_risk > 0.50:
            return "❌ Not recommended - Too high spoilage risk"
        elif spoilage_risk > 0.30:
            return "⚠️ Risky - Use temperature control"
        elif hours > 12:
            return "⚠️ Long distance - Monitor freshness"
        else:
            return "✅ Safe for delivery"