from app.initiatives.models import CalculatedMetrics


def _to_float(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def calculate_metrics(data: dict) -> CalculatedMetrics:
    """
    Calcula ganhos, custos, ROI (anual) e payback.

    Economia mensal:
      horas_por_pessoa = time_saved_per_day × execution_days_per_month
      horas_totais     = horas_por_pessoa × affected_people_count
      ganho_mensal      = horas_totais × cost_per_hour

    Custos (investimento único):
      dev  = (development_estimate_seconds / 3600) × tech_hour_cost
      terc = third_party_hours × third_party_hour_cost
      total_costs = dev + terc + token_cost + cloud_infra_cost

    ROI anual  = ((ganho_mensal × 12) − total_costs) / total_costs × 100
    Payback    = total_costs / ganho_mensal  (em meses)
    """

    # --- Economia (por pessoa, por mês) ---
    time_saved_per_day = _to_float(data.get("time_saved_per_day"))
    execution_days_per_month = _to_float(data.get("execution_days_per_month"))
    affected_people_count = _to_float(data.get("affected_people_count"))
    cost_per_hour = _to_float(data.get("cost_per_hour"))

    hours_per_person = time_saved_per_day * execution_days_per_month
    total_hours_saved = hours_per_person * affected_people_count
    gain_hours = total_hours_saved * cost_per_hour

    # --- Ganhos complementares (headcount / produtividade) ---
    headcount_reduction = _to_float(data.get("headcount_reduction"))
    monthly_employee_cost = _to_float(data.get("monthly_employee_cost"))
    productivity_increase = _to_float(data.get("productivity_increase"))
    additional_task_value = _to_float(data.get("additional_task_value"))

    gain_headcount = headcount_reduction * monthly_employee_cost
    gain_productivity = productivity_increase * additional_task_value

    total_gains = gain_hours + gain_headcount + gain_productivity

    # --- Custos (investimento) ---
    development_estimate_hours = _to_float(data.get("development_estimate_seconds")) / 3600
    tech_hour_cost = _to_float(data.get("tech_hour_cost"))
    third_party_hours = _to_float(data.get("third_party_hours"))
    third_party_hour_cost = _to_float(data.get("third_party_hour_cost"))
    token_cost = _to_float(data.get("token_cost"))
    cloud_infra_cost = _to_float(data.get("cloud_infra_cost"))

    development_cost = development_estimate_hours * tech_hour_cost
    third_party_cost = third_party_hours * third_party_hour_cost
    total_costs = development_cost + third_party_cost + token_cost + cloud_infra_cost

    # --- ROI anual e Payback ---
    annual_gains = total_gains * 12

    roi_percent = None
    if total_costs > 0:
        roi_percent = round(((annual_gains - total_costs) / total_costs) * 100, 2)

    payback_months = None
    if total_gains > 0:
        payback_months = round(total_costs / total_gains, 2)

    return CalculatedMetrics(
        total_gains=round(total_gains, 2),
        total_costs=round(total_costs, 2),
        roi_percent=roi_percent,
        payback_months=payback_months,
    )
