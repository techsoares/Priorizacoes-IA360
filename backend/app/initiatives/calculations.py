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
    === ESPECIALISTA EM MÉTRICAS DE AUTOMAÇÃO ===

    Fórmulas centrais:

    CAPEX (Investimento One-Time — Custo de Desenvolvimento):
      = (horas_estimadas_dev × custo_hora_dev) + (horas_terceiros × custo_hora_terceiros)
      → Valor de INVESTMENT para pagar (one-time)

    OPEX (Ganhos Mensais Operacionais):
      = (horas_economizadas × custo_hora_pessoa_afetada) + ganhos_headcount + ganhos_produtividade
      → Valor economizado CADA MÊS que a automação opera

    ROI Mensal (para priorização):
      = (OPEX_mensal - custos_manutencao) / CAPEX × 100
      → Quanto do CAPEX se paga a cada mês em ganhos líquidos

    ROI Acumulado Real (progresso desde entrega):
      = (OPEX_mensal × meses_desde_entrega - CAPEX) / CAPEX × 100
      → Quanto já se pagou desde que foi entregue

    Variância de Tempo (eficiência de estimativa):
      = (tempo_real - tempo_estimado) / tempo_estimado × 100
      → Positivo = atrasado, Negativo = adiantado
    """

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 1. OPEX MENSAL (Ganhos — ECONOMIA OPERACIONAL)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    time_saved_per_day        = _to_float(data.get("time_saved_per_day"))
    execution_days_per_month  = _to_float(data.get("execution_days_per_month"))
    affected_people_count     = _to_float(data.get("affected_people_count"))
    cost_per_hour             = _to_float(data.get("cost_per_hour"))

    # Economia em horas = horas_por_dia × dias_mês × pessoas_afetadas
    hours_per_person  = time_saved_per_day * execution_days_per_month
    total_hours_saved = hours_per_person * affected_people_count
    # Valor dessa economia em R$ = horas × custo_hora_pessoa
    gain_hours        = total_hours_saved * cost_per_hour

    # Outros ganhos (headcount, produtividade)
    headcount_reduction   = _to_float(data.get("headcount_reduction"))
    monthly_employee_cost = _to_float(data.get("monthly_employee_cost"))
    productivity_increase = _to_float(data.get("productivity_increase"))
    additional_task_value = _to_float(data.get("additional_task_value"))

    gain_headcount    = headcount_reduction * monthly_employee_cost
    gain_productivity = productivity_increase * additional_task_value
    total_gains_opex  = gain_hours + gain_headcount + gain_productivity

    # Custos operacionais mensais (OPEX a descontar)
    maintenance_hours     = _to_float(data.get("maintenance_hours"))
    tech_hour_cost        = _to_float(data.get("tech_hour_cost"))
    token_cost            = _to_float(data.get("token_cost"))
    cloud_infra_cost      = _to_float(data.get("cloud_infra_cost"))
    maintenance_cost_monthly = (maintenance_hours * tech_hour_cost) + token_cost + cloud_infra_cost

    # OPEX Mensal Líquido = Ganhos - Custos Operacionais
    net_gains_monthly = total_gains_opex - maintenance_cost_monthly

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 2. CAPEX (Investimento One-Time — Custo Puro de Dev)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # CAPEX = (horas_dev × custo_hora_dev) + (horas_terceiros × custo_hora_terceiros)
    development_estimate_seconds = _to_float(data.get("development_estimate_seconds"))
    development_estimate_hours = development_estimate_seconds / 3600

    capex_dev = development_estimate_hours * tech_hour_cost

    third_party_hours     = _to_float(data.get("third_party_hours"))
    third_party_hour_cost = _to_float(data.get("third_party_hour_cost"))
    capex_third_party = third_party_hours * third_party_hour_cost

    total_capex = capex_dev + capex_third_party

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 3. TEMPO DE DESENVOLVIMENTO (Estimado vs Real)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    time_spent_seconds = _to_float(data.get("time_spent_seconds"))
    time_spent_hours = time_spent_seconds / 3600

    # Variância: (real - estimado) / estimado × 100
    # Só calcular se há tempo estimado para dividir
    time_variance_percent = None
    if development_estimate_hours > 0 and time_spent_hours > 0:
        time_variance_percent = round(
            ((time_spent_hours - development_estimate_hours) / development_estimate_hours) * 100,
            1
        )

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 4. ROI MENSAL (Para Priorização)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # ROI Estimado: usa horas estimadas
    roi_percent = None
    if total_capex > 0:
        roi_percent = round((net_gains_monthly / total_capex) * 100, 2)

    # ROI Real: usa horas realmente gastas (apenas se houver registro real)
    roi_percent_real = None
    if time_spent_hours > 0 and development_estimate_hours > 0:
        # CAPEX Real = (tempo_real × custo_hora_dev) + (horas_terceiros × custo_hora_terceiros)
        capex_real = (time_spent_hours * tech_hour_cost) + capex_third_party
        if capex_real > 0:
            roi_percent_real = round((net_gains_monthly / capex_real) * 100, 2)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 5. ROI ACUMULADO (Progresso Real desde Entrega)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Se há tempo real gasto, usa CAPEX real; caso contrário, usa CAPEX estimado
    roi_accumulated = None
    resolution_date = data.get("resolution_date")
    completion_date = resolution_date or data.get("status_updated_at")
    months_live = _months_since(completion_date)

    # Determina qual CAPEX usar para o cálculo acumulado
    capex_for_accumulated = None
    if time_spent_hours > 0:
        # Use CAPEX real (baseado em tempo gasto)
        capex_for_accumulated = (time_spent_hours * tech_hour_cost) + capex_third_party
    else:
        # Use CAPEX estimado (baseado em tempo estimado)
        capex_for_accumulated = total_capex

    if capex_for_accumulated > 0 and months_live > 0:
        total_net_gains_so_far = net_gains_monthly * months_live
        roi_accumulated = round(((total_net_gains_so_far - capex_for_accumulated) / capex_for_accumulated) * 100, 2)
    elif capex_for_accumulated > 0 and months_live == 0 and completion_date:
        roi_accumulated = -100.0

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 6. PAYBACK (Quanto tempo para se pagar)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    payback_months = None
    if net_gains_monthly > 0:
        # Payback usa CAPEX real se disponível, senão usa estimado
        capex_for_payback = capex_for_accumulated if capex_for_accumulated else total_capex
        payback_months = round(capex_for_payback / net_gains_monthly, 2)

    return CalculatedMetrics(
        # Ganhos e Custos
        total_gains=round(net_gains_monthly, 2),
        total_costs=round(total_capex, 2),

        # ROI
        roi_percent=roi_percent,
        roi_percent_real=roi_percent_real,
        roi_accumulated=roi_accumulated,

        # Timeline
        months_live=round(months_live, 1) if months_live > 0 else (0.0 if completion_date else None),
        total_hours_saved=round(total_hours_saved, 1),
        payback_months=payback_months,

        # Tempo de Desenvolvimento
        development_estimate_hours=round(development_estimate_hours, 2),
        time_spent_hours=round(time_spent_hours, 2),
        time_variance_percent=time_variance_percent,

        # CAPEX Breakdown
        capex_development_cost=round(capex_dev, 2),
        capex_third_party_cost=round(capex_third_party, 2),
    )
