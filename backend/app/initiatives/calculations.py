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

    # --- Custos mensais operacionais (OPEX) ---
    maintenance_hours     = _to_float(data.get("maintenance_hours"))
    token_cost            = _to_float(data.get("token_cost"))
    cloud_infra_cost      = _to_float(data.get("cloud_infra_cost"))
    maintenance_cost_monthly = (maintenance_hours * tech_hour_cost) + token_cost + cloud_infra_cost

    # --- Ganho mensal líquido ---
    net_gains_monthly = total_gains - maintenance_cost_monthly

    # --- Investimento Inicial (CAPEX) ---
    development_estimate_hours = _to_float(data.get("development_estimate_seconds")) / 3600
    development_cost = development_estimate_hours * tech_hour_cost
    third_party_hours     = _to_float(data.get("third_party_hours"))
    third_party_hour_cost = _to_float(data.get("third_party_hour_cost"))
    third_party_cost = third_party_hours * third_party_hour_cost
    initial_investment = development_cost + third_party_cost

    # --- ROI da automação (mensal, para priorização) ---
    roi_percent = None
    if initial_investment > 0:
        # Mede quanto da automação se paga a cada mês líquido operado
        roi_percent = round((net_gains_monthly / initial_investment) * 100, 2)

    # --- ROI acumulado real (cresce desde a entrega) ---
    roi_accumulated = None
    resolution_date = data.get("resolution_date")
    # Fallback: usa status_updated_at (data em que moveu para "Concluído") quando resolution_date é nulo
    completion_date = resolution_date or data.get("status_updated_at")
    months_live = _months_since(completion_date)
    if initial_investment > 0 and months_live > 0:
        total_net_gains_so_far = net_gains_monthly * months_live
        roi_accumulated = round(((total_net_gains_so_far - initial_investment) / initial_investment) * 100, 2)
    elif initial_investment > 0 and months_live == 0 and completion_date:
        # Se entregue hoje, o ROI é -100% (investimento feito, zero ganho acumulado ainda)
        roi_accumulated = -100.0

    # --- Payback ---
    payback_months = None
    if net_gains_monthly > 0:
        payback_months = round(initial_investment / net_gains_monthly, 2)

    return CalculatedMetrics(
        total_gains=round(net_gains_monthly, 2),
        total_costs=round(initial_investment, 2),
        roi_percent=roi_percent,
        roi_accumulated=roi_accumulated,
        months_live=round(months_live, 1) if months_live > 0 else (0.0 if completion_date else None),
        total_hours_saved=round(total_hours_saved, 1),
        payback_months=payback_months,
    )
