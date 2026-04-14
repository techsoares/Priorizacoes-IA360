from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    supabase_jwt_secret: str

    # Google OAuth
    google_client_id: str
    google_client_secret: str

    # Domínio permitido
    allowed_email_domain: str = "pgmais.com.br"

    # Jira
    jira_base_url: str
    jira_email: str
    jira_api_token: str
    jira_project_key: str = "IA360"
    jira_jql: str = ""

    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_model: str = "anthropic/claude-opus-4-5"
    openrouter_site_url: str = ""
    openrouter_app_name: str = "IA360 Dashboard"

    # CORS
    frontend_url: str = "http://localhost:5173"

    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
    }


settings = Settings()
