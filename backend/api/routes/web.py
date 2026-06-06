import os
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, Response

router = APIRouter(tags=["Web"])
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend")

def _read(path: str):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return None

def _inject_config(content: str) -> str:
    from backend.core.config import get_settings
    cfg = get_settings()
    script = f"""<script>
window.ORAK_CONFIG = {{
  supabaseUrl:  "{cfg.SUPABASE_URL}",
  supabaseAnon: "{cfg.SUPABASE_ANON_KEY}",
  apiServer:    "{cfg.public_url}"
}};
</script>"""
    if '<!-- SERVER_CONFIG_INJECTION_POINT -->' in content:
        return content.replace('<!-- SERVER_CONFIG_INJECTION_POINT -->', script)
    return content.replace('</head>', script + '</head>')

@router.get("/engine.js")
async def serve_js():
    content = _read(os.path.join(FRONTEND_DIR, "js", "engine.js"))
    if content is None:
        return Response("// JS no encontrado", media_type="application/javascript", status_code=404)
    return Response(content=content, media_type="application/javascript",
        headers={"Cache-Control":"no-store","Pragma":"no-cache","Expires":"0"})

@router.get("/orak.css")
async def serve_css():
    content = _read(os.path.join(FRONTEND_DIR, "css", "orak.css"))
    if content is None:
        return Response("/* CSS no encontrado */", media_type="text/css", status_code=404)
    return Response(content=content, media_type="text/css")

@router.get("/css/orak-social.css")
async def serve_social_css():
    content = _read(os.path.join(FRONTEND_DIR, "css", "orak-social.css"))
    if content is None:
        return Response("/* CSS no encontrado */", media_type="text/css", status_code=404)
    return Response(content=content, media_type="text/css")

@router.get("/js/services/auth.js")
async def serve_auth_js():
    content = _read(os.path.join(FRONTEND_DIR, "js", "services", "auth.js"))
    if content is None:
        return Response("// no encontrado", media_type="application/javascript", status_code=404)
    return Response(content=content, media_type="application/javascript",
        headers={"Cache-Control":"no-store"})

@router.get("/js/services/api.js")
async def serve_api_js():
    content = _read(os.path.join(FRONTEND_DIR, "js", "services", "api.js"))
    if content is None:
        return Response("// no encontrado", media_type="application/javascript", status_code=404)
    return Response(content=content, media_type="application/javascript",
        headers={"Cache-Control":"no-store"})

@router.get("/", response_class=HTMLResponse)
async def web_app():
    content = _read(os.path.join(FRONTEND_DIR, "index.html"))
    if not content:
        return HTMLResponse("<h1>Frontend no encontrado</h1>", status_code=404)
    return HTMLResponse(_inject_config(content))

@router.get("/index-social.html", response_class=HTMLResponse)
async def web_social():
    content = _read(os.path.join(FRONTEND_DIR, "index-social.html"))
    if not content:
        return HTMLResponse("<h1>Frontend social no encontrado</h1>", status_code=404)
    return HTMLResponse(_inject_config(content))

@router.get("/404", response_class=HTMLResponse)
async def pagina_404():
    content = _read(os.path.join(FRONTEND_DIR, "404.html"))
    if content:
        return HTMLResponse(content)
    return HTMLResponse("<h1>404 — No encontrado</h1>", status_code=404)
@router.get("/auth", response_class=HTMLResponse)
@router.get("/auth.html", response_class=HTMLResponse)
async def web_auth():
    content = _read(os.path.join(FRONTEND_DIR, "auth.html"))
    if not content:
        return HTMLResponse("<h1>Auth no encontrado</h1>", status_code=404)
    return HTMLResponse(_inject_config(content))
