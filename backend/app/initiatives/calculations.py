from datetime import date, datetime
from app.initiatives.models import CalculatedMetrics


def _to_float(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _months_since(dt) -> float:
    """Meses decorridos desde uma data até hoje."""
    if not dt:
        return 0.0
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except Exception:
            return 0.0
    if isinstance(dt, datetime):
        dt = dt.date()
    delta = date.today() - dt
    return max(0.0, delta.days / 30.44)


def calculate_metrics(data: dict) -> CalculatedMetrics:
    """
    ROI da automação  = (ganhos_mensais - custos) / custos × 100
      → Mede se o ganho de UM mês já cobre o investimento. Útil para priorização.

    ROI acumulado real = (ganhos_mensais × meses_desde_entrega - custos) / custos × 100
      → Cresce mês a mês desde a resolution_date. Reflete o retorno já realizado.

    Payback = custos / ganhos_mensais  (em meses)
    """

    # --- Economia mensal ---
    time_saved_per_day        = _to_float(data.get("time_saved_per_day"))
    execution_days_per_month  = _to_float(data.get("execution_days_per_month"))
    affected_people_count     = _to_float(data.get("affected_people_count"))
    cost_per_hour             = _to_float(data.get("cost_per_hour"))

    hours_per_person  = time_saved_per_day * execution_days_per_month
    total_hours_saved = hours_per_person * affected_people_count
    gain_hours        = total_hours_saved * cost_per_hour

    headcount_reduction   = _to_float(data.get("headcount_reduction"))
    monthly_employee_cost = _to_float(data.get("monthly_employee_cost"))
    productivity_increase = _to_float(data.get("productivity_increase"))
    additional_task_value = _to_float(data.get("additional_task_value"))

    gain_headcount    = headcount_reduction * monthly_employee_cost
    gain_productivity = productivity_increase * additional_task_value
    total_gains       = gain_hours + gain_headcount + gain_productivity

    # --- Custos (investimento único) ---
    development_estimate_hours = _to_float(data.get("development_estimate_seconds")) / 3600
    tech_hour_cost             = _to_float(data.get("tech_hour_cost"))
    third_party_hours          = _to_float(data.get("third_party_hours"))
    third_party_hour_cost      = _to_float(data.get("third_party_hour_cost"))
    token_cost                 = _to_float(data.get("token_cost"))
    cloud_infra_cost           = _to_float(data.get("cloud_infra_cost"))

    development_cost = development_estimate_hours * tech_hour_cost
    third_party_cost = third_party_hours * third_party_hour_cost
    total_costs      = development_cost + third_party_cost + token_cost + cloud_infra_cost

    # --- ROI da automação (mensal, para priorização) ---
    roi_percent = None
    if total_costs > 0:
        roi_percent = round(((total_gains - total_costs) / total_costs) * 100, 2)

    # --- ROI acumulado real (cresce desde a entrega) ---
    roi_accumulated = None
    resolution_date = data.get("resolution_date")
    months_live = _months_since(resolution_date)
    if total_costs > 0 and months_live > 0:
        accumulated_gains = total_gains * months_live
        roi_accumulated = round(((accumulated_gains - total_costs) / total_costs) * 100, 2)

    # --- Payback ---
    payback_months = None
    if total_gains > 0:
        payback_months = round(total_costs / total_gains, 2)

    return CalculatedMetrics(
        total_gains=round(total_gains, 2),
        total_costs=round(total_costs, 2),
        roi_percent=roi_percent,
        roi_accumulated=roi_accumulated,
        months_live=round(months_live, 1) if months_live > 0 else None,
        total_hours_saved=round(total_hours_saved, 1),
        payback_months=payback_months,
    )
