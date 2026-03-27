from app.initiatives.models import CalculatedMetrics


def calculate_metrics(data: dict) -> CalculatedMetrics:
    """
    Calcula Ganhos, Custos, ROI e Payback de uma iniciativa.

    Fórmulas:
    - Ganhos = (horas_economizadas × custo_hora)
              + (redução_headcount × custo_mensal_funcionário)
              + (aumento_produtividade × valor_tarefa_adicional)

    - Custos = (tokens_usados × custo_token)
              + custo_infra_cloud
              + (horas_manutenção × custo_hora_técnico)

    - ROI (%) = ((Ganhos - Custos) / Custos) × 100
    - Payback (meses) = Custos / (Ganhos / 12)  →  equivale a Custos × 12 / Ganhos
    """

    # Ganhos mensais
    gain_hours = (data.get("hours_saved") or 0) * (data.get("cost_per_hour") or 0)
    gain_headcount = (data.get("headcount_reduction") or 0) * (data.get("monthly_employee_cost") or 0)
    gain_productivity = (data.get("productivity_increase") or 0) * (data.get("additional_task_value") or 0)
    total_gains = gain_hours + gain_headcount + gain_productivity

    # Custos mensais
    cost_tokens = (data.get("tokens_used") or 0) * (data.get("token_cost") or 0)
    cost_infra = data.get("cloud_infra_cost") or 0
    cost_maintenance = (data.get("maintenance_hours") or 0) * (data.get("tech_hour_cost") or 0)
    total_costs = cost_tokens + cost_infra + cost_maintenance

    # ROI — protege contra divisão por zero
    roi_percent = None
    if total_costs > 0:
        roi_percent = round(((total_gains - total_costs) / total_costs) * 100, 2)

    # Payback — protege contra ganhos zero
    payback_months = None
    if total_gains > 0:
        payback_months = round((total_costs * 12) / total_gains, 2)

    return CalculatedMetrics(
        total_gains=round(total_gains, 2),
        total_costs=round(total_costs, 2),
        roi_percent=roi_percent,
        payback_months=payback_months,
    )
