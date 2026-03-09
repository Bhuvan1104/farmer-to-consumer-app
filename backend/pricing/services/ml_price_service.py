from .pricing_service import _to_float, advanced_price
from pricing.ml_price_predictor import PricePredictor


_predictor = PricePredictor()
if getattr(_predictor, "model", None) is not None and hasattr(_predictor.model, "n_jobs"):
    _predictor.model.n_jobs = 1


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


def predict_ml_price(base_price, freshness_score, demand_index, seasonal_factor):
    base_price = _to_float(base_price, "base_price")
    freshness_score = _to_float(freshness_score, "freshness_score")
    demand_index = int(_to_float(demand_index, "demand_index"))
    seasonal_factor = _to_float(seasonal_factor, "seasonal_factor")

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
    rule_price = float(advanced_price(base_price, freshness_score, demand_index, season))

    # Clamp ML output to sane bounds, then blend with rule-based price.
    clamped_pred = max(base_price * 0.60, min(base_price * 1.35, raw_pred))
    blended_price = (0.65 * rule_price) + (0.35 * clamped_pred)

    price_change = blended_price - base_price
    percentage_change = (price_change / base_price) * 100

    model_gap = abs(raw_pred - rule_price) / max(base_price, 1.0)
    confidence = "High" if model_gap <= 0.20 else "Medium"

    return {
        "predicted_price": round(blended_price, 2),
        "base_price": round(base_price, 2),
        "price_change": round(price_change, 2),
        "percentage_change": round(percentage_change, 2),
        "confidence": confidence,
        "top_factors": raw_result.get("top_factors", []),
        "recommendation": _recommendation_from_change(percentage_change),
    }
