from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx

from app.config import settings
from app.auth.domain_check import is_allowed_domain

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Valida o token chamando a API do Supabase Auth diretamente.
    Compatível com ECC (P-256) e HS256.
    """
    token = credentials.credentials

    # Valida o token via Supabase Auth API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_anon_key,
                },
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Erro ao validar token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = response.json()
    email = user_data.get("email", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não contém email.",
        )

    if not is_allowed_domain(email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso restrito a emails @{settings.allowed_email_domain}.",
        )

    return {
        "id": user_data.get("id"),
        "email": email,
        "role": user_data.get("role", "authenticated"),
        "full_name": (
            (user_data.get("user_metadata") or {}).get("full_name")
            or (user_data.get("user_metadata") or {}).get("name")
            or ""
        ),
    }
