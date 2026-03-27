from supabase import create_client, Client
from app.config import settings


def get_supabase_client() -> Client:
    """Cliente Supabase com service key (acesso admin, backend only)."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_supabase_anon_client() -> Client:
    """Cliente Supabase com anon key (respeita RLS)."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)
