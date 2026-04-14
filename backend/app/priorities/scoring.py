from app.initiatives.calculations import calculate_metrics


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize(value: float, minimum: float, maximum: float) -> float:
    if maximum <= minimum:
        return 0.0
    bounded = clamp(value, minimum, maximum)
    return ((bounded - minimum) / (maximum - minimum)) * 100


def normalize_inverse(value: float, minimum: float, maximum: float) -> float:
    return 100 - normalize(value, minimum, maximum)


def calculate_base_priority_breakdown(initiative: dict) -> dict:
    metrics = calculate_metrics(initiative)

    roi_percent = safe_float(metrics.roi_percent, 0.0)
    payback_months = safe_float(metrics.payback_months, 18.0)
    hours_saved = safe_float(metrics.total_hours_saved, 0.0)
    development_hours = safe_float(metrics.development_estimate_hours, 0.0)

    roi_score = normalize(roi_percent, -50, 200)
    payback_score = normalize_inverse(payback_months, 1, 18) if payback_months > 0 else 0.0
    hours_saved_score = normalize(hours_saved, 4, 240)
    # Sem horas estimadas → score 0 (não inflar iniciativas sem dados de custo)
    development_score = normalize_inverse(development_hours, 8, 240) if development_hours > 0 else 0.0

    base_score = (
        roi_score * 0.40
        + payback_score * 0.25
        + hours_saved_score * 0.20
        + development_score * 0.15
    )

    return {
        "roi_score": round(clamp(roi_score, 0, 100), 2),
        "payback_score": round(clamp(payback_score, 0, 100), 2),
        "development_score": round(clamp(development_score, 0, 100), 2),
        "hours_saved_score": round(clamp(hours_saved_score, 0, 100), 2),
        "base_score": round(clamp(base_score, 0, 100), 2),
    }


def build_priority_fields(initiative: dict, aggregated_request_score: float, requests_count: int) -> dict:
    breakdown = calculate_base_priority_breakdown(initiative)
    request_score = round(clamp(safe_float(aggregated_request_score, 0.0), -25, 25), 2)
    final_score = round(clamp(breakdown["base_score"] + request_score, 0, 100), 2)

    breakdown = {
        **breakdown,
        "request_score": request_score,
        "final_score": final_score,
    }

    return {
        "priority_base_score": breakdown["base_score"],
        "priority_request_score": request_score,
        "priority_final_score": final_score,
        "priority_requests_count": int(requests_count or 0),
        "priority_score_breakdown": breakdown,
    }
