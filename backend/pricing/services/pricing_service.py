from math import isfinite


def _to_float(value, field_name):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number")

    if not isfinite(parsed):
        raise ValueError(f"{field_name} must be finite")

    return parsed


def _freshness_multiplier(freshness_score):
    if freshness_score >= 0.8:
        return 1.0
    if freshness_score >= 0.6:
        return 0.9
    if freshness_score >= 0.4:
        return 0.75
    if freshness_score >= 0.2:
        return 0.55
    return 0.35


def dynamic_price(base_price, freshness_score):
    base_price = _to_float(base_price, "base_price")
    freshness_score = _to_float(freshness_score, "freshness_score")

    if base_price <= 0:
        raise ValueError("base_price must be greater than 0")
    if not 0 <= freshness_score <= 1:
        raise ValueError("freshness_score must be between 0 and 1")

    freshness_multiplier = _freshness_multiplier(freshness_score)
    suggested_price = base_price * freshness_multiplier

    discount_percentage = ((base_price - suggested_price) / base_price) * 100

    return {
        "suggested_price": round(suggested_price, 2),
        "discount_percentage": round(discount_percentage, 2),
    }


def advanced_price(base_price, freshness_score, demand_index, season):
    base_price = _to_float(base_price, "base_price")
    freshness_score = _to_float(freshness_score, "freshness_score")
    demand_index = _to_float(demand_index, "demand_index")

    if base_price <= 0:
        raise ValueError("base_price must be greater than 0")
    if not 0 <= freshness_score <= 1:
        raise ValueError("freshness_score must be between 0 and 1")
    if not 1 <= demand_index <= 10:
        raise ValueError("demand_index must be between 1 and 10")

    # Controlled demand curve: index 1..10 -> multiplier 0.80..1.20
    demand_multiplier = 0.80 + ((demand_index - 1) * (0.40 / 9.0))

    season_map = {
        "low": 0.90,
        "moderate": 0.97,
        "normal": 1.00,
        "high": 1.08,
        "very_high": 1.15,
    }

    season_key = str(season or "normal").lower()
    season_multiplier = season_map.get(season_key, 1.0)

    freshness_multiplier = _freshness_multiplier(freshness_score)

    final_price = (
        base_price
        * freshness_multiplier
        * demand_multiplier
        * season_multiplier
    )

    # Hard safety bounds to prevent unrealistic quotes.
    min_price = base_price * 0.25
    max_price = base_price * 1.50
    bounded_price = max(min_price, min(max_price, final_price))

    return round(bounded_price, 2)
