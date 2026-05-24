"""
backend/services/store.py
==========================
Estado en memoria centralizado.
Un solo objeto Store por proceso — importado como singleton.
Desacopla la lógica de negocio del acceso a datos.
"""
import asyncio
from typing import Optional
from backend.database import repository


class Store:
    """
    Cache en memoria de todos los libros.
    - Lee de Supabase al arrancar
    - Escribe a Supabase en cada mutación
    - Notifica cambios via WebSocket (callback registrado por el ws manager)
    """

    def __init__(self):
        self._libros: list[dict] = []
        self._on_change_callbacks: list = []

    # ── Bootstrap ─────────────────────────────────────────────────────────────

    def cargar(self) -> None:
        """Carga inicial desde Supabase. Llamar al arrancar la app."""
        self._libros = repository.cargar_todos()
        print(f"📦 Store: {len(self._libros)} libros cargados")

    # ── Lectura ───────────────────────────────────────────────────────────────

    def todos(self) -> list[dict]:
        return list(self._libros)

    def buscar(self, titulo: str) -> Optional[dict]:
        t = titulo.lower()
        return next((l for l in self._libros if l["titulo"].lower() == t), None)

    # ── Escritura ─────────────────────────────────────────────────────────────

    def agregar(self, libro: dict) -> None:
        self._libros.append(libro)
        repository.guardar_libro(libro)
        self._notify()

    def actualizar(self, libro: dict) -> None:
        titulo = libro["titulo"].lower()
        for i, l in enumerate(self._libros):
            if l["titulo"].lower() == titulo:
                self._libros[i] = libro
                break
        repository.guardar_libro(libro)
        self._notify()

    def eliminar(self, titulo: str) -> None:
        self._libros = [l for l in self._libros if l["titulo"].lower() != titulo.lower()]
        repository.eliminar_libro(titulo)
        self._notify()

    # ── WebSocket notifications ────────────────────────────────────────────────

    def on_change(self, callback) -> None:
        """Registra un callback async para notificar cambios."""
        self._on_change_callbacks.append(callback)

    def _notify(self) -> None:
        for cb in self._on_change_callbacks:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.ensure_future(cb(self._libros))
            except RuntimeError:
                pass


# Singleton global
store = Store()
