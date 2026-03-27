from app.config import settings


def is_allowed_domain(email: str) -> bool:
    """Verifica se o email pertence ao domínio autorizado (@pgmais.com.br)."""
    if not email or "@" not in email:
        return False
    domain = email.split("@")[1].lower()
    return domain == settings.allowed_email_domain.lower()
