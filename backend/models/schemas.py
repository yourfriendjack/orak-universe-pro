"""
backend/models/schemas.py
==========================
Modelos Pydantic — worldbuilding + red social completa.
"""
from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime


# ══════════════════════════════════════════════════════════
#  RESPUESTAS BASE
# ══════════════════════════════════════════════════════════

class OkResponse(BaseModel):
    ok: bool = True
    mensaje: str
    datos: Optional[dict] = None

class ErrorResponse(BaseModel):
    ok: bool = False
    mensaje: str


# ══════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════

class RegisterIn(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    username: str = Field(..., min_length=3, max_length=30)
    display_name: str = Field(..., min_length=1, max_length=60)
    generos: List[str] = []

    @validator('username')
    def validar_username(cls, v):
        import re
        if not re.match(r'^[a-zA-Z0-9_.]+$', v):
            raise ValueError('El handle solo puede contener letras, números, puntos y guiones bajos')
        return v.lower()

class LoginIn(BaseModel):
    email: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    perfil: dict


# ══════════════════════════════════════════════════════════
#  PERFILES
# ══════════════════════════════════════════════════════════

class PerfilUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=60)
    bio:          Optional[str] = Field(None, max_length=300)
    generos:      Optional[List[str]] = None
    avatar_url:   Optional[str] = None
    banner_url:   Optional[str] = None
    es_publico:   Optional[bool] = None

class PerfilOut(BaseModel):
    id:              str
    username:        str
    display_name:    Optional[str]
    avatar_url:      Optional[str]
    banner_url:      Optional[str]
    bio:             str = ''
    generos:         List[str] = []
    oruns:           int = 0
    glimmers_week:   int = 10
    glimmers_total:  int = 0
    nivel:           int = 1
    xp:              int = 0
    libros_count:    int = 0
    seguidores_count:int = 0
    siguiendo_count: int = 0
    forks_recibidos: int = 0
    creado_en:       Optional[datetime]


# ══════════════════════════════════════════════════════════
#  LIBROS (worldbuilding + social)
# ══════════════════════════════════════════════════════════

class LibroIn(BaseModel):
    titulo:      str = Field(..., min_length=1, max_length=200)
    descripcion: str = ''
    genero:      str = 'fantasía'
    es_publico:  bool = True
    portada_url: Optional[str] = None
    fork_de:     Optional[int] = None

class LibroUpdate(BaseModel):
    titulo:      Optional[str] = Field(None, max_length=200)
    descripcion: Optional[str] = None
    historia:    Optional[str] = None
    genero:      Optional[str] = None
    es_publico:  Optional[bool] = None
    portada_url: Optional[str] = None
    worldbuilding: Optional[dict] = None

class HistoriaIn(BaseModel):
    historia: str

class DescripcionIn(BaseModel):
    descripcion: str


# ══════════════════════════════════════════════════════════
#  CAPÍTULOS
# ══════════════════════════════════════════════════════════

class CapituloIn(BaseModel):
    titulo:    str = Field(..., min_length=1, max_length=200)
    contenido: str = ''
    estado:    str = 'borrador'   # borrador | en_progreso | completo
    es_publico:bool = True

class CapituloUpdate(BaseModel):
    titulo:    Optional[str] = None
    contenido: Optional[str] = None
    estado:    Optional[str] = None
    es_publico:Optional[bool] = None


# ══════════════════════════════════════════════════════════
#  POSTS
# ══════════════════════════════════════════════════════════

class PostIn(BaseModel):
    tipo:       str = 'reflexion'   # nuevo_libro | capitulo | fork | colaboracion | reflexion | compartido
    texto:      str = Field(..., min_length=1, max_length=1000)
    libro_id:   Optional[int] = None
    ref_post_id:Optional[int] = None

class PostOut(BaseModel):
    id:           int
    tipo:         str
    texto:        str
    glimmers:     int = 0
    forks:        int = 0
    notas:        int = 0
    creado_en:    datetime
    autor_id:     str
    autor_handle: str
    autor_nombre: Optional[str]
    autor_avatar: Optional[str]
    autor_oruns:  int = 0
    libro_id:     Optional[int]
    libro_titulo: Optional[str]
    libro_genero: Optional[str]


