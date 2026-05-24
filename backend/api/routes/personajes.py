"""
backend/api/routes/personajes.py
==================================
Endpoints CRUD para personajes, habilidades y armas.
"""
from fastapi import APIRouter
from backend.models.schemas import PersonajeIn, PersonajeEdit, ItemIn
from backend.services.store import store
from backend.services.websocket_manager import ws_manager
from backend.utils.helpers import dec_titulo, ok, error
import backend.core.orak_core as core

router = APIRouter(prefix="/libros", tags=["Personajes"])


@router.post("/{titulo}/personajes")
async def crear_personaje(titulo: str, datos: PersonajeIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.agregar_personaje(
        libros, t, datos.nombre, datos.rol, datos.descripcion,
        datos.nivel, datos.raza, datos.clase
    )
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.patch("/{titulo}/personajes/{nombre}")
async def actualizar_personaje(titulo: str, nombre: str, datos: PersonajeEdit):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.editar_personaje(
        libros, t, nombre,
        datos.nombre, datos.rol, datos.descripcion,
        datos.nivel, datos.raza, datos.clase
    )
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.delete("/{titulo}/personajes/{nombre}")
async def borrar_personaje(titulo: str, nombre: str):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.eliminar_personaje(libros, t, nombre)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


# ── Habilidades ───────────────────────────────────────────────────────────────

@router.post("/{titulo}/personajes/{nombre}/habilidades")
async def agregar_habilidad(titulo: str, nombre: str, datos: ItemIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.agregar_habilidad(libros, t, nombre, datos.nombre, datos.descripcion)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.delete("/{titulo}/personajes/{nombre}/habilidades/{indice}")
async def borrar_habilidad(titulo: str, nombre: str, indice: int):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.eliminar_habilidad(libros, t, nombre, indice)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


# ── Armas ─────────────────────────────────────────────────────────────────────

@router.post("/{titulo}/personajes/{nombre}/armas")
async def agregar_arma(titulo: str, nombre: str, datos: ItemIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.agregar_arma(libros, t, nombre, datos.nombre, datos.descripcion)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.delete("/{titulo}/personajes/{nombre}/armas/{indice}")
async def borrar_arma(titulo: str, nombre: str, indice: int):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.eliminar_arma(libros, t, nombre, indice)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)
