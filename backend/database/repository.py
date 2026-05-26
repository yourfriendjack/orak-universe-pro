"""
backend/database/repository.py
================================
Capa de acceso a datos (Repository Pattern).
Toda la lógica SQL/Supabase vive aquí.
Los servicios llaman funciones de este módulo — nunca tocan Supabase directo.
"""
import json
import traceback
from typing import Optional
from backend.database.supabase_client import get_supabase


# ── Libros ────────────────────────────────────────────────────────────────────

def cargar_todos() -> list[dict]:
    """Carga todos los libros desde Supabase, ordenados por creación."""
    try:
        sb = get_supabase()
        res = sb.table("libros").select("titulo, datos").order("creado_en").execute()
        libros = []
        for row in res.data:
            try:
                datos = row["datos"]
                if isinstance(datos, str):
                    datos = json.loads(datos)
                if not isinstance(datos, dict):
                    datos = {}
                datos["titulo"] = row["titulo"]
                libros.append(datos)
            except Exception as e:
                print(f"  ⚠ Error procesando '{row.get('titulo', '?')}': {e}")
        return libros
    except Exception as e:
        print(f"⚠ Error cargando libros: {e}")
        traceback.print_exc()
        return []


def guardar_libro(libro: dict) -> bool:
    """Upsert de un libro. Retorna True si tuvo éxito."""
    try:
        sb = get_supabase()
        titulo = libro.get("titulo", "")
        datos = {k: v for k, v in libro.items() if k != "titulo"}
        sb.table("libros").upsert(
            {"titulo": titulo, "datos": datos},
            on_conflict="titulo"
        ).execute()
        return True
    except Exception as e:
        print(f"⚠ Error guardando libro '{libro.get('titulo')}': {e}")
        traceback.print_exc()
        return False


def eliminar_libro(titulo: str) -> bool:
    """Elimina un libro por título. Retorna True si tuvo éxito."""
    try:
        sb = get_supabase()
        sb.table("libros").delete().eq("titulo", titulo).execute()
        return True
    except Exception as e:
        print(f"⚠ Error eliminando libro '{titulo}': {e}")
        traceback.print_exc()
        return False


def guardar_todos(libros: list[dict]) -> None:
    """Persiste todos los libros (batch upsert)."""
    for libro in libros:
        guardar_libro(libro)

# ── Chat ──────────────────────────────────────────────────────────────────────

def guardar_mensaje(msg: dict) -> bool:
    """Guarda un mensaje de chat en Supabase."""
    try:
        sb = get_supabase()
        sb.table("chat_mensajes").insert({
            "usuario": msg.get("usuario", ""),
            "texto":   msg.get("texto", ""),
            "libro":   msg.get("libro", ""),
        }).execute()
        return True
    except Exception as e:
        print(f"⚠ Error guardando mensaje: {e}")
        return False


def cargar_mensajes(libro: str = "", limite: int = 200) -> list[dict]:
    """Carga los últimos mensajes del chat desde Supabase."""
    try:
        sb = get_supabase()
        q = sb.table("chat_mensajes").select("*").order("creado_en", desc=False).limit(limite)
        if libro:
            q = q.eq("libro", libro)
        res = q.execute()
        return [
            {
                "usuario":  r["usuario"],
                "texto":    r["texto"],
                "libro":    r["libro"],
                "ts":       r["creado_en"],
            }
            for r in res.data
        ]
    except Exception as e:
        print(f"⚠ Error cargando mensajes: {e}")
        return []

# ── PDFs ──────────────────────────────────────────────────────────────────────

def guardar_pdf(titulo: str, pdf_url: str, pdf_nombre: str) -> bool:
    """Registra un PDF en la tabla pdfs."""
    try:
        sb = get_supabase()
        sb.table("pdfs").upsert(
            {"titulo": titulo, "pdf_url": pdf_url, "pdf_nombre": pdf_nombre},
            on_conflict="titulo"
        ).execute()
        return True
    except Exception as e:
        print(f"⚠ Error guardando PDF '{titulo}': {e}")
        return False


def cargar_pdfs() -> list[dict]:
    """Carga todos los PDFs registrados."""
    try:
        sb = get_supabase()
        res = sb.table("pdfs").select("*").order("subido_en", desc=True).execute()
        return res.data or []
    except Exception as e:
        print(f"⚠ Error cargando PDFs: {e}")
        return []


def guardar_nota_pdf(nota: dict) -> bool:
    """Guarda o actualiza una nota en Supabase."""
    try:
        sb = get_supabase()
        sb.table("notas_pdf").upsert({
            "id":     nota["id"],
            "libro":  nota["libro"],
            "pagina": nota["pagina"],
            "texto":  nota["texto"],
            "color":  nota["color"],
            "x":      nota["x"],
            "y":      nota["y"],
        }, on_conflict="id").execute()
        return True
    except Exception as e:
        print(f"⚠ Error guardando nota: {e}")
        return False


def cargar_notas_pdf(libro: str, pagina: int) -> list[dict]:
    """Carga las notas de un libro y página."""
    try:
        sb = get_supabase()
        res = sb.table("notas_pdf").select("*").eq("libro", libro).eq("pagina", pagina).execute()
        return res.data or []
    except Exception as e:
        print(f"⚠ Error cargando notas: {e}")
        return []


def eliminar_nota_pdf(nota_id: str) -> bool:
    """Elimina una nota por ID."""
    try:
        sb = get_supabase()
        sb.table("notas_pdf").delete().eq("id", nota_id).execute()
        return True
    except Exception as e:
        print(f"⚠ Error eliminando nota: {e}")
        return False
