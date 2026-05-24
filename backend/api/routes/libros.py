"""
backend/api/routes/libros.py
=============================
Endpoints CRUD para libros (incluye historia y descripción).
"""
from fastapi import APIRouter
from backend.models.schemas import LibroIn, HistoriaIn, DescripcionIn
from backend.services.store import store
from backend.services.websocket_manager import ws_manager
from backend.utils.helpers import dec_titulo, ok, error
import backend.core.orak_core as core

router = APIRouter(prefix="/libros", tags=["Libros"])


@router.get("")
async def listar_libros():
    return store.todos()


@router.get("/{titulo}")
async def obtener_libro(titulo: str):
    libro = store.buscar(dec_titulo(titulo))
    if not libro:
        error("Libro no encontrado", 404)
    return libro


@router.post("")
async def crear_libro(datos: LibroIn):
    libros = store.todos()
    ok_flag, msg = core.agregar_libro(libros, datos.titulo)
    if not ok_flag:
        error(msg)
    nuevo = core._buscar_libro(libros, datos.titulo)
    store.agregar(nuevo)
    await ws_manager.broadcast_update(store.todos())
    return ok(msg)


@router.delete("/{titulo}")
async def borrar_libro(titulo: str):
    t = dec_titulo(titulo)
    if not store.buscar(t):
        error("Libro no encontrado", 404)
    store.eliminar(t)
    await ws_manager.broadcast_update(store.todos())
    return ok(f"Libro '{t}' eliminado")


@router.patch("/{titulo}/historia")
async def editar_historia(titulo: str, datos: HistoriaIn):
    t = dec_titulo(titulo)
    libro = store.buscar(t)
    if not libro:
        error("Libro no encontrado", 404)
    libro["historia"] = datos.historia
    store.actualizar(libro)
    await ws_manager.broadcast_update(store.todos())
    return ok("Historia actualizada")


@router.patch("/{titulo}/descripcion")
async def editar_descripcion(titulo: str, datos: DescripcionIn):
    t = dec_titulo(titulo)
    libro = store.buscar(t)
    if not libro:
        error("Libro no encontrado", 404)
    libro["descripcion"] = datos.descripcion
    store.actualizar(libro)
    await ws_manager.broadcast_update(store.todos())
    return ok("Descripción actualizada")
