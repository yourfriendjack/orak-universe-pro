"""
backend/main.py
================
Punto de entrada de la aplicación FastAPI.
Solo configuración, middleware y registro de routers.
Ninguna lógica de negocio vive aquí.
"""
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import get_settings
from backend.services.store import store
from backend.services.websocket_manager import ws_manager
from backend.utils.middleware import SlashEncoderMiddleware

# ── Routers ───────────────────────────────────────────────────────────────────
from backend.api.routes import libros, personajes, mundo, universo, web

cfg = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Código que corre al arrancar y al apagar la app.
    Reemplaza los obsoletos @app.on_event("startup").
    """
    # Startup
    print(f"🚀 {cfg.APP_NAME} v{cfg.APP_VERSION} arrancando…")
    store.cargar()
    store.on_change(ws_manager.broadcast_update)
    yield
    # Shutdown
    print("👋 Cerrando ORAK Universe…")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=cfg.APP_NAME,
    version=cfg.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(SlashEncoderMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(universo.router)          # /ws  /chat  /timeline  /stats  /info
app.include_router(libros.router)            # /libros
app.include_router(personajes.router)        # /libros/{t}/personajes
app.include_router(mundo.router)             # /libros/{t}/eventos|lugares|facciones|relaciones
app.include_router(web.router)               # /  /orak.css  /engine.js

# ── Static files ──────────────────────────────────────────────────────────────
import os
from fastapi.staticfiles import StaticFiles
_FRONTEND = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/js",     StaticFiles(directory=os.path.join(_FRONTEND, "js")),     name="js")
app.mount("/css",    StaticFiles(directory=os.path.join(_FRONTEND, "css")),    name="css")
app.mount("/assets", StaticFiles(directory=os.path.join(_FRONTEND, "assets")), name="assets")


# ── Dev entrypoint ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=cfg.HOST,
        port=cfg.PORT,
        reload=cfg.DEBUG,
    )
