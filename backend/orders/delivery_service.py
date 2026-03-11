"""Delivery logistics service with address normalization and batch routing."""

import json
import logging
import math
import time
from datetime import timedelta
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from users.address_utils import build_geocode_candidates, normalize_address_text

logger = logging.getLogger(__name__)


class DeliveryOptimizer:
    DELIVERY_SPEED_KMH = 25
    SPOILAGE_BASE_RATE = 0.001
    FRESHNESS_MULTIPLIER = 0.02
    TEMPERATURE_IMPACT = 0.0005
    STOP_BUFFER_MINUTES = 12
    GEOCODE_DELAY_SECONDS = 1.1
    GEOCODER_URL = "https://nominatim.openstreetmap.org/search"

    def __init__(self):
        self.logger = logger
        self._last_geocode_at = 0.0

    def calculate_delivery_metrics(self, farmer_location, customer_location, freshness_score=0.8, temperature_controlled=True, product_type="vegetables"):
        try:
            farmer_details = self._resolve_location(farmer_location)
            customer_details = self._resolve_location(customer_location)
            distance_km = self._calculate_distance(farmer_details["coordinates"], customer_details["coordinates"])
            delivery_time = self._calculate_delivery_time(distance_km)
            spoilage_risk = self._calculate_spoilage_risk(distance_km, freshness_score, temperature_controlled, product_type)

            return {
                "distance_km": round(distance_km, 2),
                "distance_miles": round(distance_km * 0.621371, 2),
                "estimated_delivery_hours": round(delivery_time.total_seconds() / 3600, 1),
                "estimated_delivery_time": str(delivery_time),
                "spoilage_risk_percentage": round(spoilage_risk * 100, 2),
                "spoilage_category": self._get_spoilage_category(spoilage_risk),
                "temperature_controlled": temperature_controlled,
                "freshness_score": freshness_score,
                "product_type": product_type,
                "recommendation": self._get_delivery_recommendation(spoilage_risk, delivery_time, temperature_controlled),
                "is_viable": spoilage_risk < 0.30,
                "addresses": {
                    "farmer_input": farmer_details["input_value"],
                    "customer_input": customer_details["input_value"],
                    "farmer_normalized": farmer_details["normalized_address"],
                    "customer_normalized": customer_details["normalized_address"],
                    "farmer_resolved": farmer_details["resolved_name"],
                    "customer_resolved": customer_details["resolved_name"],
                },
                "coordinates": {
                    "farmer": {"latitude": farmer_details["coordinates"][0], "longitude": farmer_details["coordinates"][1]},
                    "customer": {"latitude": customer_details["coordinates"][0], "longitude": customer_details["coordinates"][1]},
                },
            }
        except Exception as exc:
            logger.error("Delivery calculation error: %s", exc)
            return {"error": str(exc)}

    def calculate_batch_delivery_metrics(self, farmer_location, deliveries, temperature_controlled=True):
        try:
            if not deliveries:
                raise ValueError("Select at least one delivery order for route planning.")

            origin = self._resolve_location(farmer_location)
            pending = []
            for item in deliveries:
                customer_details = self._resolve_location(item["customer_location"])
                pending.append(
                    {
                        "order_id": item.get("order_id"),
                        "product_name": item.get("product_name", "Produce"),
                        "customer_name": item.get("customer_name", "Customer"),
                        "product_type": item.get("product_type", "vegetables"),
                        "freshness_score": float(item.get("freshness_score", 0.8)),
                        "quantity": int(item.get("quantity", 1)),
                        "normalized_address": customer_details["normalized_address"],
                        "resolved_name": customer_details["resolved_name"],
                        "coordinates": customer_details["coordinates"],
                    }
                )

            route_stops = []
            current_coords = origin["coordinates"]
            cumulative_distance = 0.0
            cumulative_minutes = 0.0

            while pending:
                next_stop = min(pending, key=lambda stop: self._calculate_distance(current_coords, stop["coordinates"]))
                pending.remove(next_stop)
                leg_distance = self._calculate_distance(current_coords, next_stop["coordinates"])
                leg_minutes = (leg_distance / self.DELIVERY_SPEED_KMH) * 60
                cumulative_distance += leg_distance
                cumulative_minutes += leg_minutes + self.STOP_BUFFER_MINUTES
                direct_distance = self._calculate_distance(origin["coordinates"], next_stop["coordinates"])
                stop_risk = self._calculate_spoilage_risk(cumulative_distance, next_stop["freshness_score"], temperature_controlled, next_stop["product_type"])

                route_stops.append(
                    {
                        "order_id": next_stop["order_id"],
                        "customer_name": next_stop["customer_name"],
                        "product_name": next_stop["product_name"],
                        "product_type": next_stop["product_type"],
                        "quantity": next_stop["quantity"],
                        "sequence": len(route_stops) + 1,
                        "distance_from_previous_km": round(leg_distance, 2),
                        "direct_distance_from_origin_km": round(direct_distance, 2),
                        "cumulative_distance_km": round(cumulative_distance, 2),
                        "estimated_arrival_hours": round(cumulative_minutes / 60, 1),
                        "spoilage_risk_percentage": round(stop_risk * 100, 2),
                        "spoilage_category": self._get_spoilage_category(stop_risk),
                        "address": next_stop["normalized_address"],
                        "resolved_address": next_stop["resolved_name"],
                    }
                )
                current_coords = next_stop["coordinates"]

            direct_sum = sum(stop["direct_distance_from_origin_km"] for stop in route_stops)
            route_distance = sum(stop["distance_from_previous_km"] for stop in route_stops)
            efficiency_ratio = min(1.0, direct_sum / route_distance) if route_distance else 1.0
            average_risk = sum(stop["spoilage_risk_percentage"] for stop in route_stops) / len(route_stops)

            return {
                "origin": {"input": origin["input_value"], "normalized": origin["normalized_address"], "resolved": origin["resolved_name"]},
                "total_orders": len(route_stops),
                "total_distance_km": round(route_distance, 2),
                "estimated_total_hours": round(cumulative_minutes / 60, 1),
                "average_spoilage_risk_percentage": round(average_risk, 2),
                "route_efficiency_score": round(efficiency_ratio * 100, 1),
                "temperature_controlled": temperature_controlled,
                "is_viable": average_risk < 35,
                "recommendation": self._get_batch_recommendation(average_risk, efficiency_ratio, temperature_controlled),
                "stops": route_stops,
            }
        except Exception as exc:
            logger.error("Batch delivery calculation error: %s", exc)
            return {"error": str(exc)}

    def _resolve_location(self, location):
        if not location:
            raise ValueError("Location cannot be empty.")

        if isinstance(location, dict):
            latitude = location.get("latitude")
            longitude = location.get("longitude")
            address = location.get("address", "")
            if latitude is not None and longitude is not None:
                normalized = normalize_address_text(address)
                return {
                    "coordinates": (float(latitude), float(longitude)),
                    "normalized_address": normalized["normalized"] or address or f"Pinned location ({float(latitude):.5f}, {float(longitude):.5f})",
                    "resolved_name": address or normalized["normalized"] or f"Pinned location ({float(latitude):.5f}, {float(longitude):.5f})",
                    "input_value": address or f"Pinned location ({float(latitude):.5f}, {float(longitude):.5f})",
                }
            location = address

        if isinstance(location, (tuple, list)) and len(location) == 2:
            return {"coordinates": tuple(map(float, location)), "normalized_address": "", "resolved_name": "", "input_value": ""}

        normalized = normalize_address_text(str(location))
        candidates = build_geocode_candidates(normalized["normalized"] or str(location))
        for candidate in candidates:
            result = self._geocode(candidate)
            if result:
                return {
                    "coordinates": (float(result["lat"]), float(result["lon"])),
                    "normalized_address": normalized["normalized"] or candidate,
                    "resolved_name": result.get("display_name", candidate),
                    "input_value": str(location),
                }

        raise ValueError("Location not found. Please include area, city, state, and pincode if available.")

    def _geocode(self, query):
        elapsed = time.time() - self._last_geocode_at
        if elapsed < self.GEOCODE_DELAY_SECONDS:
            time.sleep(self.GEOCODE_DELAY_SECONDS - elapsed)
        params = urlencode({"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "in", "addressdetails": 1})
        request = Request(f"{self.GEOCODER_URL}?{params}", headers={"User-Agent": "farmer-consumer-app-delivery/1.0", "Accept-Language": "en"})
        try:
            with urlopen(request, timeout=10) as response:
                payload = json.loads(response.read().decode("utf-8"))
            self._last_geocode_at = time.time()
            return payload[0] if payload else None
        except Exception as exc:
            raise ValueError(f"Geocoding service unavailable. {exc}") from exc

    @staticmethod
    def _calculate_distance(coord1, coord2):
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        radius_km = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
        return max(0.0, radius_km * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))))

    def _calculate_delivery_time(self, distance_km):
        return timedelta(minutes=30 + (distance_km / self.DELIVERY_SPEED_KMH) * 60)

    def _calculate_spoilage_risk(self, distance_km, freshness_score, temperature_controlled, product_type):
        base_risk = distance_km * self.SPOILAGE_BASE_RATE
        freshness_adjustment = 1 - (freshness_score * self.FRESHNESS_MULTIPLIER)
        spoilage_risk = base_risk * freshness_adjustment
        if not temperature_controlled:
            spoilage_risk += distance_km * self.TEMPERATURE_IMPACT
        spoilage_risk *= {"vegetables": 1.0, "fruits": 0.9, "dairy": 1.3, "meats": 1.5, "herbs": 1.4, "berries": 1.2}.get(str(product_type).lower(), 1.0)
        return min(0.95, max(0.0, spoilage_risk))

    @staticmethod
    def _get_spoilage_category(risk):
        if risk < 0.10:
            return "Very Low Risk"
        if risk < 0.20:
            return "Low Risk"
        if risk < 0.30:
            return "Moderate Risk"
        if risk < 0.50:
            return "High Risk"
        return "Very High Risk"

    def _get_delivery_recommendation(self, spoilage_risk, delivery_time, temperature_controlled):
        hours = delivery_time.total_seconds() / 3600
        if spoilage_risk > 0.50:
            return "Not recommended. The spoilage risk is too high for routine dispatch."
        if spoilage_risk > 0.30 and not temperature_controlled:
            return "Use a temperature-controlled vehicle or move this order to an earlier route."
        if hours > 12:
            return "This is a long route. Confirm packaging and handoff timing before dispatch."
        return "Safe for delivery on the planned route."

    def _get_batch_recommendation(self, average_risk, efficiency_ratio, temperature_controlled):
        if average_risk > 40:
            return "Batch route is risky. Split the trip or dispatch the most sensitive orders first."
        if efficiency_ratio < 0.65:
            return "Orders are spread out. Consider creating two smaller clusters for better route efficiency."
        if not temperature_controlled:
            return "Batch route is viable, but temperature control would reduce exposure on later stops."
        return "Batch route looks healthy. Dispatch in the suggested stop order for better efficiency."
