import os
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

router = APIRouter(tags=["Web"])

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend")

def _read(path: str):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return None

@router.get("/engine.js")
async def serve_js():
    content = _read(os.path.join(FRONTEND_DIR, "js", "engine.js"))
    if content is None:
        return Response("// JS no encontrado", media_type="application/javascript", status_code=404)
    return Response(
        content=content,
        media_type="application/javascript",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@router.get("/orak.css")
async def serve_css():
    content = _read(os.path.join(FRONTEND_DIR, "css", "orak.css"))
    if content is None:
        return Response("/* CSS no encontrado */", media_type="text/css", status_code=404)
    return Response(content=content, media_type="text/css")

@router.get("/", response_class=HTMLResponse)
async def web_app():
    content = _read(os.path.join(FRONTEND_DIR, "index.html"))
    if content:
        return HTMLResponse(content)
    return HTMLResponse("<h1>Frontend no encontrado</h1>", status_code=404)
