"""
backend/api/routes/auth.py
===========================
Registro, login, perfil propio, actualizar perfil.
Usa Supabase Auth como proveedor.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from backend.database.supabase_client import get_supabase
from backend.models.schemas import RegisterIn, LoginIn, PerfilUpdate, OkResponse
from backend.api.deps import get_current_user
from backend.utils.helpers import ok, error

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/registro")
async def registro(datos: RegisterIn):
    sb = get_supabase()

    # Verificar username único
    existe = sb.table("perfiles")\
               .select("id")\
               .eq("username", datos.username)\
               .execute()
    if existe.data:
        error("Ese username ya está en uso")

    # Crear usuario en Supabase Auth
    res = sb.auth.sign_up({
        "email":    datos.email,
        "password": datos.password,
        "options":  {
            "data": {
                "username":     datos.username,
                "display_name": datos.display_name,
            }
        }
    })
    if not res.user:
        error("No se pudo crear el usuario — verifica el email")

    uid = res.user.id

    # El trigger en Supabase ya crea el perfil base,
    # pero actualizamos con los datos completos
    sb.table("perfiles").update({
        "username":     datos.username,
        "display_name": datos.display_name,
        "generos":      datos.generos,
        "oruns":        50,
    }).eq("id", str(uid)).execute()

    return ok("Cuenta creada — revisa tu email para confirmar", {
        "user_id": str(uid),
        "email":   datos.email,
    })


@router.post("/login")
async def login(datos: LoginIn):
    sb = get_supabase()
    try:
        res = sb.auth.sign_in_with_password({
            "email":    datos.email,
            "password": datos.password,
        })
    except Exception as e:
        error("Credenciales incorrectas")

    if not res.user or not res.session:
        error("Credenciales incorrectas")

    # Cargar perfil
    perfil = sb.table("perfiles")\
               .select("*")\
               .eq("id", str(res.user.id))\
               .single()\
               .execute()

    return {
        "access_token": res.session.access_token,
        "token_type":   "bearer",
        "perfil":       perfil.data or {},
    }


@router.post("/logout", response_model=OkResponse)
async def logout(usuario = Depends(get_current_user)):
    sb = get_supabase()
    try:
        sb.auth.sign_out()
    except Exception:
        pass
    return ok("Sesión cerrada")


@router.get("/me")
async def get_me(usuario = Depends(get_current_user)):
    sb = get_supabase()
    perfil = sb.table("vista_perfil_publico")\
               .select("*")\
               .eq("id", usuario["id"])\
               .single()\
               .execute()
    return perfil.data or {}


@router.patch("/me", response_model=OkResponse)
async def actualizar_perfil(datos: PerfilUpdate, usuario = Depends(get_current_user)):
    sb = get_supabase()
    cambios = {k: v for k, v in datos.dict().items() if v is not None}
    if not cambios:
        error("No hay cambios que guardar")
    sb.table("perfiles")\
      .update(cambios)\
      .eq("id", usuario["id"])\
      .execute()
    return ok("Perfil actualizado")


@router.post("/me/avatar", response_model=OkResponse)
async def subir_avatar(file: UploadFile = File(...), usuario = Depends(get_current_user)):
    """Sube una imagen de avatar a Supabase Storage y actualiza el perfil."""
    sb = get_supabase()
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    if ext not in ("jpg","jpeg","png","webp","gif"):
        error("Formato de imagen no soportado")

    contenido = await file.read()
    if len(contenido) > 5 * 1024 * 1024:
        error("La imagen no puede superar 5MB")

    path = f"avatars/{usuario['id']}.{ext}"
    try:
        sb.storage.from_("avatares").upload(
            path, contenido,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
    except Exception as e:
        error(f"Error al subir imagen: {str(e)}")

    public_url = sb.storage.from_("avatares").get_public_url(path)
    sb.table("perfiles").update({"avatar_url": public_url}).eq("id", usuario["id"]).execute()

    return ok("Avatar actualizado", {"avatar_url": public_url})


@router.post("/me/banner", response_model=OkResponse)
async def subir_banner(file: UploadFile = File(...), usuario = Depends(get_current_user)):
    """Sube una imagen de banner a Supabase Storage y actualiza el perfil."""
    sb = get_supabase()
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    if ext not in ("jpg","jpeg","png","webp","gif"):
        error("Formato de imagen no soportado")

    contenido = await file.read()
    if len(contenido) > 8 * 1024 * 1024:
        error("La imagen no puede superar 8MB")

    path = f"banners/{usuario['id']}.{ext}"
    try:
        sb.storage.from_("avatares").upload(
            path, contenido,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
    except Exception as e:
        error(f"Error al subir imagen: {str(e)}")

    public_url = sb.storage.from_("avatares").get_public_url(path)
    sb.table("perfiles").update({"banner_url": public_url}).eq("id", usuario["id"]).execute()

    return ok("Banner actualizado", {"banner_url": public_url})


@router.get("/perfil/{username}")
async def get_perfil_publico(username: str):
    """Perfil público por username — no requiere login."""
    sb = get_supabase()
    res = sb.table("vista_perfil_publico")\
            .select("*")\
            .eq("username", username)\
            .single()\
            .execute()
    if not res.data:
        raise HTTPException(404, "Perfil no encontrado")
    return res.data


@router.get("/perfil/{username}/libros")
async def get_libros_de_perfil(username: str, authorization: str = Header(None)):
    sb = get_supabase()
    perfil = sb.table("perfiles").select("id").eq("username", username).single().execute()
    if not perfil.data:
        raise HTTPException(404, "Perfil no encontrado")

    # Verificar si quien pregunta es el dueño del perfil
    es_propietario = False
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ", 1)[1]
            res_user = sb.auth.get_user(token)
            if res_user and res_user.user and str(res_user.user.id) == perfil.data["id"]:
                es_propietario = True
        except Exception:
            pass

    q = sb.table("libros")\
          .select("id,titulo,datos,genero,portada_url,es_publico,glimmers,lectores,forks_count,creado_en")\
          .eq("autor_id", perfil.data["id"])
    if not es_propietario:
        q = q.eq("es_publico", True)

    res = q.order("creado_en", desc=True).execute()
    return res.data or []
