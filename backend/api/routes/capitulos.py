"""
backend/api/routes/capitulos.py
=================================
CRUD de capítulos vinculados a un libro social.
"""
from fastapi import APIRouter, Depends, HTTPException
from backend.database.supabase_client import get_supabase
from backend.models.schemas import CapituloIn, CapituloUpdate, OkResponse
from backend.api.deps import get_current_user
from backend.utils.helpers import ok, error

router = APIRouter(prefix="/libros", tags=["Capítulos"])


@router.get("/{libro_id}/capitulos")
async def listar_capitulos(libro_id: int):
    sb = get_supabase()
    res = sb.table("capitulos")\
        .select("id,numero,titulo,palabras,estado,es_publico,creado_en")\
        .eq("libro_id", libro_id)\
        .order("numero")\
        .execute()
    return res.data or []


@router.post("/{libro_id}/capitulos", response_model=OkResponse)
async def crear_capitulo(libro_id: int, datos: CapituloIn, usuario = Depends(get_current_user)):
    sb = get_supabase()
    libro = sb.table("libros").select("autor_id").eq("id", libro_id).single().execute()
    if not libro.data or libro.data["autor_id"] != usuario["id"]:
        error("No tienes permiso sobre este libro")
    # Siguiente número
    caps = sb.table("capitulos").select("numero").eq("libro_id", libro_id)\
             .order("numero", desc=True).limit(1).execute()
    siguiente = (caps.data[0]["numero"] + 1) if caps.data else 1
    palabras = len(datos.contenido.split()) if datos.contenido else 0
    res = sb.table("capitulos").insert({
        "libro_id":   libro_id,
        "numero":     siguiente,
        "titulo":     datos.titulo,
        "contenido":  datos.contenido,
        "palabras":   palabras,
        "estado":     datos.estado,
        "es_publico": datos.es_publico,
    }).execute()
    return ok("Capítulo creado", {"capitulo": res.data[0] if res.data else {}})


@router.get("/{libro_id}/capitulos/{numero}")
async def get_capitulo(libro_id: int, numero: int):
    sb = get_supabase()
    res = sb.table("capitulos").select("*")\
            .eq("libro_id", libro_id).eq("numero", numero).single().execute()
    if not res.data:
        raise HTTPException(404, "Capítulo no encontrado")
    return res.data


@router.patch("/{libro_id}/capitulos/{numero}", response_model=OkResponse)
async def actualizar_capitulo(libro_id: int, numero: int, datos: CapituloUpdate, usuario = Depends(get_current_user)):
    sb = get_supabase()
    libro = sb.table("libros").select("autor_id").eq("id", libro_id).single().execute()
    if not libro.data or libro.data["autor_id"] != usuario["id"]:
        error("No tienes permiso")
    cambios = {k: v for k, v in datos.dict().items() if v is not None}
    if "contenido" in cambios:
        cambios["palabras"] = len(cambios["contenido"].split())
    sb.table("capitulos").update(cambios)\
      .eq("libro_id", libro_id).eq("numero", numero).execute()
    return ok("Capítulo actualizado")


@router.delete("/{libro_id}/capitulos/{numero}", response_model=OkResponse)
async def borrar_capitulo(libro_id: int, numero: int, usuario = Depends(get_current_user)):
    sb = get_supabase()
    libro = sb.table("libros").select("autor_id").eq("id", libro_id).single().execute()
    if not libro.data or libro.data["autor_id"] != usuario["id"]:
        error("No tienes permiso")
    sb.table("capitulos").delete()\
      .eq("libro_id", libro_id).eq("numero", numero).execute()
    return ok("Capítulo eliminado")
