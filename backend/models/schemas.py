"""
backend/models/schemas.py
===========================
Todos los modelos Pydantic (request bodies + response shapes).
Separados del servidor para poder importarlos en tests y en otros módulos.
"""
from typing import Optional
from pydantic import BaseModel, Field


# ── Libros ────────────────────────────────────────────────────────────────────

class LibroIn(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)

class HistoriaIn(BaseModel):
    historia: str

class DescripcionIn(BaseModel):
    descripcion: str


# ── Eventos ───────────────────────────────────────────────────────────────────

class EventoIn(BaseModel):
    nombre: str
    fecha: str = ""
    descripcion: str = ""

class EventoEdit(BaseModel):
    nombre: Optional[str] = None
    fecha: Optional[str] = None
    descripcion: Optional[str] = None


# ── Personajes ────────────────────────────────────────────────────────────────

class PersonajeIn(BaseModel):
    nombre: str
    rol: str = ""
    descripcion: str = ""
    nivel: int = 1
    raza: str = ""
    clase: str = ""

class PersonajeEdit(BaseModel):
    nombre: Optional[str] = None
    rol: Optional[str] = None
    descripcion: Optional[str] = None
    nivel: Optional[int] = None
    raza: Optional[str] = None
    clase: Optional[str] = None


# ── Items (habilidades / armas) ───────────────────────────────────────────────

class ItemIn(BaseModel):
    nombre: str
    descripcion: str = ""

class ItemEdit(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


# ── Lugares ───────────────────────────────────────────────────────────────────

class LugarIn(BaseModel):
    nombre: str
    tipo: str = "otro"
    descripcion: str = ""


# ── Facciones ─────────────────────────────────────────────────────────────────

class FaccionIn(BaseModel):
    nombre: str
    tipo: str = "otro"
    descripcion: str = ""

class MiembroIn(BaseModel):
    nombre: str


# ── Relaciones ────────────────────────────────────────────────────────────────

class RelacionIn(BaseModel):
    personaje_a: str
    personaje_b: str
    tipo: str
    descripcion: str = ""


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMsg(BaseModel):
    usuario: str
    texto: str
    libro: str = ""


# ── Responses ─────────────────────────────────────────────────────────────────

class OkResponse(BaseModel):
    ok: bool = True
    mensaje: str
    datos: Optional[dict] = None

class ErrorResponse(BaseModel):
    ok: bool = False
    mensaje: str
