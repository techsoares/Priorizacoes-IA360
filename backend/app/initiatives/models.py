from pydantic import BaseModel, Field
from datetime import datetime


# --- Schemas de entrada ---

class InitiativeUpdate(BaseModel):
    """Campos editáveis manualmente pelo usuário na tabela."""
    hours_saved: float | None = Field(None, ge=0, description="Horas economizadas por mês")
    cost_per_hour: float | None = Field(None, ge=0, description="Custo por hora (R$)")
    headcount_reduction: float | None = Field(None, ge=0, description="Redução de headcount")
    monthly_employee_cost: float | None = Field(None, ge=0, description="Custo mensal por funcionário (R$)")
    productivity_increase: float | None = Field(None, ge=0, description="Aumento de produtividade (tarefas/mês)")
    additional_task_value: float | None = Field(None, ge=0, description="Valor por tarefa adicional (R$)")
    tokens_used: float | None = Field(None, ge=0, description="Tokens consumidos por mês")
    token_cost: float | None = Field(None, ge=0, description="Custo por token (R$)")
    cloud_infra_cost: float | None = Field(None, ge=0, description="Custo de infra cloud/n8n mensal (R$)")
    maintenance_hours: float | None = Field(None, ge=0, description="Horas de manutenção por mês")
    tech_hour_cost: float | None = Field(None, ge=0, description="Custo hora técnico (R$)")
    estimated_time_months: float | None = Field(None, ge=0, description="Tempo estimado de implementação (meses)")
    tools: str | None = Field(None, description="Ferramentas utilizadas")


class ReorderRequest(BaseModel):
    """Payload para reordenar iniciativas via drag and drop."""
    ordered_ids: list[str] = Field(..., description="Lista de IDs na nova ordem de prioridade")


# --- Schemas de saída ---

class CalculatedMetrics(BaseModel):
    """Métricas calculadas automaticamente."""
    total_gains: float = Field(0, description="Ganhos totais mensais (R$)")
    total_costs: float = Field(0, description="Custos totais mensais (R$)")
    roi_percent: float | None = Field(None, description="ROI (%) — None se custos = 0")
    payback_months: float | None = Field(None, description="Payback (meses) — None se ganhos = 0")


class InitiativeResponse(BaseModel):
    """Resposta completa de uma iniciativa."""
    id: str
    jira_key: str
    summary: str
    cost_center: str | None = None
    jira_status: str | None = None
    assignee: str | None = None
    priority_order: int

    # Campos manuais
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
    estimated_time_months: float = 0
    tools: str | None = None

    # Calculados
    metrics: CalculatedMetrics = CalculatedMetrics()

    created_at: datetime | None = None
    updated_at: datetime | None = None
