"""
backend/utils/middleware.py
============================
Middlewares personalizados de la aplicación.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class SlashEncoderMiddleware(BaseHTTPMiddleware):
    """
    Re-encodea slashes literales en segmentos de ruta de título.
    Necesario porque los títulos pueden contener '/'.
    """
    async def dispatch(self, request: Request, call_next):
        path = request.scope.get("path", "")
        prefix = "/libros/"
        if path.startswith(prefix):
            rest = path[len(prefix):]
            parts = rest.split("/", 1)
            titulo_enc = parts[0].replace("/", "%2F")
            new_path = prefix + titulo_enc + ("/" + parts[1] if len(parts) > 1 else "")
            request.scope["path"] = new_path
        return await call_next(request)
