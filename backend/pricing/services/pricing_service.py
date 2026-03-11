from pathlib import Path
import pickle

import numpy as np

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "price_model.pkl"

_MODEL = None
_MODEL_ERROR = None
if MODEL_PATH.exists():
    try:
        with MODEL_PATH.open("rb") as fh:
            _MODEL = pickle.load(fh)
    except Exception as exc:
        _MODEL_ERROR = exc


# Keep season as a contextual modifier, but let demand remain the stronger market signal.
SEASON_MULTIPLIERS = {
    "low": 0.97,
    "moderate": 0.99,
    "normal": 1.00,
    "high": 1.03,
    "very_high": 1.06,
}


def _to_float(value, field_name="value"):
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a valid number") from exc


def _shelf_life_multiplier(shelf_life_days=None):
    if shelf_life_days is None:
        return 1.0

    days = int(_to_float(shelf_life_days, "estimated_remaining_days"))
    if days <= 1:
        return 0.72
    if days <= 3:
        return 0.84
    if days <= 7:
        return 0.93
    if days <= 14:
        return 1.00
    return 1.05


def _freshness_multiplier_dynamic(freshness_score):
    return 0.78 + (0.32 * freshness_score)


def _freshness_multiplier_advanced(freshness_score):
    return 0.75 + (0.35 * freshness_score)


def _demand_multiplier(demand_index):
    return 1.0 + ((demand_index - 5) * 0.06)


def _multiplier_stat(name, multiplier, detail, tone_hint):
    pct = (multiplier - 1.0) * 100
    return {
        "factor": name,
        "multiplier": round(multiplier, 3),
        "percentage_impact": round(pct, 2),
        "detail": detail,
        "tone": tone_hint,
    }


def dynamic_price(base_price, freshness_score, shelf_life_days=None):
    base_price = _to_float(base_price, "base_price")
    freshness_score = _to_float(freshness_score, "freshness_score")

    if not 0 <= freshness_score <= 1:
        raise ValueError("freshness_score must be between 0 and 1")

    freshness_multiplier = _freshness_multiplier_dynamic(freshness_score)
    shelf_multiplier = _shelf_life_multiplier(shelf_life_days)
    suggested_price = base_price * freshness_multiplier * shelf_multiplier
    suggested_price = max(base_price * 0.40, min(base_price * 1.15, suggested_price))

    discount = max(0.0, (1 - (suggested_price / base_price)) * 100)

    reasoning = [
        f"Freshness score of {freshness_score:.2f} applied a {((freshness_multiplier - 1) * 100):.1f}% price effect.",
    ]
    factor_stats = [
        _multiplier_stat("Freshness", freshness_multiplier, f"Score {freshness_score:.2f}", "quality"),
    ]

    if shelf_life_days is not None:
        reasoning.append(
            f"Remaining shelf life of {int(shelf_life_days)} days applied a {((shelf_multiplier - 1) * 100):.1f}% inventory pressure adjustment."
        )
        factor_stats.append(
            _multiplier_stat("Shelf Life", shelf_multiplier, f"{int(shelf_life_days)} days left", "time")
        )

    return {
        "base_price": round(base_price, 2),
        "suggested_price": round(suggested_price, 2),
        "discount_percentage": round(discount, 2),
        "shelf_life_multiplier": round(shelf_multiplier, 3),
        "factor_stats": factor_stats,
        "reasoning": reasoning,
        "statistics": {
            "price_change": round(suggested_price - base_price, 2),
            "percentage_change": round(((suggested_price - base_price) / base_price) * 100, 2),
        },
    }


def advanced_price(base_price, freshness_score, demand_index, season, shelf_life_days=None):
    base_price = _to_float(base_price, "base_price")
    freshness_score = _to_float(freshness_score, "freshness_score")
    demand_index = int(_to_float(demand_index, "demand_index"))

    if not 0 <= freshness_score <= 1:
        raise ValueError("freshness_score must be between 0 and 1")

    freshness_multiplier = _freshness_multiplier_advanced(freshness_score)
    demand_multiplier = _demand_multiplier(demand_index)
    season_multiplier = SEASON_MULTIPLIERS.get(str(season).lower(), 1.0)
    shelf_multiplier = _shelf_life_multiplier(shelf_life_days)

    price = base_price * freshness_multiplier * demand_multiplier * season_multiplier * shelf_multiplier
    price = max(base_price * 0.40, min(base_price * 1.60, price))

    factor_stats = [
        _multiplier_stat("Freshness", freshness_multiplier, f"Score {freshness_score:.2f}", "quality"),
        _multiplier_stat("Market Demand", demand_multiplier, f"Demand index {demand_index}/10", "demand"),
        _multiplier_stat("Season", season_multiplier, f"Season {season}", "season"),
    ]
    reasoning = [
        f"Freshness score of {freshness_score:.2f} contributed {((freshness_multiplier - 1) * 100):.1f}%.",
        f"Market demand index {demand_index}/10 contributed {((demand_multiplier - 1) * 100):.1f}%, making demand the primary market driver.",
        f"Seasonal effect for {season} contributed {((season_multiplier - 1) * 100):.1f}% as a contextual adjustment.",
    ]

    if shelf_life_days is not None:
        factor_stats.append(
            _multiplier_stat("Shelf Life", shelf_multiplier, f"{int(shelf_life_days)} days left", "time")
        )
        reasoning.append(
            f"Remaining shelf life of {int(shelf_life_days)} days contributed {((shelf_multiplier - 1) * 100):.1f}%."
        )

    return {
        "base_price": round(base_price, 2),
        "suggested_price": round(price, 2),
        "factor_stats": factor_stats,
        "reasoning": reasoning,
        "statistics": {
            "price_change": round(price - base_price, 2),
            "percentage_change": round(((price - base_price) / base_price) * 100, 2),
            "demand_index": demand_index,
            "season": str(season).lower(),
            "estimated_remaining_days": None if shelf_life_days is None else int(shelf_life_days),
        },
    }


def predict_price(freshness, demand, season):
    freshness = _to_float(freshness, "freshness")
    demand = _to_float(demand, "demand")
    season = _to_float(season, "season")

    if _MODEL is None:
        if _MODEL_ERROR is not None:
            raise RuntimeError("Unable to load price model") from _MODEL_ERROR
        raise RuntimeError("Price model file not found")

    features = np.array([[freshness, demand, season]])
    price = _MODEL.predict(features)[0]
    return float(price)
