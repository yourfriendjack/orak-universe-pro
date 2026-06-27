"""
backend/main.py
================
Punto de entrada — ORAK Universe Red Social.
"""
import uvicorn, os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.core.config import get_settings
from backend.services.store import store
from backend.services.websocket_manager import ws_manager
from backend.utils.middleware import SlashEncoderMiddleware

# ── Routers worldbuilding (sin cambios) ───────────────────────────────────────
from backend.api.routes import libros, personajes, mundo, universo, web, pdf

# ── Routers nuevos — red social ───────────────────────────────────────────────
from backend.api.routes import auth, social, libros_social
from backend.api.routes import capitulos as caps_router

cfg = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 {cfg.APP_NAME} arrancando — Red Social activa")
    store.cargar()
    store.on_change(ws_manager.broadcast_update)
    yield
    print("👋 Cerrando ORAK Universe…")

app = FastAPI(
    title=cfg.APP_NAME,
    version="4.0.0",
    description="Red social para escritores — worldbuilding colaborativo",
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
# Red social
app.include_router(auth.router,         prefix="/api")   # /api/auth/...
app.include_router(social.router,       prefix="/api")   # /api/social/...
app.include_router(caps_router.router,  prefix="/api")
app.include_router(libros_social.router)   # /api/libros/{id}/capitulos

# Worldbuilding (compatibilidad total)
app.include_router(universo.router)
app.include_router(libros.router)
app.include_router(personajes.router)
app.include_router(mundo.router)
app.include_router(web.router)
app.include_router(pdf.router)

# ── No-cache middleware para estáticos (evita que el navegador cachee JS/CSS) ──
class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith(("/js/", "/css/", "/assets/")):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"]        = "no-cache"
            response.headers["Expires"]       = "0"
        return response

app.add_middleware(NoCacheStaticMiddleware)

# ── Static files ──────────────────────────────────────────────────────────────
_FRONTEND = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/js",     StaticFiles(directory=os.path.join(_FRONTEND, "js")),     name="js")
app.mount("/css",    StaticFiles(directory=os.path.join(_FRONTEND, "css")),    name="css")
app.mount("/assets", StaticFiles(directory=os.path.join(_FRONTEND, "assets")), name="assets")
app.mount("/icons",  StaticFiles(directory=os.path.join(_FRONTEND, "icons")),  name="icons")

@app.get("/apple-touch-icon.png", include_in_schema=False)
@app.get("/apple-touch-icon-precomposed.png", include_in_schema=False)
async def apple_icon():
    return FileResponse(os.path.join(_FRONTEND, "apple-touch-icon.png"), media_type="image/png")

@app.get("/logo-oficial.png", include_in_schema=False)
async def logo_oficial():
    return FileResponse(os.path.join(_FRONTEND, "logo-oficial.png"), media_type="image/png")

@app.get("/logo-icon-sm.png", include_in_schema=False)
async def logo_icon_sm():
    return FileResponse(os.path.join(_FRONTEND, "logo-icon-sm.png"), media_type="image/png")

@app.get("/logo-negro.png", include_in_schema=False)
async def logo_negro():
    return FileResponse(os.path.join(_FRONTEND, "logo-negro.png"), media_type="image/png")

@app.get("/logo.svg", include_in_schema=False)
async def logo_svg():
    return FileResponse(os.path.join(_FRONTEND, "logo.svg"), media_type="image/svg+xml")

@app.get("/manifest.json", include_in_schema=False)
async def manifest():
    return FileResponse(os.path.join(_FRONTEND, "manifest.json"), media_type="application/manifest+json")

@app.get("/sw.js", include_in_schema=False)
async def service_worker():
    return FileResponse(os.path.join(_FRONTEND, "sw.js"), media_type="application/javascript")

@app.get("/offline.html", include_in_schema=False)
async def offline():
    return FileResponse(os.path.join(_FRONTEND, "offline.html"), media_type="text/html")

# ── 404 ───────────────────────────────────────────────────────────────────────
@app.exception_handler(404)
async def not_found(request: Request, exc):
    ruta = os.path.join(_FRONTEND, "404.html")
    try:
        return HTMLResponse(open(ruta, encoding="utf-8").read(), status_code=404)
    except FileNotFoundError:
        return HTMLResponse("<h1>404</h1>", status_code=404)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=cfg.HOST, port=cfg.PORT, reload=cfg.DEBUG)
