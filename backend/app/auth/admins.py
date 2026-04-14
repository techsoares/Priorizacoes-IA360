from fastapi import HTTPException, status

from app.database.supabase_client import get_supabase_client


def is_admin_email(email: str | None) -> bool:
    if not email:
        return False

    supabase = get_supabase_client()
    result = (
        supabase.table("admins")
        .select("id")
        .eq("email", email.lower().strip())
        .limit(1)
        .execute()
    )
    return bool(result.data)


def require_admin(user: dict) -> None:
    if not is_admin_email(user.get("email")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
