"""
backend/api/routes/libros_social.py
=====================================
CRUD de libros para la red social — usa Supabase directamente.
Coexiste con libros.py (worldbuilding legacy) sin conflictos.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Header, UploadFile, File
from typing import Optional
from backend.database.supabase_client import get_supabase, get_supabase_user
from backend.models.schemas import LibroIn, LibroUpdate, OkResponse
from backend.api.deps import get_current_user
from backend.utils.helpers import ok, error

router = APIRouter(prefix="/v2/libros", tags=["Libros Social"])


# ── Listar libros públicos ────────────────────────────────────────
@router.get("")
async def listar_libros(
    genero:  str  = Query(None),
    fork_de: int  = Query(None),
    limite:  int  = Query(20, le=50),
    pagina:  int  = Query(1, ge=1),
):
    sb = get_supabase()
    offset = (pagina - 1) * limite
    q = sb.table("libros")\
      .select("id,titulo,datos,genero,portada_url,es_publico,glimmers,lectores,forks_count,creado_en,autor_id,autor:perfiles!libros_autor_id_fkey(username,display_name)")\
      .eq("es_publico", True)
    if genero:
        q = q.ilike("genero", genero)
    if fork_de:
        q = q.eq("fork_de", fork_de)
    res = q.order("creado_en", desc=True).range(offset, offset+limite-1).execute()
    return res.data or []


# ── Mis libros ────────────────────────────────────────────────────
@router.get("/mis-libros")
async def mis_libros(usuario=Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    res = sb.table("libros")\
            .select("id,titulo,datos,genero,portada_url,es_publico,glimmers,lectores,forks_count,creado_en")\
            .eq("autor_id", usuario["id"])\
            .order("creado_en", desc=True)\
            .execute()
    return res.data or []


# ── Crear libro ───────────────────────────────────────────────────
@router.post("", response_model=OkResponse)
async def crear_libro(datos: LibroIn, usuario=Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])

    # Verificar título único para este autor
    existe = sb.table("libros")\
               .select("id")\
               .eq("titulo", datos.titulo)\
               .eq("autor_id", usuario["id"])\
               .execute()
    if existe.data:
        error("Ya tienes un libro con ese título")

    # Datos del worldbuilding en JSONB (compatibilidad con orak_core)
    wb = getattr(datos, "worldbuilding", None) or {}
    datos_json = {
        "descripcion": datos.descripcion,
        "historia":    "",
        "personajes":  wb.get("personajes", []),
        "lugares":     wb.get("lugares", []),
        "facciones":   wb.get("facciones", []),
        "eventos":     wb.get("eventos", []),
        "relaciones":  [],
        "aportes":     [],
        "comentarios": [],
    }

    res = sb.table("libros").insert({
        "titulo":      datos.titulo,
        "autor_id":    usuario["id"],
        "genero":      datos.genero,
        "es_publico":  datos.es_publico,
        "portada_url": datos.portada_url,
        "fork_de":     datos.fork_de,
        "datos":       datos_json,
    }).execute()

    if not res.data:
        error("No se pudo crear el libro")

    libro_id = res.data[0]["id"]
    # _ganar_oruns y el post usan service_role porque escriben datos cruzados
    _ganar_oruns(get_supabase(), usuario["id"], 100, "Nuevo libro publicado", "logro")
    get_supabase().table("posts").insert({
        "autor_id": usuario["id"],
        "tipo":     "nuevo_libro",
        "texto":    f"Publiqué un nuevo libro: {datos.titulo}",
        "libro_id": libro_id,
    }).execute()

    return ok("Libro creado", {"libro": res.data[0]})


# ── Obtener libro por ID ──────────────────────────────────────────
@router.get("/{libro_id}")
async def obtener_libro(libro_id: int, authorization: Optional[str] = Header(None)):
    sb = get_supabase()
    res = sb.table("libros")\
            .select("*, autor:perfiles!libros_autor_id_fkey(username,display_name,avatar_url)")\
            .eq("id", libro_id)\
            .single()\
            .execute()
    if not res.data:
        raise HTTPException(404, "Libro no encontrado")

    # Libro privado: solo el autor puede verlo
    if not res.data.get("es_publico"):
        token = (authorization or "").removeprefix("Bearer ").strip()
        uid = None
        if token:
            try:
                r = get_supabase().auth.get_user(token)
                uid = str(r.user.id) if r and r.user else None
            except Exception:
                pass
        if uid != res.data.get("autor_id"):
            raise HTTPException(403, "Este libro es privado")

    # Incrementar lectores
    sb.table("libros").update({"lectores": (res.data.get("lectores") or 0) + 1})\
      .eq("id", libro_id).execute()

    # Si es un fork, traer info del libro original
    if res.data.get("fork_de"):
        original = sb.table("libros")\
            .select("id, titulo, autor:perfiles!libros_autor_id_fkey(username,display_name)")\
            .eq("id", res.data["fork_de"])\
            .single()\
            .execute()
        if original.data:
            res.data["libro_original"] = original.data

    return res.data


# ── Actualizar libro ──────────────────────────────────────────────
@router.patch("/{libro_id}", response_model=OkResponse)
async def actualizar_libro(libro_id: int, datos: LibroUpdate, usuario=Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    libro = sb.table("libros").select("autor_id,datos").eq("id", libro_id).single().execute()
    if not libro.data or libro.data["autor_id"] != usuario["id"]:
        error("No tienes permiso sobre este libro")

    cambios = {k: v for k, v in datos.dict().items() if v is not None and k not in ("historia","descripcion","worldbuilding")}

    # descripcion, historia y worldbuilding van dentro del JSONB datos.
    # dict() hace copia para que la comparación posterior detecte cambios reales.
    datos_orig = libro.data.get("datos") or {}
    datos_json = dict(datos_orig)
    if datos.descripcion is not None:
        datos_json["descripcion"] = datos.descripcion
    if datos.historia is not None:
        datos_json["historia"] = datos.historia

    wb = datos.worldbuilding
    if wb is not None:
        if "personajes" in wb: datos_json["personajes"] = wb["personajes"] or []
        if "lugares"    in wb: datos_json["lugares"]    = wb["lugares"]    or []
        if "facciones"  in wb: datos_json["facciones"]  = wb["facciones"]  or []
        if "eventos"    in wb: datos_json["eventos"]    = wb["eventos"]    or []

    if datos_json != datos_orig:
        cambios["datos"] = datos_json

    if not cambios:
        error("Sin cambios que guardar")

    sb.table("libros").update(cambios).eq("id", libro_id).execute()
    return ok("Libro actualizado")


# ── Eliminar libro ────────────────────────────────────────────────
@router.delete("/{libro_id}", response_model=OkResponse)
async def eliminar_libro(libro_id: int, usuario=Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    libro = sb.table("libros").select("autor_id").eq("id", libro_id).single().execute()
    if not libro.data or libro.data["autor_id"] != usuario["id"]:
        error("No tienes permiso sobre este libro")
    sb.table("libros").delete().eq("id", libro_id).execute()
    return ok("Libro eliminado")


# ── Fork de libro ─────────────────────────────────────────────────
@router.post("/{libro_id}/fork", response_model=OkResponse)
async def fork_libro(libro_id: int, usuario=Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    original = sb.table("libros").select("*").eq("id", libro_id).single().execute()
    if not original.data:
        error("Libro no encontrado")
    if not original.data["es_publico"]:
        error("Solo puedes forkear libros públicos")
    if original.data["autor_id"] == usuario["id"]:
        error("No puedes forkear tu propio libro")

    nuevo_titulo = f"{original.data['titulo']} (Fork de @{usuario.get('username','user')})"
    res = sb.table("libros").insert({
        "titulo":     nuevo_titulo,
        "autor_id":   usuario["id"],
        "genero":     original.data["genero"],
        "es_publico": False,
        "fork_de":    libro_id,
        "datos":      original.data["datos"],
    }).execute()

    if not res.data:
        error("No se pudo crear el fork")

    # Oruns y notificación usan service_role porque afectan datos de otros usuarios
    _ganar_oruns(get_supabase(), usuario["id"], 50, "Fork realizado", "fork")
    get_supabase().table("notificaciones").insert({
        "usuario_id": original.data["autor_id"],
        "tipo":       "fork",
        "titulo":     "Tu libro fue forkeado",
        "cuerpo":     f"{usuario.get('username','alguien')} hizo fork de '{original.data['titulo']}'",
        "ref_id":     str(res.data[0]["id"]),
    }).execute()

    return ok("Fork creado exitosamente", {"libro_id": res.data[0]["id"]})


# ── Subir portada ────────────────────────────────────────────────
@router.post("/upload-portada", response_model=OkResponse)
async def upload_portada(file: UploadFile = File(...), usuario=Depends(get_current_user)):
    ext = (file.filename or "").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        error("Formato no soportado. Usa JPG, PNG o WEBP")
    contenido = await file.read()
    if len(contenido) > 8 * 1024 * 1024:
        error("La imagen no puede superar 8 MB")
    import time
    path = f"portadas/{usuario['id']}_{int(time.time())}.{ext}"
    sb = get_supabase()
    try:
        sb.storage.from_("avatares").upload(
            path, contenido,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )
    except Exception as e:
        error(f"Error al subir portada: {str(e)}")
    public_url = sb.storage.from_("avatares").get_public_url(path)
    return ok("Portada subida", {"portada_url": public_url})


# ── Helper ────────────────────────────────────────────────────────
def _ganar_oruns(sb, perfil_id, cantidad, concepto, tipo):
    try:
        p = sb.table("perfiles").select("oruns,xp").eq("id", perfil_id).single().execute()
        if p.data:
            nuevo_xp    = (p.data["xp"] or 0) + cantidad
            nuevo_nivel = 1 + nuevo_xp // 500
            sb.table("perfiles").update({
                "oruns": (p.data["oruns"] or 0) + cantidad,
                "xp":    nuevo_xp,
                "nivel": nuevo_nivel,
            }).eq("id", perfil_id).execute()
            sb.table("oruns_log").insert({
                "perfil_id": perfil_id,
                "cantidad":  cantidad,
                "concepto":  concepto,
                "tipo":      tipo,
            }).execute()
    except Exception:
        pass
