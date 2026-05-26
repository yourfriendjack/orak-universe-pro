"""
backend/api/routes/pdf.py
==========================
Endpoints para PDFs y notas colaborativas.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from backend.database import repository
from backend.utils.helpers import ok, error

router = APIRouter(prefix="/pdf", tags=["PDF"])


class PDFIn(BaseModel):
    titulo: str
    pdf_url: str
    pdf_nombre: str = ""


class NotaIn(BaseModel):
    id: str
    libro: str
    pagina: int
    texto: str
    color: str = "#fef08a"
    x: float = 0
    y: float = 0


class NotaDelete(BaseModel):
    id: str


# ── PDFs ──────────────────────────────────────────────────────────────────────

@router.get("")
async def listar_pdfs():
    return repository.cargar_pdfs()


@router.post("")
async def guardar_pdf(datos: PDFIn):
    ok_flag = repository.guardar_pdf(datos.titulo, datos.pdf_url, datos.pdf_nombre)
    if not ok_flag:
        error("Error al guardar PDF")
    return ok("PDF guardado")


# ── Notas ─────────────────────────────────────────────────────────────────────

@router.get("/notas")
async def listar_notas(libro: str, pagina: int):
    return repository.cargar_notas_pdf(libro, pagina)


@router.post("/notas")
async def guardar_nota(datos: NotaIn):
    nota = datos.model_dump()
    ok_flag = repository.guardar_nota_pdf(nota)
    if not ok_flag:
        error("Error al guardar nota")
    return ok("Nota guardada")


@router.delete("/notas/{nota_id}")
async def eliminar_nota(nota_id: str):
    ok_flag = repository.eliminar_nota_pdf(nota_id)
    if not ok_flag:
        error("Error al eliminar nota")
    return ok("Nota eliminada")
