"""
backend/api/deps.py
====================
Dependencias de FastAPI: extrae y valida el usuario del JWT.
"""
from fastapi import HTTPException, Header
from backend.database.supabase_client import get_supabase
from typing import Optional


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Extrae el usuario del header Authorization: Bearer <token>
    Lanza 401 si el token es inválido o falta.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token de autenticación requerido")

    token = authorization.split(" ", 1)[1]
    sb = get_supabase()

    try:
        res = sb.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(401, "Token inválido o expirado")
    except Exception:
        raise HTTPException(401, "Token inválido o expirado")

    user = res.user
    # Cargar datos del perfil
    perfil = sb.table("perfiles")\
               .select("id, username, display_name, oruns, glimmers_week, nivel")\
               .eq("id", str(user.id))\
               .single()\
               .execute()

    return {
        "id":           str(user.id),
        "email":        user.email,
        "username":     perfil.data.get("username") if perfil.data else "",
        "display_name": perfil.data.get("display_name") if perfil.data else "",
        "oruns":        perfil.data.get("oruns", 0) if perfil.data else 0,
        "_token":       token,
    }
