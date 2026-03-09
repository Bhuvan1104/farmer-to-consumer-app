def predict_shelf_life(freshness_score):
    score = max(0.0, min(1.0, float(freshness_score)))

    if score >= 0.82:
        category = "Excellent"
        remaining_days = 12
    elif score >= 0.70:
        category = "Good"
        remaining_days = 8
    elif score >= 0.60:
        category = "Moderate"
        remaining_days = 5
    elif score >= 0.40:
        category = "Low"
        remaining_days = 3
    else:
        category = "Rotten"
        remaining_days = 2

    return {
        "category": category,
        "remaining_days": remaining_days
    }
