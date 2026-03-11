import math

CROP_LIFE_DAYS = {
    "banana": 6,
    "tomato": 10,
    "apple": 20,
    "potato": 60,
    "onion": 90,
}


def estimate_shelf_life(crop, freshness_score):
    max_life = CROP_LIFE_DAYS.get(str(crop).lower(), 14)

    score = max(0.0, min(1.0, float(freshness_score)))

    if score <= 0.2:
        return 0

    days = max_life * score
    return int(max(0, math.floor(days)))


def _freshness_category(freshness_score):
    if freshness_score >= 0.8:
        return "Fresh"
    if freshness_score >= 0.5:
        return "Medium"
    if freshness_score > 0.2:
        return "Low"
    return "Rotten"


def predict_shelf_life(freshness_score, crop="generic"):
    score = float(freshness_score)
    score = max(0.0, min(1.0, score))

    remaining_days = estimate_shelf_life(crop, score)

    return {
        "remaining_days": remaining_days,
        "category": _freshness_category(score),
    }
