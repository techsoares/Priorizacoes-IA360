from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.database.supabase_client import get_supabase_client
from app.initiatives.models import (
    InitiativeUpdate,
    InitiativeResponse,
    ReorderRequest,
)
from app.initiatives.calculations import calculate_metrics
from app.jira.service import fetch_jira_issues

router = APIRouter(prefix="/api/initiatives", tags=["initiatives"])


def _enrich_with_metrics(row: dict) -> InitiativeResponse:
    """Adiciona métricas calculadas a um registro do banco."""
    metrics = calculate_metrics(row)
    return InitiativeResponse(**row, metrics=metrics)


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
    - Issues existentes têm summary, cost_center e status atualizados.
    """
    supabase = get_supabase_client()
    jira_issues = await fetch_jira_issues()

    # Buscar iniciativas existentes
    existing = supabase.table("initiatives").select("id, jira_key").execute()
    existing_keys = {row["jira_key"]: row["id"] for row in existing.data}

    # Próxima prioridade disponível
    max_order_result = (
        supabase.table("initiatives")
        .select("priority_order")
        .order("priority_order", desc=True)
        .limit(1)
        .execute()
    )
    next_order = (max_order_result.data[0]["priority_order"] + 1) if max_order_result.data else 1

    for issue in jira_issues:
        if issue["jira_key"] in existing_keys:
            # Atualizar dados do Jira (não sobrescreve campos manuais)
            supabase.table("initiatives").update({
                "summary": issue["summary"],
                "cost_center": issue.get("cost_center", ""),
                "jira_status": issue["jira_status"],
                "assignee": issue.get("assignee", ""),
            }).eq("jira_key", issue["jira_key"]).execute()
        else:
            # Inserir nova iniciativa
            supabase.table("initiatives").insert({
                "jira_key": issue["jira_key"],
                "summary": issue["summary"],
                "cost_center": issue.get("cost_center", ""),
                "jira_status": issue["jira_status"],
                "assignee": issue.get("assignee", ""),
                "priority_order": next_order,
            }).execute()
            next_order += 1

    # Retornar lista atualizada
    result = (
        supabase.table("initiatives")
        .select("*")
        .order("priority_order", desc=False)
        .execute()
    )
    return [_enrich_with_metrics(row) for row in result.data]


@router.put("/{initiative_id}", response_model=InitiativeResponse)
async def update_initiative(
    initiative_id: str,
    payload: InitiativeUpdate,
    user: dict = Depends(get_current_user),
):
    """Atualiza campos manuais (financeiros) de uma iniciativa."""
    supabase = get_supabase_client()

    update_data = payload.model_dump(exclude_none=True)
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

    return _enrich_with_metrics(result.data[0])


@router.patch("/reorder")
async def reorder_initiatives(
    payload: ReorderRequest,
    user: dict = Depends(get_current_user),
):
    """
    Atualiza a ordem de prioridade de todas as iniciativas.
    Recebe a lista de IDs na nova ordem desejada.
    """
    supabase = get_supabase_client()

    for index, initiative_id in enumerate(payload.ordered_ids, start=1):
        supabase.table("initiatives").update(
            {"priority_order": index}
        ).eq("id", initiative_id).execute()

    return {"message": "Ordem atualizada com sucesso.", "count": len(payload.ordered_ids)}
