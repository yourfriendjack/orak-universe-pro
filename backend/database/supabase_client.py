"""
backend/database/supabase_client.py
=====================================
Clientes Supabase para la app.

  get_supabase()          → service_role (admin). Solo para:
                            - auth.get_user() en deps.py
                            - operaciones entre usuarios (notifs, oruns a terceros)
                            Bypass total de RLS — usar con cuidado.

  get_supabase_user(tok)  → anon key + JWT del usuario. Activa RLS.
                            Usar en todos los endpoints de usuario para
                            que las policies de Supabase hagan de segunda
                            línea de defensa.
"""
from functools import lru_cache
from supabase import create_client, Client
from backend.core.config import get_settings


@lru_cache()
def get_supabase() -> Client:
    """Cliente admin (service_role). No usar en endpoints de usuario."""
    cfg = get_settings()
    if not cfg.SUPABASE_URL or not cfg.SUPABASE_KEY:
        raise RuntimeError(
            "❌ SUPABASE_URL y SUPABASE_KEY deben estar en .env\n"
            "   Copia .env.example → .env y rellena los valores."
        )
    return create_client(cfg.SUPABASE_URL, cfg.SUPABASE_KEY)


def get_supabase_user(token: str) -> Client:
    """Cliente Supabase con JWT del usuario — activa RLS. Crear uno por request."""
    cfg = get_settings()
    if not cfg.SUPABASE_URL or not cfg.SUPABASE_ANON_KEY:
        raise RuntimeError(
            "❌ SUPABASE_URL y SUPABASE_ANON_KEY deben estar en .env"
        )
    client = create_client(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    client.postgrest.auth(token)
    return client
