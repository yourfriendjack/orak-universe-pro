"""
backend/core/config.py
======================
Configuración central de la aplicación.
Todas las variables sensibles vienen de .env / variables de entorno.
NUNCA hardcodear API keys aquí.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = "ORAK Universe API"
    APP_VERSION: str = "3.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── Supabase ──────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""          # service_role (backend only)
    SUPABASE_ANON_KEY: str = ""     # anon key (frontend)

    # ── CORS ──────────────────────────────────────────────────
    # Separar múltiples orígenes con comas en el .env
    CORS_ORIGINS: str = "*"

    # ── Railway / ngrok ───────────────────────────────────────
    RAILWAY_PUBLIC_DOMAIN: str = ""
    NGROK_URL: str = ""

    # ── Auth (futuro) ─────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # ── IA (futuro) ───────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def public_url(self) -> str:
        """URL pública del servidor (Railway o ngrok)."""
        if self.RAILWAY_PUBLIC_DOMAIN:
            return f"https://{self.RAILWAY_PUBLIC_DOMAIN}"
        return self.NGROK_URL or f"http://localhost:{self.PORT}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
