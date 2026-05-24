"""
backend/services/websocket_manager.py
=======================================
Gestión de conexiones WebSocket.
Separado del servidor para poder testearlo de forma aislada.
"""
import json
from collections import deque
from fastapi import WebSocket


MAX_CHAT = 200  # máximo mensajes en historial


class ConnectionManager:
    def __init__(self):
        self.activas: list[WebSocket] = []
        self._chat: deque = deque(maxlen=MAX_CHAT)

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

    # ── Chat ──────────────────────────────────────────────────────────────────

    def agregar_mensaje(self, msg: dict) -> None:
        self._chat.append(msg)

    def mensajes(self, libro: str = "") -> list[dict]:
        if not libro:
            return list(self._chat)
        return [m for m in self._chat if m.get("libro") == libro]


# Singleton global
ws_manager = ConnectionManager()