# ══════════════════════════════════════════════════════════
#  SOCIAL — FOLLOWS / LECTORES FIELES
# ══════════════════════════════════════════════════════════

class FollowIn(BaseModel):
    seguido_id: str   # UUID del perfil a seguir

class LectorFielIn(BaseModel):
    receptor_id: str  # UUID del perfil al que se invita

class LectorFielAccion(BaseModel):
    solicitante_id: str
    accion: str   # aceptar | rechazar


# ══════════════════════════════════════════════════════════
#  GLIMMERS
# ══════════════════════════════════════════════════════════

class GlimmerIn(BaseModel):
    post_id:    Optional[int] = None
    libro_id:   Optional[int] = None
    cantidad:   int = Field(1, ge=1, le=5)


# ══════════════════════════════════════════════════════════
#  NOTAS EN PÁRRAFO
# ══════════════════════════════════════════════════════════

class NotaIn(BaseModel):
    texto:       str = Field(..., min_length=1, max_length=500)
    capitulo_id: Optional[int] = None
    post_id:     Optional[int] = None
    parrafo_idx: Optional[int] = None


# ══════════════════════════════════════════════════════════
#  CO-ESCRITORES
# ══════════════════════════════════════════════════════════

class CoescritorIn(BaseModel):
    perfil_id:  str
    porcentaje: int = Field(50, ge=1, le=99)

class CoescritorRespuesta(BaseModel):
    accion: str  # "aceptar" | "rechazar"


# ══════════════════════════════════════════════════════════
#  MENSAJES
# ══════════════════════════════════════════════════════════

class MensajeIn(BaseModel):
    receptor_id: str
    texto:       str = Field(..., min_length=1, max_length=1000)


# ══════════════════════════════════════════════════════════
#  TIENDA
# ══════════════════════════════════════════════════════════

class CompraIn(BaseModel):
    item_id: str = Field(..., min_length=1, max_length=60)

class EquiparIn(BaseModel):
    item_id: str = Field(..., min_length=1, max_length=60)
    tipo:    str  # "tema_ui" | "tema_lectura" | "titulo"


# ══════════════════════════════════════════════════════════
#  WORLDBUILDING (sin cambios — compatibilidad total)
# ══════════════════════════════════════════════════════════

class EventoIn(BaseModel):
    descripcion: str
    año: int
    personaje: str = ""

class EventoEdit(BaseModel):
    descripcion: Optional[str] = None
    año:         Optional[int] = None
    personaje:   Optional[str] = None

class PersonajeIn(BaseModel):
    nombre:      str
    nacimiento:  int = 0
    muerte:      Optional[int] = None
    rol:         str = ""
    descripcion: str = ""
    nivel:       int = 1
    raza:        str = ""
    clase:       str = ""

class PersonajeEdit(BaseModel):
    nombre:      Optional[str] = None
    nacimiento:  Optional[int] = None
    muerte:      Optional[int] = None
    rol:         Optional[str] = None
    descripcion: Optional[str] = None
    nivel:       Optional[int] = None
    raza:        Optional[str] = None
    clase:       Optional[str] = None

class ItemIn(BaseModel):
    nombre:      str
    descripcion: str = ""

class ItemEdit(BaseModel):
    nombre:      Optional[str] = None
    descripcion: Optional[str] = None

class LugarIn(BaseModel):
    nombre:      str
    tipo:        str = "otro"
    descripcion: str = ""

class FaccionIn(BaseModel):
    nombre:      str
    tipo:        str = "otro"
    descripcion: str = ""

class MiembroIn(BaseModel):
    nombre: str

class RelacionIn(BaseModel):
    personaje_a: str
    personaje_b: str
    tipo:        str
    descripcion: str = ""

class ChatMsg(BaseModel):
    usuario: str
    texto:   str
    libro:   str = ""
