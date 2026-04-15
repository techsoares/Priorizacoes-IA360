from datetime import date, datetime

from pydantic import BaseModel, Field


class InitiativeUpdate(BaseModel):
    """Campos editaveis manualmente pelo usuario na tabela."""

    hours_saved: float | None = Field(None, ge=0, description="Horas economizadas por mes")
    cost_per_hour: float | None = Field(None, ge=0, description="Custo medio por hora das pessoas afetadas (R$)")
    headcount_reduction: float | None = Field(None, ge=0, description="Reducao de headcount")
    monthly_employee_cost: float | None = Field(None, ge=0, description="Custo mensal por funcionario (R$)")
    productivity_increase: float | None = Field(None, ge=0, description="Aumento de produtividade (tarefas/mes)")
    additional_task_value: float | None = Field(None, ge=0, description="Valor por tarefa adicional (R$)")
    tokens_used: float | None = Field(None, ge=0, description="Tokens consumidos por mes")
    token_cost: float | None = Field(None, ge=0, description="Custo total de token (R$)")
    cloud_infra_cost: float | None = Field(None, ge=0, description="Custo de infra cloud/n8n mensal (R$)")
    maintenance_hours: float | None = Field(None, ge=0, description="Horas de manutencao por mes")
    tech_hour_cost: float | None = Field(None, ge=0, description="Custo por hora do desenvolvedor (R$)")
    devops_hours: float | None = Field(None, ge=0, description="Horas de DevOps para colocar a iniciativa no ar")
    devops_hour_cost: float | None = Field(None, ge=0, description="Custo por hora de DevOps (R$)")
    third_party_hours: float | None = Field(None, ge=0, description="Horas de terceiros")
    third_party_hour_cost: float | None = Field(None, ge=0, description="Custo por hora de terceiros (R$)")
    estimated_time_months: float | None = Field(None, ge=0, description="Tempo estimado de implementacao (meses)")
    tools: str | None = Field(None, description="Ferramentas utilizadas")
    intangible_gains: str | None = Field(None, description="Ganhos intangiveis ou qualitativos da iniciativa")
    affected_people_count: float | None = Field(None, ge=0, description="Quantidade de pessoas afetadas pela automacao")


class BulkCostItem(BaseModel):
    """Um item de custo para atualizacao em lote."""

    jira_key: str = Field(..., description="Chave do Jira (ex: EF-1)")
    cost_per_hour: float | None = Field(None, ge=0)
    tech_hour_cost: float | None = Field(None, ge=0)
    devops_hours: float | None = Field(None, ge=0)
    devops_hour_cost: float | None = Field(None, ge=0)
    third_party_hours: float | None = Field(None, ge=0)
    third_party_hour_cost: float | None = Field(None, ge=0)
    cloud_infra_cost: float | None = Field(None, ge=0)
    token_cost: float | None = Field(None, ge=0)


class BulkCostRequest(BaseModel):
    """Payload para atualizacao em lote de custos."""

    items: list[BulkCostItem] = Field(..., description="Lista de custos por jira_key")


class ReorderRequest(BaseModel):
    """Payload para reordenar iniciativas via drag and drop."""

    ordered_ids: list[str] = Field(..., description="Lista de IDs na nova ordem de prioridade")


class CalculatedMetrics(BaseModel):
    """Metricas calculadas automaticamente."""

    total_gains: float = Field(0, description="Ganhos OPEX totais mensais (R$)")
    total_costs: float = Field(0, description="Custos CAPEX totais do investimento (R$)")

    roi_percent: float | None = Field(None, description="ROI estimado (%) baseado em tempo estimado")
    roi_percent_real: float | None = Field(None, description="ROI real (%) baseado em tempo real gasto")
    roi_accumulated: float | None = Field(None, description="ROI acumulado real (%) desde a entrega")

    months_live: float | None = Field(None, description="Meses desde a entrega (resolution_date)")
    total_hours_saved: float = Field(0, description="Total de horas economizadas por mes")
    payback_months: float | None = Field(None, description="Payback (meses)")

    development_estimate_hours: float = Field(0, description="Tempo estimado de desenvolvimento (horas)")
    time_spent_hours: float = Field(0, description="Tempo real gasto em desenvolvimento (horas)")
    time_variance_percent: float | None = Field(None, description="Variancia de tempo (%)")

    capex_development_cost: float = Field(0, description="CAPEX puro de desenvolvimento (R$)")
    capex_devops_cost: float = Field(0, description="CAPEX de DevOps (R$)")
    capex_third_party_cost: float = Field(0, description="CAPEX de terceiros (R$)")


class InitiativeResponse(BaseModel):
    """Resposta completa de uma iniciativa."""

    id: str
    jira_key: str
    jira_url: str | None = None
    summary: str

    project_key: str | None = None
    project_name: str | None = None
    cost_center: str | None = None
    cost_center_responsible: str | None = None
    category: str | None = None
    item_type: str | None = None
    gain_type: str | None = None
    gain: str | None = None
    activity_type: str | None = None
    tool: str | None = None
    jira_status: str | None = None
    jira_priority: str | None = None
    assignee: str | None = None
    assignee_email: str | None = None
    assignee_avatar_url: str | None = None
    priority_order: int
    priority_base_score: float = 0
    priority_request_score: float = 0
    priority_final_score: float = 0
    priority_requests_count: int = 0
    priority_score_breakdown: dict = Field(default_factory=dict)

    jira_description: str | None = None
    start_date: date | None = None
    due_date: date | None = None
    status_updated_at: datetime | None = None
    resolution_date: datetime | None = None
    jira_created_at: datetime | None = None
    jira_updated_at: datetime | None = None

    time_saved_per_day: float = 0
    affected_people_count: float = 0
    execution_days_per_month: float = 0
    development_estimate_seconds: float = 0
    time_spent_seconds: float = 0

    hours_saved: float = 0
    cost_per_hour: float = 0
    headcount_reduction: float = 0
    monthly_employee_cost: float = 0
    productivity_increase: float = 0
    additional_task_value: float = 0
    tokens_used: float = 0
    token_cost: float = 0
    cloud_infra_cost: float = 0
    maintenance_hours: float = 0
    tech_hour_cost: float = 0
    devops_hours: float = 0
    devops_hour_cost: float = 0
    third_party_hours: float = 0
    third_party_hour_cost: float = 0
    estimated_time_months: float = 0
    tools: str | None = None
    intangible_gains: str | None = None

    metrics: CalculatedMetrics = CalculatedMetrics()

    created_at: datetime | None = None
    updated_at: datetime | None = None
    priority_score_updated_at: datetime | None = None
