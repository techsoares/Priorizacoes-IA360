from datetime import date, datetime

from pydantic import BaseModel, Field


class InitiativeUpdate(BaseModel):
    """Campos editáveis manualmente pelo usuário na tabela."""

    hours_saved: float | None = Field(None, ge=0, description="Horas economizadas por mês")
    cost_per_hour: float | None = Field(None, ge=0, description="Custo médio por hora das pessoas afetadas (R$)")
    headcount_reduction: float | None = Field(None, ge=0, description="Redução de headcount")
    monthly_employee_cost: float | None = Field(None, ge=0, description="Custo mensal por funcionário (R$)")
    productivity_increase: float | None = Field(None, ge=0, description="Aumento de produtividade (tarefas/mês)")
    additional_task_value: float | None = Field(None, ge=0, description="Valor por tarefa adicional (R$)")
    tokens_used: float | None = Field(None, ge=0, description="Tokens consumidos por mês")
    token_cost: float | None = Field(None, ge=0, description="Custo total de token (R$)")
    cloud_infra_cost: float | None = Field(None, ge=0, description="Custo de infra cloud/n8n mensal (R$)")
    maintenance_hours: float | None = Field(None, ge=0, description="Horas de manutenção por mês")
    tech_hour_cost: float | None = Field(None, ge=0, description="Custo por hora do desenvolvedor (R$)")
    third_party_hours: float | None = Field(None, ge=0, description="Horas de terceiros")
    third_party_hour_cost: float | None = Field(None, ge=0, description="Custo por hora de terceiros (R$)")
    estimated_time_months: float | None = Field(None, ge=0, description="Tempo estimado de implementação (meses)")
    tools: str | None = Field(None, description="Ferramentas utilizadas")
    intangible_gains: str | None = Field(None, description="Ganhos intangíveis ou qualitativos da iniciativa")
    affected_people_count: float | None = Field(None, ge=0, description="Quantidade de pessoas afetadas pela automação")


class BulkCostItem(BaseModel):
    """Um item de custo para atualização em lote."""

    jira_key: str = Field(..., description="Chave do Jira (ex: EF-1)")
    cost_per_hour: float | None = Field(None, ge=0)
    tech_hour_cost: float | None = Field(None, ge=0)
    third_party_hours: float | None = Field(None, ge=0)
    third_party_hour_cost: float | None = Field(None, ge=0)
    cloud_infra_cost: float | None = Field(None, ge=0)
    token_cost: float | None = Field(None, ge=0)


class BulkCostRequest(BaseModel):
    """Payload para atualização em lote de custos."""

    items: list[BulkCostItem] = Field(..., description="Lista de custos por jira_key")


class ReorderRequest(BaseModel):
    """Payload para reordenar iniciativas via drag and drop."""

    ordered_ids: list[str] = Field(..., description="Lista de IDs na nova ordem de prioridade")


class CalculatedMetrics(BaseModel):
    """Métricas calculadas automaticamente."""

    total_gains: float = Field(0, description="Ganhos totais mensais (R$)")
    total_costs: float = Field(0, description="Custos totais do investimento (R$)")
    roi_percent: float | None = Field(None, description="ROI da automação (%) — ganho mensal vs investimento")
    roi_accumulated: float | None = Field(None, description="ROI acumulado real (%) — cresce desde a entrega")
    months_live: float | None = Field(None, description="Meses desde a entrega (resolution_date)")
    total_hours_saved: float = Field(0, description="Total de horas economizadas por mês (considerando pessoas afetadas)")
    payback_months: float | None = Field(None, description="Payback (meses) — None se ganhos = 0")


class InitiativeResponse(BaseModel):
    """Resposta completa de uma iniciativa."""

    id: str
    jira_key: str
    jira_url: str | None = None
    summary: str

    project_key: str | None = None
    project_name: str | None = None
    cost_center: str | None = None
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
    third_party_hours: float = 0
    third_party_hour_cost: float = 0
    estimated_time_months: float = 0
    tools: str | None = None
    intangible_gains: str | None = None

    metrics: CalculatedMetrics = CalculatedMetrics()

    created_at: datetime | None = None
    updated_at: datetime | None = None
