import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.admins import require_admin
from app.auth.dependencies import get_current_user
from app.database.supabase_client import get_supabase_client
from app.initiatives.calculations import calculate_metrics
from app.initiatives.models import InitiativeResponse
from app.priorities.ai import evaluate_priority_request, local_priority_evaluation
from app.priorities.models import (
    PriorityRequestCreate,
    PriorityRequestResponse,
    PriorityRequestStatusUpdate,
)
from app.priorities.scoring import build_priority_fields

router = APIRouter(prefix="/api/priorities", tags=["priorities"])


def get_profile_name(email: str) -> str:
    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("profiles")
            .select("full_name")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0].get("full_name") or ""
    except Exception:
        return ""
    return ""


def get_initiative_or_404(initiative_id: str) -> dict:
    supabase = get_supabase_client()
    result = (
        supabase.table("initiatives")
        .select("*")
        .eq("id", initiative_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Iniciativa não encontrada.",
        )
    return result.data


def get_request_or_404(request_id: str) -> dict:
    supabase = get_supabase_client()
    result = (
        supabase.table("priority_requests")
        .select("*")
        .eq("id", request_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido de prioridade não encontrado.",
        )
    return result.data


def serialize_request(request_row: dict, initiatives_by_id: dict[str, dict]) -> PriorityRequestResponse:
    initiative = initiatives_by_id.get(request_row.get("initiative_id"), {})
    return PriorityRequestResponse(
        **request_row,
        jira_key=initiative.get("jira_key"),
        summary=initiative.get("summary"),
        priority_final_score=initiative.get("priority_final_score"),
    )


def active_requests_for_initiative(initiative_id: str) -> list[dict]:
    supabase = get_supabase_client()
    result = (
        supabase.table("priority_requests")
        .select("*")
        .eq("initiative_id", initiative_id)
        .eq("status", "active")
        .execute()
    )
    return result.data or []


def refresh_initiative_priority_scores(initiative_id: str, initiative: dict | None = None) -> dict:
    supabase = get_supabase_client()
    initiative = initiative or get_initiative_or_404(initiative_id)
    active_requests = active_requests_for_initiative(initiative_id)
    aggregated_request_score = sum(float(item.get("ai_delta_score") or 0) for item in active_requests)
    priority_fields = build_priority_fields(initiative, aggregated_request_score, len(active_requests))
    priority_fields["priority_score_updated_at"] = datetime.now(timezone.utc).isoformat()

    updated = (
        supabase.table("initiatives")
        .update(priority_fields)
        .eq("id", initiative_id)
        .execute()
    )
    return updated.data[0] if updated.data else {**initiative, **priority_fields}


async def evaluate_request_for_initiative(initiative: dict, reason: str) -> dict:
    metrics = calculate_metrics(initiative)
    breakdown = initiative.get("priority_score_breakdown") or {}
    payload = {
        "jira_key": initiative.get("jira_key"),
        "summary": initiative.get("summary"),
        "priority_base_score": initiative.get("priority_base_score") or breakdown.get("base_score") or 0,
        "roi_percent": metrics.roi_percent,
        "payback_months": metrics.payback_months,
        "development_estimate_hours": metrics.development_estimate_hours,
        "hours_saved_month": metrics.total_hours_saved,
        "reason": reason,
    }
    return await evaluate_priority_request(payload)


@router.get("/requests", response_model=list[PriorityRequestResponse])
async def list_priority_requests(_user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    requests_result = (
        supabase.table("priority_requests")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    request_rows = requests_result.data or []
    initiative_ids = list({row.get("initiative_id") for row in request_rows if row.get("initiative_id")})

    initiatives_by_id = {}
    if initiative_ids:
        initiatives_result = (
            supabase.table("initiatives")
            .select("id, jira_key, summary, priority_final_score")
            .in_("id", initiative_ids)
            .execute()
        )
        initiatives_by_id = {row["id"]: row for row in (initiatives_result.data or [])}

    return [serialize_request(row, initiatives_by_id) for row in request_rows]


@router.post("/requests")
async def create_priority_request(
    payload: PriorityRequestCreate,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase_client()
    initiative = get_initiative_or_404(payload.initiative_id)
    requester_email = user["email"].lower().strip()
    requester_name = (
        user.get("full_name")
        or get_profile_name(requester_email)
        or requester_email.split("@")[0]
    )

    existing = (
        supabase.table("priority_requests")
        .select("id, status")
        .eq("initiative_id", payload.initiative_id)
        .eq("requester_email", requester_email)
        .limit(1)
        .execute()
    )
    existing_row = existing.data[0] if existing.data else None
    if existing_row and existing_row.get("status") == "active" and not payload.replace:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já possui um pedido ativo para esta iniciativa.",
        )

    try:
        evaluation = await asyncio.wait_for(
            evaluate_request_for_initiative(initiative, payload.reason.strip()),
            timeout=6.0,
        )
    except Exception:
        evaluation = local_priority_evaluation(payload.reason.strip())
    now = datetime.now(timezone.utc).isoformat()

    upsert_data = {
        "initiative_id": payload.initiative_id,
        "requester_email": requester_email,
        "requester_name": requester_name,
        "reason": payload.reason.strip(),
        "status": "active",
        "ai_model": evaluation["model"],
        "ai_delta_score": evaluation["delta_score"],
        "ai_confidence": evaluation["confidence"],
        "ai_rationale": evaluation["rationale"],
        "ai_mode": evaluation["mode"],
        "ai_payload": evaluation["raw"],
        "evaluated_at": now,
        "updated_at": now,
    }

    upsert_result = supabase.table("priority_requests").upsert(
        upsert_data,
        on_conflict="initiative_id,requester_email",
    ).execute()

    saved_request = upsert_result.data[0] if upsert_result.data else None
    if not saved_request:
        request_result = (
            supabase.table("priority_requests")
            .select("*")
            .eq("initiative_id", payload.initiative_id)
            .eq("requester_email", requester_email)
            .single()
            .execute()
        )
        saved_request = request_result.data

    if not saved_request:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível recuperar o pedido após salvar.",
        )

    updated_initiative = refresh_initiative_priority_scores(payload.initiative_id, initiative=initiative)
    return {
        "request": serialize_request(
            saved_request,
            {updated_initiative["id"]: updated_initiative},
        ).model_dump(),
        "initiative": updated_initiative,
    }


@router.delete("/requests/{request_id}", status_code=status.HTTP_200_OK)
async def delete_priority_request(
    request_id: str,
    user: dict = Depends(get_current_user),
):
    require_admin(user)
    supabase = get_supabase_client()
    request_row = get_request_or_404(request_id)
    initiative_id = request_row["initiative_id"]

    supabase.table("priority_requests").delete().eq("id", request_id).execute()
    updated_initiative = refresh_initiative_priority_scores(initiative_id)
    return {"initiative": updated_initiative}


@router.patch("/requests/{request_id}/status")
async def update_priority_request_status(
    request_id: str,
    payload: PriorityRequestStatusUpdate,
    user: dict = Depends(get_current_user),
):
    require_admin(user)
    supabase = get_supabase_client()
    request_row = get_request_or_404(request_id)

    updated_request = (
        supabase.table("priority_requests")
        .update({"status": payload.status})
        .eq("id", request_id)
        .execute()
    ).data[0]
    updated_initiative = refresh_initiative_priority_scores(request_row["initiative_id"])

    return {
        "request": serialize_request(
            updated_request,
            {updated_initiative["id"]: updated_initiative},
        ).model_dump(),
        "initiative": updated_initiative,
    }


@router.post("/requests/{request_id}/re-evaluate")
async def reevaluate_priority_request(
    request_id: str,
    user: dict = Depends(get_current_user),
):
    require_admin(user)
    supabase = get_supabase_client()
    request_row = get_request_or_404(request_id)
    initiative = get_initiative_or_404(request_row["initiative_id"])

    evaluation = await evaluate_request_for_initiative(initiative, request_row.get("reason", ""))
    updated_request = (
        supabase.table("priority_requests")
        .update({
            "ai_model": evaluation["model"],
            "ai_delta_score": evaluation["delta_score"],
            "ai_confidence": evaluation["confidence"],
            "ai_rationale": evaluation["rationale"],
            "ai_mode": evaluation["mode"],
            "ai_payload": evaluation["raw"],
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", request_id)
        .execute()
    ).data[0]
    updated_initiative = refresh_initiative_priority_scores(request_row["initiative_id"])

    return {
        "request": serialize_request(
            updated_request,
            {updated_initiative["id"]: updated_initiative},
        ).model_dump(),
        "initiative": updated_initiative,
    }


@router.post("/recalculate-initiative/{initiative_id}", response_model=InitiativeResponse)
async def recalculate_initiative_priority(
    initiative_id: str,
    user: dict = Depends(get_current_user),
):
    require_admin(user)
    updated_initiative = refresh_initiative_priority_scores(initiative_id)
    return InitiativeResponse(**updated_initiative)
