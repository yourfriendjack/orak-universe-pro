"""
backend/ai/narrator.py
========================
Servicio de IA narrativa — preparado para integrar LLMs.
Actualmente retorna respuestas stub. Conectar a OpenAI/Anthropic cuando esté listo.

Uso futuro:
    from backend.ai.narrator import narrator
    sugerencia = await narrator.sugerir_evento(libro)
"""
from typing import Optional
from backend.core.config import get_settings


class NarratorAI:
    """
    Motor de IA para asistencia narrativa en ORAK Universe.

    Capacidades planeadas:
    - Sugerir eventos coherentes con la historia
    - Generar descripciones de personajes
    - Detectar inconsistencias narrativas
    - Proponer arcos de trama
    - Expandir lore de facciones
    """

    def __init__(self):
        self.cfg = get_settings()
        self._client = None

    def _get_client(self):
        """Lazy init del cliente de IA."""
        if self._client:
            return self._client
        if self.cfg.OPENAI_API_KEY:
            try:
                import openai
                self._client = openai.AsyncOpenAI(api_key=self.cfg.OPENAI_API_KEY)
                return self._client
            except ImportError:
                pass
        return None

    async def sugerir_evento(self, libro: dict) -> str:
        """Sugiere un evento narrativo para el libro dado."""
        # TODO: implementar con LLM
        return f"[IA] Sugerencia de evento para '{libro.get('titulo', '?')}' — próximamente."

    async def describir_personaje(self, personaje: dict) -> str:
        """Genera una descripción narrativa para un personaje."""
        # TODO: implementar con LLM
        return f"[IA] Descripción de '{personaje.get('nombre', '?')}' — próximamente."

    async def detectar_inconsistencias(self, libros: list) -> list[str]:
        """Detecta problemas narrativos con IA (complementa orak_core.detectar_errores)."""
        # TODO: implementar con LLM
        return []

    @property
    def disponible(self) -> bool:
        return bool(self.cfg.OPENAI_API_KEY or self.cfg.ANTHROPIC_API_KEY)


# Singleton global
narrator = NarratorAI()
