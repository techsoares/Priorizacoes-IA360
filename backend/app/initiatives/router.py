from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.config import settings
from app.database.supabase_client import get_supabase_client
from app.initiatives.calculations import calculate_metrics
from app.initiatives.models import BulkCostRequest, InitiativeResponse, InitiativeUpdate, ReorderRequest
from app.jira.service import fetch_jira_issues
from app.priorities.scoring import build_priority_fields

router = APIRouter(prefix="/api/initiatives", tags=["initiatives"])


def _monthly_time_saved_hours_per_person(issue: dict) -> float:
    """Horas economizadas por pessoa por mês (sem multiplicar por qtd de pessoas)."""
    return round(
        (issue.get("time_saved_per_day") or 0)
        * (issue.get("execution_days_per_month") or 0),
        2,
    )


def _format_sync_error(exc: Exception) -> str:
    message = str(exc)
    lowered = message.lower()

    if "column" in lowered and "initiatives" in lowered:
        return (
            "Erro ao sincronizar com Jira: o banco Supabase ainda não tem todas as colunas novas. "
            "Aplique as migrations mais recentes antes de sincronizar."
        )

    if "schema cache" in lowered or "could not find the" in lowered:
        return (
            "Erro ao sincronizar com Jira: o Supabase não reconhece os campos novos da tabela. "
            "Aplique as migrations e atualize o schema cache."
        )

    if message:
        return f"Erro ao sincronizar com Jira: {message}"

    return "Erro ao sincronizar com Jira."


def _enrich_with_metrics(row: dict) -> InitiativeResponse:
    """Adiciona métricas calculadas e defaults derivados a um registro do banco."""
    enriched = {**row}
    if not enriched.get("jira_url") and enriched.get("jira_key"):
        enriched["jira_url"] = f"{settings.jira_base_url}/browse/{enriched['jira_key']}"
    metrics = calculate_metrics(enriched)
    return InitiativeResponse(**enriched, metrics=metrics)


def _refresh_priority_scores(supabase, initiative_id: str) -> dict:
    initiative = (
        supabase.table("initiatives")
        .select("*")
        .eq("id", initiative_id)
        .single()
        .execute()
    )
    if not initiative.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Iniciativa nao encontrada.",
        )

    active_requests = (
        supabase.table("priority_requests")
        .select("ai_delta_score")
        .eq("initiative_id", initiative_id)
        .eq("status", "active")
        .execute()
    )
    active_rows = active_requests.data or []
    aggregated_request_score = sum(float(row.get("ai_delta_score") or 0) for row in active_rows)
    priority_fields = build_priority_fields(initiative.data, aggregated_request_score, len(active_rows))
    priority_fields["priority_score_updated_at"] = datetime.now(timezone.utc).isoformat()

    updated = (
        supabase.table("initiatives")
        .update(priority_fields)
        .eq("id", initiative_id)
        .execute()
    )
    return updated.data[0] if updated.data else {**initiative.data, **priority_fields}


@router.get("/", response_model=list[InitiativeResponse])
async def list_initiatives(user: dict = Depends(get_current_user)):
    """Lista todas as iniciativas ordenadas por prioridade."""
    supabase = get_supabase_client()
    result = (
        supabase.table("initiatives")
        .select("*")
        .order("priority_order", desc=False)
        .execute()
    )
    return [_enrich_with_metrics(row) for row in result.data]


