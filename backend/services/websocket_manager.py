"""
backend/services/websocket_manager.py
=======================================
Gestión de conexiones WebSocket.
Mensajes de chat persistidos en Supabase.
"""
import json
from fastapi import WebSocket
from backend.database import repository


class ConnectionManager:
    def __init__(self):
        self.activas: list[WebSocket] = []

    # ── Conexión ──────────────────────────────────────────────────────────────

    async def conectar(self, ws: WebSocket) -> None:
        await ws.accept()
        self.activas.append(ws)

    def desconectar(self, ws: WebSocket) -> None:
        if ws in self.activas:
            self.activas.remove(ws)

    # ── Broadcast ─────────────────────────────────────────────────────────────

    async def broadcast(self, payload: dict) -> None:
        """Envía un mensaje JSON a todas las conexiones activas."""
        msg = json.dumps(payload, ensure_ascii=False)
        muertos = []
        for ws in self.activas:
            try:
                await ws.send_text(msg)
            except Exception:
                muertos.append(ws)
        for ws in muertos:
            self.desconectar(ws)

    async def broadcast_update(self, libros: list[dict]) -> None:
        """Notifica a todos los clientes que el universo cambió."""
        await self.broadcast({"tipo": "universo_actualizado", "libros": libros})

    # ── Chat persistido en Supabase ───────────────────────────────────────────

    def agregar_mensaje(self, msg: dict) -> None:
        """Guarda el mensaje en Supabase."""
        repository.guardar_mensaje(msg)

    def mensajes(self, libro: str = "") -> list[dict]:
        """Lee mensajes desde Supabase."""
        return repository.cargar_mensajes(libro)


# Singleton global
ws_manager = ConnectionManager()
