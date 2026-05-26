"""
backend/api/routes/mundo.py
============================
Endpoints para Eventos, Lugares, Facciones y Relaciones.
Agrupados como "mundo" porque comparten el mismo patrón y dominio narrativo.
"""
from fastapi import APIRouter
from backend.models.schemas import EventoIn, EventoEdit, LugarIn, FaccionIn, MiembroIn, RelacionIn
from backend.services.store import store
from backend.services.websocket_manager import ws_manager
from backend.utils.helpers import dec_titulo, ok, error
import backend.core.orak_core as core

router = APIRouter(prefix="/libros", tags=["Mundo"])


# ── Eventos ───────────────────────────────────────────────────────────────────

@router.post("/{titulo}/eventos")
async def crear_evento(titulo: str, datos: EventoIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.agregar_evento(libros, t, datos.descripcion, datos.año, datos.personaje)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.patch("/{titulo}/eventos/{indice}")
async def actualizar_evento(titulo: str, indice: int, datos: EventoEdit):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.editar_evento(libros, t, indice, datos.nombre, datos.fecha, datos.descripcion)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.delete("/{titulo}/eventos/{indice}")
async def borrar_evento(titulo: str, indice: int):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.eliminar_evento(libros, t, indice)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


# ── Lugares ───────────────────────────────────────────────────────────────────

@router.get("/{titulo}/lugares")
async def listar_lugares(titulo: str):
    t = dec_titulo(titulo)
    libro = store.buscar(t)
    if not libro:
        error("Libro no encontrado", 404)
    return libro.get("lugares", [])


@router.post("/{titulo}/lugares")
async def crear_lugar(titulo: str, datos: LugarIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.agregar_lugar(libros, t, datos.nombre, datos.tipo, datos.descripcion)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.patch("/{titulo}/lugares/{nombre}")
async def actualizar_lugar(titulo: str, nombre: str, datos: LugarIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.editar_lugar(libros, t, nombre, datos.nombre, datos.tipo, datos.descripcion)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.delete("/{titulo}/lugares/{nombre}")
async def borrar_lugar(titulo: str, nombre: str):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.eliminar_lugar(libros, t, nombre)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


# ── Facciones ─────────────────────────────────────────────────────────────────

@router.get("/{titulo}/facciones")
async def listar_facciones(titulo: str):
    t = dec_titulo(titulo)
    libro = store.buscar(t)
    if not libro:
        error("Libro no encontrado", 404)
    return libro.get("facciones", [])


@router.post("/{titulo}/facciones")
async def crear_faccion(titulo: str, datos: FaccionIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.agregar_faccion(libros, t, datos.nombre, datos.tipo, datos.descripcion)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.patch("/{titulo}/facciones/{nombre}")
async def actualizar_faccion(titulo: str, nombre: str, datos: FaccionIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.editar_faccion(libros, t, nombre, datos.nombre, datos.tipo, datos.descripcion)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.delete("/{titulo}/facciones/{nombre}")
async def borrar_faccion(titulo: str, nombre: str):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.eliminar_faccion(libros, t, nombre)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.post("/{titulo}/facciones/{nombre}/miembros")
async def agregar_miembro(titulo: str, nombre: str, datos: MiembroIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.agregar_miembro_faccion(libros, t, nombre, datos.nombre)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


# ── Relaciones ────────────────────────────────────────────────────────────────

@router.get("/{titulo}/relaciones")
async def listar_relaciones(titulo: str):
    t = dec_titulo(titulo)
    libro = store.buscar(t)
    if not libro:
        error("Libro no encontrado", 404)
    return libro.get("relaciones", [])


@router.post("/{titulo}/relaciones")
async def crear_relacion(titulo: str, datos: RelacionIn):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.agregar_relacion(
        libros, t, datos.personaje_a, datos.personaje_b, datos.tipo, datos.descripcion
    )
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.delete("/{titulo}/relaciones/{indice}")
async def borrar_relacion(titulo: str, indice: int):
    t = dec_titulo(titulo)
    libros = store.todos()
    ok_flag, msg = core.eliminar_relacion(libros, t, indice)
    if not ok_flag:
        error(msg)
    libro = core._buscar_libro(libros, t)
    if libro:
        store.actualizar(libro)
        await ws_manager.broadcast_update(store.todos())
    return ok(msg)
