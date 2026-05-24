"""
backend/api/routes/universo.py
================================
Endpoints globales: timeline, errores, stats, chat, info, WebSocket.
"""
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.models.schemas import ChatMsg
from backend.services.store import store
from backend.services.websocket_manager import ws_manager
from backend.utils.helpers import ok
import backend.core.orak_core as core

router = APIRouter(tags=["Universo"])


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.conectar(ws)
    try:
        while True:
            await ws.receive_text()  # mantiene la conexión viva
    except WebSocketDisconnect:
        ws_manager.desconectar(ws)


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.get("/chat", tags=["Chat"])
async def get_chat(libro: str = ""):
    return ws_manager.mensajes(libro)


@router.post("/chat", tags=["Chat"])
async def enviar_chat(datos: ChatMsg):
    msg = {
        "usuario": datos.usuario,
        "texto": datos.texto,
        "libro": datos.libro,
        "ts": datetime.utcnow().isoformat(),
    }
    ws_manager.agregar_mensaje(msg)
    await ws_manager.broadcast({"tipo": "chat", **msg})
    return ok("Mensaje enviado")


# ── Universo ──────────────────────────────────────────────────────────────────

@router.get("/timeline", tags=["Timeline"])
async def timeline():
    return core.obtener_timeline(store.todos())


@router.get("/errores", tags=["Diagnóstico"])
async def errores():
    return core.detectar_errores(store.todos())


@router.post("/reparar", tags=["Diagnóstico"])
async def reparar():
    libros = store.todos()
    n = core.reparar_universo(libros)
    # persistir los reparados
    for libro in libros:
        store.actualizar(libro)
    return ok(f"{n} problemas reparados")


@router.get("/stats", tags=["Stats"])
async def estadisticas():
    libros = store.todos()
    total_personajes = sum(len(l.get("personajes", [])) for l in libros)
    total_eventos = sum(len(l.get("eventos", [])) for l in libros)
    total_lugares = sum(len(l.get("lugares", [])) for l in libros)
    total_facciones = sum(len(l.get("facciones", [])) for l in libros)
    total_relaciones = sum(len(l.get("relaciones", [])) for l in libros)
    return {
        "libros": len(libros),
        "personajes": total_personajes,
        "eventos": total_eventos,
        "lugares": total_lugares,
        "facciones": total_facciones,
        "relaciones": total_relaciones,
        "conexiones_ws": len(ws_manager.activas),
    }


# ── Info ──────────────────────────────────────────────────────────────────────

@router.get("/info", tags=["Info"])
async def info():
    from backend.core.config import get_settings
    cfg = get_settings()
    return {
        "app": cfg.APP_NAME,
        "version": cfg.APP_VERSION,
        "libros": len(store.todos()),
        "conexiones_ws": len(ws_manager.activas),
        "modo": "Railway" if cfg.RAILWAY_PUBLIC_DOMAIN else "local",
    }
