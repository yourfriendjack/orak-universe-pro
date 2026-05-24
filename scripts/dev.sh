#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
#  scripts/dev.sh — Arranca ORAK Universe en desarrollo
#  Uso: bash scripts/dev.sh
# ══════════════════════════════════════════════════════

set -e

# ── Verificar .env ────────────────────────────────────
if [ ! -f .env ]; then
  echo "⚠️  No existe .env — copiando desde .env.example"
  cp .env.example .env
  echo "✏️  Edita .env con tus credenciales de Supabase antes de continuar."
  exit 1
fi

# ── Instalar dependencias si hace falta ───────────────
if [ ! -d .venv ]; then
  echo "📦 Creando entorno virtual…"
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

# ── Arrancar servidor ─────────────────────────────────
echo "🚀 Arrancando ORAK Universe en http://localhost:8000"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
