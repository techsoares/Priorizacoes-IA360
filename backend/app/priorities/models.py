from datetime import datetime

from pydantic import BaseModel, Field


class PriorityRequestCreate(BaseModel):
    initiative_id: str = Field(..., description="ID da iniciativa")
    reason: str = Field(..., min_length=10, description="Motivo principal")
    replace: bool = Field(False, description="Substitui pedido ativo anterior do usuario")


class PriorityRequestStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|archived)$")


class PriorityRequestResponse(BaseModel):
    id: str
    initiative_id: str
    requester_email: str
    requester_name: str | None = None
    reason: str
    status: str
    ai_model: str | None = None
    ai_delta_score: float = 0
    ai_confidence: float | None = None
    ai_rationale: str | None = None
    ai_mode: str | None = None
    ai_payload: dict = Field(default_factory=dict)
    evaluated_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    jira_key: str | None = None
    summary: str | None = None
    priority_final_score: float | None = None
