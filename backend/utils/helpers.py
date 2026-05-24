"""
backend/utils/helpers.py
=========================
Funciones de utilidad compartidas entre rutas y servicios.
"""
import urllib.parse
from typing import Optional
from fastapi import HTTPException


def dec_titulo(titulo: str) -> str:
    """URL-decode un título de libro."""
    return urllib.parse.unquote(titulo)


def ok(mensaje: str, datos: Optional[dict] = None) -> dict:
    """Respuesta de éxito estándar."""
    r = {"ok": True, "mensaje": mensaje}
    if datos:
        r["datos"] = datos
    return r


def error(mensaje: str, codigo: int = 400) -> None:
    """Lanza HTTPException con formato estándar."""
    raise HTTPException(status_code=codigo, detail={"ok": False, "mensaje": mensaje})
