"""
backend/api/routes/social.py
=============================
Endpoints de red social: feed, follows, lectores fieles,
glimmers, notas, co-escritores, ranking.
Todos requieren usuario autenticado salvo lectura pública.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from backend.database.supabase_client import get_supabase, get_supabase_user
from backend.models.schemas import (
    PostIn, FollowIn, LectorFielIn, LectorFielAccion,
    GlimmerIn, NotaIn, CoescritorIn, OkResponse
)
from backend.api.deps import get_current_user
from backend.utils.helpers import ok, error

router = APIRouter(prefix="/social", tags=["Social"])


# ══════════════════════════════════════════════════════════
#  FEED
# ══════════════════════════════════════════════════════════

@router.get("/feed")
async def get_feed(
    pagina: int = Query(1, ge=1),
    limite: int = Query(20, le=50),
    usuario = Depends(get_current_user)
):
    """Feed personalizado: posts de quienes sigues + propios."""
    sb = get_supabase_user(usuario["_token"])
    offset = (pagina - 1) * limite

    # IDs de quienes sigo
    follows = sb.table("follows")\
        .select("seguido_id")\
        .eq("seguidor_id", usuario["id"])\
        .execute()
    ids = [f["seguido_id"] for f in (follows.data or [])]
    ids.append(usuario["id"])  # incluir los propios

    res = sb.table("vista_feed")\
        .select("*")\
        .in_("autor_id", ids)\
        .order("creado_en", desc=True)\
        .range(offset, offset + limite - 1)\
        .execute()
    return res.data or []


@router.get("/feed/explorar")
async def get_explorar(
    genero: str = Query(None),
    pagina: int = Query(1, ge=1),
    limite: int = Query(20, le=50)
):
    """Feed público de exploración, sin login requerido."""
    sb = get_supabase()
    offset = (pagina - 1) * limite
    q = sb.table("vista_feed").select("*")
    if genero:
        q = q.eq("libro_genero", genero)
    res = q.order("creado_en", desc=True)\
           .range(offset, offset + limite - 1)\
           .execute()
    return res.data or []


@router.get("/feed/usuario/{username}")
async def get_posts_usuario(username: str, limite: int = Query(20, le=50)):
    """Posts publicados por un usuario específico (su muro)."""
    sb = get_supabase()
    perfil = sb.table("perfiles").select("id").eq("username", username).single().execute()
    if not perfil.data:
        error("Usuario no encontrado")
    res = sb.table("vista_feed")\
        .select("*")\
        .eq("autor_id", perfil.data["id"])\
        .order("creado_en", desc=True)\
        .limit(limite)\
        .execute()
    return res.data or []


@router.post("/posts", response_model=OkResponse)
async def crear_post(datos: PostIn, usuario = Depends(get_current_user)):
    """Crear un post en el feed."""
    sb = get_supabase_user(usuario["_token"])
    res = sb.table("posts").insert({
        "autor_id":    usuario["id"],
        "tipo":        datos.tipo,
        "texto":       datos.texto,
        "libro_id":    datos.libro_id,
        "ref_post_id": datos.ref_post_id,
    }).execute()

    if not res.data:
        error("No se pudo crear el post")

    _ganar_oruns(get_supabase(), usuario["id"], 50, "Publicación en feed", "logro")
    return ok("Post creado", {"post": res.data[0]})


@router.delete("/posts/{post_id}", response_model=OkResponse)
async def borrar_post(post_id: int, usuario = Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    sb.table("posts")\
        .delete()\
        .eq("id", post_id)\
        .eq("autor_id", usuario["id"])\
        .execute()
    return ok("Post eliminado")


# ══════════════════════════════════════════════════════════
#  FOLLOWS
# ══════════════════════════════════════════════════════════

@router.post("/follows", response_model=OkResponse)
async def seguir(datos: FollowIn, usuario = Depends(get_current_user)):
    if datos.seguido_id == usuario["id"]:
        error("No puedes seguirte a ti mismo")
    sb = get_supabase_user(usuario["_token"])
    sb.table("follows").upsert({
        "seguidor_id": usuario["id"],
        "seguido_id":  datos.seguido_id,
    }).execute()
    sb_admin = get_supabase()
    _ganar_oruns(sb_admin, usuario["id"], 5, "Nuevo seguidor", "logro")
    _crear_notif(sb_admin, datos.seguido_id, "follow",
                 "Nuevo seguidor",
                 f"{usuario.get('username','alguien')} ahora te sigue",
                 str(usuario["id"]))
    return ok("Ahora sigues a este usuario")


@router.delete("/follows/{seguido_id}", response_model=OkResponse)
async def dejar_de_seguir(seguido_id: str, usuario = Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    sb.table("follows")\
        .delete()\
        .eq("seguidor_id", usuario["id"])\
        .eq("seguido_id",  seguido_id)\
        .execute()
    return ok("Dejaste de seguir a este usuario")


@router.get("/follows/seguidores/{perfil_id}")
async def get_seguidores(perfil_id: str, limite: int = Query(50, le=100)):
    sb = get_supabase()
    res = sb.table("follows")\
        .select("seguidor_id, perfiles!follows_seguidor_id_fkey(username,display_name,avatar_url,oruns)")\
        .eq("seguido_id", perfil_id)\
        .limit(limite)\
        .execute()
    return res.data or []


@router.get("/follows/siguiendo/{perfil_id}")
async def get_siguiendo(perfil_id: str, limite: int = Query(50, le=100)):
    sb = get_supabase()
    res = sb.table("follows")\
        .select("seguido_id, perfiles!follows_seguido_id_fkey(username,display_name,avatar_url,oruns)")\
        .eq("seguidor_id", perfil_id)\
        .limit(limite)\
        .execute()
    return res.data or []


# ══════════════════════════════════════════════════════════
#  LECTORES FIELES
# ══════════════════════════════════════════════════════════

@router.post("/lectores-fieles", response_model=OkResponse)
async def invitar_lector_fiel(datos: LectorFielIn, usuario = Depends(get_current_user)):
    if datos.receptor_id == usuario["id"]:
        error("No puedes invitarte a ti mismo")
    sb = get_supabase_user(usuario["_token"])
    sb.table("lectores_fieles").upsert({
        "solicitante_id": usuario["id"],
        "receptor_id":    datos.receptor_id,
        "estado":         "pendiente",
    }).execute()
    _crear_notif(get_supabase(), datos.receptor_id, "lector_fiel",
                 "Invitación de lector fiel",
                 f"{usuario.get('username','alguien')} te invitó como lector fiel",
                 str(usuario["id"]))
    return ok("Invitación enviada")


@router.patch("/lectores-fieles/responder", response_model=OkResponse)
async def responder_invitacion(datos: LectorFielAccion, usuario = Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    if datos.accion not in ("aceptar", "rechazar"):
        error("Acción inválida")
    estado = "aceptado" if datos.accion == "aceptar" else "rechazado"
    sb.table("lectores_fieles")\
        .update({"estado": estado})\
        .eq("solicitante_id", datos.solicitante_id)\
        .eq("receptor_id",    usuario["id"])\
        .execute()
    if estado == "aceptado":
        sb_admin = get_supabase()
        _ganar_oruns(sb_admin, usuario["id"], 10, "Nuevo lector fiel", "logro")
        _ganar_oruns(sb_admin, datos.solicitante_id, 10, "Lector fiel aceptado", "logro")
    return ok(f"Invitación {estado}")


# ══════════════════════════════════════════════════════════
#  GLIMMERS
# ══════════════════════════════════════════════════════════

@router.post("/glimmers", response_model=OkResponse)
async def dar_glimmer(datos: GlimmerIn, usuario = Depends(get_current_user)):
    sb = get_supabase()

    receptor_id = None
    if datos.post_id:
        post = sb.table("posts").select("autor_id, glimmers").eq("id", datos.post_id).single().execute()
        if post.data:
            receptor_id = post.data["autor_id"]
            sb.table("posts").update({"glimmers": (post.data["glimmers"] or 0) + 1})\
                .eq("id", datos.post_id).execute()
    elif datos.libro_id:
        libro = sb.table("libros").select("autor_id, glimmers").eq("id", datos.libro_id).single().execute()
        if libro.data:
            receptor_id = libro.data["autor_id"]
            sb.table("libros").update({"glimmers": (libro.data["glimmers"] or 0) + 1})\
                .eq("id", datos.libro_id).execute()

    if not receptor_id:
        error("Destino no encontrado")
    if receptor_id == usuario["id"]:
        error("No puedes darte Glimmers a ti mismo")

    rec_perfil = sb.table("perfiles").select("glimmers_total").eq("id", receptor_id).single().execute()
    if rec_perfil.data:
        sb.table("perfiles").update({
            "glimmers_total": (rec_perfil.data["glimmers_total"] or 0) + 1,
        }).eq("id", receptor_id).execute()

    _crear_notif(sb, receptor_id, "glimmer",
                 "Recibiste un Glimmer ⬡",
                 f"{usuario.get('username','alguien')} te dio un Glimmer",
                 str(datos.post_id or datos.libro_id))
    return ok("Glimmer enviado")


@router.delete("/glimmers", response_model=OkResponse)
async def quitar_glimmer(
    post_id:  Optional[int] = Query(None),
    libro_id: Optional[int] = Query(None),
    usuario = Depends(get_current_user)
):
    sb = get_supabase()
    receptor_id = None
    if post_id:
        post = sb.table("posts").select("autor_id, glimmers").eq("id", post_id).single().execute()
        if post.data:
            receptor_id = post.data["autor_id"]
            sb.table("posts").update({"glimmers": max(0, (post.data["glimmers"] or 0) - 1)})\
                .eq("id", post_id).execute()
    elif libro_id:
        libro = sb.table("libros").select("autor_id, glimmers").eq("id", libro_id).single().execute()
        if libro.data:
            receptor_id = libro.data["autor_id"]
            sb.table("libros").update({"glimmers": max(0, (libro.data["glimmers"] or 0) - 1)})\
                .eq("id", libro_id).execute()
    if not receptor_id:
        error("Destino no encontrado")
    rec = sb.table("perfiles").select("glimmers_total").eq("id", receptor_id).single().execute()
    if rec.data:
        sb.table("perfiles").update({
            "glimmers_total": max(0, (rec.data["glimmers_total"] or 0) - 1)
        }).eq("id", receptor_id).execute()
    return ok("Glimmer quitado")


# ══════════════════════════════════════════════════════════
#  NOTAS EN PÁRRAFO
# ══════════════════════════════════════════════════════════

@router.post("/notas", response_model=OkResponse)
async def crear_nota(datos: NotaIn, usuario = Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    res = sb.table("notas").insert({
        "autor_id":    usuario["id"],
        "capitulo_id": datos.capitulo_id,
        "post_id":     datos.post_id,
        "parrafo_idx": datos.parrafo_idx,
        "texto":       datos.texto,
    }).execute()
    if datos.post_id:
        p = sb.table("posts").select("notas").eq("id", datos.post_id).single().execute()
        if p.data:
            sb.table("posts").update({"notas": (p.data["notas"] or 0) + 1})\
                .eq("id", datos.post_id).execute()
    _ganar_oruns(get_supabase(), usuario["id"], 5, "Nota dejada", "logro")
    return ok("Nota creada", {"nota": res.data[0] if res.data else {}})


@router.get("/notas/post/{post_id}")
async def get_notas_post(post_id: int):
    sb = get_supabase()
    res = sb.table("notas")\
        .select("*, perfiles(username, display_name, avatar_url)")\
        .eq("post_id", post_id)\
        .order("creado_en")\
        .execute()
    return res.data or []


@router.get("/notas/{capitulo_id}")
async def get_notas_capitulo(capitulo_id: int):
    sb = get_supabase()
    res = sb.table("notas")\
        .select("*, perfiles(username, display_name, avatar_url)")\
        .eq("capitulo_id", capitulo_id)\
        .order("creado_en")\
        .execute()
    return res.data or []


# ══════════════════════════════════════════════════════════
#  CO-ESCRITORES
# ══════════════════════════════════════════════════════════

@router.post("/coescritores/{libro_id}", response_model=OkResponse)
async def invitar_coescritor(libro_id: int, datos: CoescritorIn, usuario = Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    libro = sb.table("libros").select("autor_id")\
               .eq("id", libro_id).single().execute()
    if not libro.data or libro.data["autor_id"] != usuario["id"]:
        error("No tienes permiso sobre este libro")
    sb.table("coescritores").upsert({
        "libro_id":   libro_id,
        "perfil_id":  datos.perfil_id,
        "porcentaje": datos.porcentaje,
        "estado":     "pendiente",
    }).execute()
    _crear_notif(get_supabase(), datos.perfil_id, "collab",
                 "Invitación de co-escritor",
                 f"{usuario.get('username','alguien')} te invitó a co-escribir un libro",
                 str(libro_id))
    return ok("Invitación de co-escritor enviada")


# ══════════════════════════════════════════════════════════
#  RANKING
# ══════════════════════════════════════════════════════════

@router.get("/ranking")
async def get_ranking(limite: int = Query(10, le=50)):
    sb = get_supabase()
    res = sb.table("vista_ranking").select("*").limit(limite).execute()
    return res.data or []


# ══════════════════════════════════════════════════════════
#  NOTIFICACIONES
# ══════════════════════════════════════════════════════════

@router.get("/notificaciones")
async def get_notificaciones(
    solo_no_leidas: bool = Query(False),
    usuario = Depends(get_current_user)
):
    sb = get_supabase_user(usuario["_token"])
    q = sb.table("notificaciones")\
          .select("*")\
          .eq("usuario_id", usuario["id"])\
          .order("creado_en", desc=True)\
          .limit(30)
    if solo_no_leidas:
        q = q.eq("leida", False)
    return (q.execute()).data or []


@router.patch("/notificaciones/leer-todas", response_model=OkResponse)
async def leer_todas_notifs(usuario = Depends(get_current_user)):
    sb = get_supabase_user(usuario["_token"])
    sb.table("notificaciones")\
      .update({"leida": True})\
      .eq("usuario_id", usuario["id"])\
      .execute()
    return ok("Notificaciones marcadas como leídas")


# ══════════════════════════════════════════════════════════
#  HELPERS PRIVADOS
# ══════════════════════════════════════════════════════════

def _ganar_oruns(sb, perfil_id: str, cantidad: int, concepto: str, tipo: str):
    try:
        p = sb.table("perfiles").select("oruns, xp").eq("id", perfil_id).single().execute()
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
        pass  # No romper el flujo principal si falla el log


def _crear_notif(sb, usuario_id: str, tipo: str, titulo: str, cuerpo: str, ref_id: str = None):
    try:
        sb.table("notificaciones").insert({
            "usuario_id": usuario_id,
            "tipo":       tipo,
            "titulo":     titulo,
            "cuerpo":     cuerpo,
            "ref_id":     ref_id,
        }).execute()
    except Exception:
        pass
