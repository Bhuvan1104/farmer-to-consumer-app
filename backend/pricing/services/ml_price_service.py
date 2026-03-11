from .pricing_service import _to_float, advanced_price

try:
    from pricing.ml_price_predictor import PricePredictor
    _PREDICTOR_ERROR = None
    _predictor = PricePredictor()
    if getattr(_predictor, "model", None) is not None and hasattr(_predictor.model, "n_jobs"):
        _predictor.model.n_jobs = 1
except Exception as exc:
    PricePredictor = None
    _PREDICTOR_ERROR = exc
    _predictor = None


def _to_builtin(value):
    if isinstance(value, dict):
        return {k: _to_builtin(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_builtin(item) for item in value]

    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return value

    return value


def _season_from_factor(seasonal_factor):
    if seasonal_factor <= 0.82:
        return "low"
    if seasonal_factor <= 0.96:
        return "moderate"
    if seasonal_factor <= 1.05:
        return "normal"
    if seasonal_factor <= 1.15:
        return "high"
    return "very_high"


def _recommendation_from_change(percentage_change):
    if percentage_change >= 20:
        return "Strong upside expected. Hold inventory for better pricing if storage permits."
    if percentage_change >= 5:
        return "Mild upside expected. List at a moderate premium."
    if percentage_change > -5:
        return "Stable outlook. Use standard listing price."
    if percentage_change > -20:
        return "Softening outlook. Offer a small discount to improve turnover."
    return "Downside risk is high. Use aggressive discounting for faster clearance."


def _normalize_top_factors(raw_factors):
    normalized = []
    for item in raw_factors or []:
        factor_name = str(item.get("factor", "signal")).strip().lower().replace(" ", "_")
        importance = item.get("importance", 0)
        try:
            importance = float(importance)
        except (TypeError, ValueError):
            importance = 0.0

        if importance > 1.0:
            importance = importance / 100.0

        normalized.append({
            "factor": factor_name,
            "importance": round(max(0.0, min(1.0, importance)), 2),
        })
    return normalized


def _shelf_life_factor_note(shelf_life_days):
    if shelf_life_days is None:
        return None

    days = int(_to_float(shelf_life_days, "estimated_remaining_days"))
    if days <= 1:
        return {"factor": "shelf_life", "importance": 0.95}
    if days <= 3:
        return {"factor": "shelf_life", "importance": 0.80}
    if days <= 7:
        return {"factor": "shelf_life", "importance": 0.60}
    return {"factor": "shelf_life", "importance": 0.30}


def _fallback_result(base_price, freshness_score, demand_index, seasonal_factor, shelf_life_days=None):
    season = _season_from_factor(seasonal_factor)
    rule_result = advanced_price(base_price, freshness_score, demand_index, season, shelf_life_days)
    rule_price = float(rule_result["suggested_price"])
    price_change = rule_price - base_price
    percentage_change = (price_change / base_price) * 100

    top_factors = [
        {"factor": "freshness", "importance": round(float(freshness_score), 2)},
        {"factor": "market_demand", "importance": round(min(1.0, demand_index / 10), 2)},
    ]
    shelf_note = _shelf_life_factor_note(shelf_life_days)
    if shelf_note is not None:
        top_factors.append(shelf_note)

    return {
        "predicted_price": round(rule_price, 2),
        "base_price": round(base_price, 2),
        "price_change": round(price_change, 2),
        "percentage_change": round(percentage_change, 2),
        "confidence": "Low",
        "top_factors": top_factors,
        "factor_stats": rule_result.get("factor_stats", []),
        "reasoning": rule_result.get("reasoning", []),
        "statistics": rule_result.get("statistics", {}),
        "recommendation": _recommendation_from_change(percentage_change),
        "note": "ML predictor unavailable; using freshness, shelf life, demand, and season based pricing.",
    }


def predict_ml_price(base_price, freshness_score, demand_index, seasonal_factor, shelf_life_days=None):
    base_price = _to_float(base_price, "base_price")
    freshness_score = _to_float(freshness_score, "freshness_score")
    demand_index = int(_to_float(demand_index, "demand_index"))
    seasonal_factor = _to_float(seasonal_factor, "seasonal_factor")

    if _predictor is None:
        return _fallback_result(base_price, freshness_score, demand_index, seasonal_factor, shelf_life_days)

    raw_result = _to_builtin(
        _predictor.predict_next_week_price(
            base_price,
            freshness_score,
            demand_index,
            seasonal_factor,
        )
    )

    raw_pred = float(raw_result.get("predicted_price", base_price))

    season = _season_from_factor(seasonal_factor)
    rule_result = advanced_price(base_price, freshness_score, demand_index, season, shelf_life_days)
    rule_price = float(rule_result["suggested_price"])

    clamped_pred = max(base_price * 0.60, min(base_price * 1.35, raw_pred))
    shelf_rule_weight = 0.75 if shelf_life_days is not None and int(_to_float(shelf_life_days, "estimated_remaining_days")) <= 3 else 0.60
    model_gap = abs(raw_pred - rule_price) / max(base_price, 1.0)
    if model_gap > 0.75:
        shelf_rule_weight = 0.90
    blended_price = (shelf_rule_weight * rule_price) + ((1 - shelf_rule_weight) * clamped_pred)

    price_change = blended_price - base_price
    percentage_change = (price_change / base_price) * 100

    confidence = "High" if model_gap <= 0.20 else ("Medium" if model_gap <= 0.75 else "Low")

    top_factors = _normalize_top_factors(raw_result.get("top_factors", []))
    top_factors.append({"factor": "freshness", "importance": round(float(freshness_score), 2)})
    top_factors.append({"factor": "market_demand", "importance": round(min(1.0, demand_index / 10), 2)})
    shelf_note = _shelf_life_factor_note(shelf_life_days)
    if shelf_note is not None:
        top_factors.append(shelf_note)

    reasoning = list(rule_result.get("reasoning", []))
    reasoning.append(
        f"ML forecast suggested {raw_pred:.2f}, then it was blended with the rule-based price {rule_price:.2f} for stability."
    )

    statistics = dict(rule_result.get("statistics", {}))
    statistics.update({
        "ml_raw_prediction": round(raw_pred, 2),
        "blended_price": round(blended_price, 2),
        "model_gap_percentage": round(model_gap * 100, 2),
    })

    return {
        "predicted_price": round(blended_price, 2),
        "base_price": round(base_price, 2),
        "price_change": round(price_change, 2),
        "percentage_change": round(percentage_change, 2),
        "confidence": confidence,
        "top_factors": top_factors,
        "factor_stats": rule_result.get("factor_stats", []),
        "reasoning": reasoning,
        "statistics": statistics,
        "recommendation": _recommendation_from_change(percentage_change),
    }

