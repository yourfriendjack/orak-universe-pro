"""
backend/database/supabase_client.py
=====================================
Singleton del cliente Supabase.
Toda la app importa desde aquí — un solo cliente por proceso.
"""
from functools import lru_cache
from supabase import create_client, Client
from backend.core.config import get_settings


@lru_cache()
def get_supabase() -> Client:
    """Retorna el cliente Supabase (cacheado como singleton)."""
    cfg = get_settings()
    if not cfg.SUPABASE_URL or not cfg.SUPABASE_KEY:
        raise RuntimeError(
            "❌ SUPABASE_URL y SUPABASE_KEY deben estar en .env\n"
            "   Copia .env.example → .env y rellena los valores."
        )
    return create_client(cfg.SUPABASE_URL, cfg.SUPABASE_KEY)
