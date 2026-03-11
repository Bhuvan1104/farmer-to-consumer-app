import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
HEADERS = {
    "User-Agent": "farmer-consumer-app-map-picker/1.0",
    "Accept-Language": "en",
}


def _extract_location_payload(item):
    address = item.get("address", {}) or {}
    return {
        "display_name": item.get("display_name", ""),
        "latitude": float(item.get("lat", 0.0)),
        "longitude": float(item.get("lon", 0.0)),
        "components": {
            "house_number": address.get("house_number", ""),
            "road": address.get("road", ""),
            "suburb": address.get("suburb", "") or address.get("neighbourhood", ""),
            "city": address.get("city", "") or address.get("town", "") or address.get("village", ""),
            "state": address.get("state", ""),
            "postcode": address.get("postcode", ""),
            "country": address.get("country", "India"),
        },
    }


def search_map_locations(query, limit=5):
    query = (query or "").strip()
    if not query:
        return []

    params = urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "limit": limit,
            "countrycodes": "in",
            "addressdetails": 1,
        }
    )
    request = Request(f"{NOMINATIM_SEARCH_URL}?{params}", headers=HEADERS)

    with urlopen(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return [_extract_location_payload(item) for item in payload]


def reverse_geocode_location(latitude, longitude):
    params = urlencode(
        {
            "lat": latitude,
            "lon": longitude,
            "format": "jsonv2",
            "addressdetails": 1,
        }
    )
    request = Request(f"{NOMINATIM_REVERSE_URL}?{params}", headers=HEADERS)

    with urlopen(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return _extract_location_payload(payload)