@router.post("/sync-jira", response_model=list[InitiativeResponse])
async def sync_from_jira(user: dict = Depends(get_current_user)):
    """
    Sincroniza issues do Jira com o banco.
    - Issues novas são inseridas com a próxima prioridade disponível.
    - Issues existentes têm dados do Jira atualizados sem sobrescrever campos manuais.
    """
    try:
        supabase = get_supabase_client()
        jira_issues = await fetch_jira_issues()

        existing = supabase.table("initiatives").select("*").execute()
        existing_rows = existing.data or []
        existing_keys = {row["jira_key"]: row["id"] for row in existing_rows}
        existing_rows_by_key = {row["jira_key"]: row for row in existing_rows}

        active_requests = (
            supabase.table("priority_requests")
            .select("initiative_id, ai_delta_score")
            .eq("status", "active")
            .execute()
        )
        request_totals = {}
        request_counts = {}
        for row in active_requests.data or []:
            initiative_id = row.get("initiative_id")
            if not initiative_id:
                continue
            request_totals[initiative_id] = request_totals.get(initiative_id, 0) + float(row.get("ai_delta_score") or 0)
            request_counts[initiative_id] = request_counts.get(initiative_id, 0) + 1

        max_order_result = (
            supabase.table("initiatives")
            .select("priority_order")
            .order("priority_order", desc=True)
            .limit(1)
            .execute()
        )
        next_order = (max_order_result.data[0]["priority_order"] + 1) if max_order_result.data else 1

        jira_fields = [
            "jira_url",
            "summary",
            "project_key",
            "project_name",
            "cost_center",
            "cost_center_responsible",
            "category",
            "item_type",
            "gain_type",
            "gain",
            "activity_type",
            "tool",
            "jira_status",
            "jira_priority",
            "assignee",
            "assignee_email",
            "assignee_avatar_url",
            "jira_description",
            "start_date",
            "due_date",
            "status_updated_at",
            "resolution_date",
            "jira_created_at",
            "jira_updated_at",
            "time_saved_per_day",
            "affected_people_count",
            "execution_days_per_month",
            "development_estimate_seconds",
            "time_spent_seconds",
        ]

        score_updated_at = datetime.now(timezone.utc).isoformat()

        for issue in jira_issues:
            sync_data = {field: issue.get(field) for field in jira_fields}
            sync_data["jira_key"] = issue["jira_key"]

            # Campos do dashboard que podem ser derivados do Jira
            sync_data["hours_saved"] = _monthly_time_saved_hours_per_person(issue)
            sync_data["headcount_reduction"] = issue.get("affected_people_count", 0)
            sync_data["tools"] = issue.get("tool", "")

            initiative_id = existing_keys.get(issue["jira_key"])
            score_source = {**(existing_rows_by_key.get(issue["jira_key"]) or {}), **sync_data}
            sync_data.update(
                build_priority_fields(
                    score_source,
                    request_totals.get(initiative_id, 0) if initiative_id else 0,
                    request_counts.get(initiative_id, 0) if initiative_id else 0,
                )
            )
            sync_data["priority_score_updated_at"] = score_updated_at

            if issue["jira_key"] in existing_keys:
                supabase.table("initiatives").update(sync_data).eq("jira_key", issue["jira_key"]).execute()
            else:
                supabase.table("initiatives").insert({
                    **sync_data,
                    "priority_order": next_order,
                }).execute()
                next_order += 1

        result = (
            supabase.table("initiatives")
            .select("*")
            .order("priority_order", desc=False)
            .execute()
        )
        return [_enrich_with_metrics(row) for row in result.data]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=_format_sync_error(exc),
        ) from exc


@router.put("/{initiative_id}", response_model=InitiativeResponse)
async def update_initiative(
    initiative_id: str,
    payload: InitiativeUpdate,
    user: dict = Depends(get_current_user),
):
    """Atualiza campos manuais (financeiros) de uma iniciativa."""
    supabase = get_supabase_client()

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum campo para atualizar.",
        )

    result = (
        supabase.table("initiatives")
        .update(update_data)
        .eq("id", initiative_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Iniciativa não encontrada.",
        )

    refreshed = _refresh_priority_scores(supabase, initiative_id)
    return _enrich_with_metrics(refreshed)


@router.post("/bulk-costs")
async def bulk_update_costs(
    payload: BulkCostRequest,
    user: dict = Depends(get_current_user),
):
    """Atualiza custos em lote por jira_key."""
    supabase = get_supabase_client()
    updated = 0

    for item in payload.items:
        update_data = item.model_dump(exclude_none=True, exclude={"jira_key"})
        if not update_data:
            continue
        result = (
            supabase.table("initiatives")
            .update(update_data)
            .eq("jira_key", item.jira_key)
            .execute()
        )
        if result.data:
            _refresh_priority_scores(supabase, result.data[0]["id"])
            updated += 1

    return {"message": f"Custos atualizados para {updated} iniciativas.", "count": updated}


@router.patch("/reorder")
async def reorder_initiatives(
    payload: ReorderRequest,
    user: dict = Depends(get_current_user),
):
    """Atualiza a ordem de prioridade de todas as iniciativas."""
    supabase = get_supabase_client()

    for index, initiative_id in enumerate(payload.ordered_ids, start=1):
        supabase.table("initiatives").update(
            {"priority_order": index}
        ).eq("id", initiative_id).execute()

    return {"message": "Ordem atualizada com sucesso.", "count": len(payload.ordered_ids)}


@router.post("/recalculate-scores")
async def recalculate_all_scores(user: dict = Depends(get_current_user)):
    """Recalcula e persiste priority_base_score/final_score para todas as iniciativas."""
    supabase = get_supabase_client()

    result = supabase.table("initiatives").select("id").execute()
    ids = [row["id"] for row in (result.data or [])]

    updated = 0
    errors = []
    for initiative_id in ids:
        try:
            _refresh_priority_scores(supabase, initiative_id)
            updated += 1
        except Exception as exc:
            errors.append({"id": initiative_id, "error": str(exc)})

    return {"message": f"Scores recalculados para {updated} iniciativas.", "count": updated, "errors": errors}
