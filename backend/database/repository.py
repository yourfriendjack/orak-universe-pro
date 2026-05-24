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
