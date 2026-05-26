"""
orak_core.py  —  Núcleo de ORAK sin estado global
==================================================
Toda la lógica de negocio vive aquí, desacoplada del
archivo JSON y de la GUI. Tanto el servidor como la GUI
local importan de aquí.

Cambio clave vs orak.py original:
  - No hay variable global `libros`
  - Todas las funciones reciben y devuelven datos explícitamente
  - Listo para ser usado por FastAPI y por la GUI local
"""

from __future__ import annotations
import json
import os
from typing import Optional

# ── Tipos simples ────────────────────────────────────────────
Libro     = dict
Personaje = dict
Evento    = dict
Lugar     = dict
Faccion   = dict
Relacion  = dict

# ── Estructura vacía garantizada ─────────────────────────────

def _libro_vacio(titulo: str) -> Libro:
    return {
        "titulo":      titulo,
        "descripcion": "",
        "historia":    "",
        "personajes":  [],
        "eventos":     [],
        "lugares":     [],
        "facciones":   [],
        "relaciones":  [],
    }

def _personaje_vacio(nombre: str, nacimiento: int, muerte: Optional[int] = None,
                     rol: str = "", descripcion: str = "", nivel: int = 1,
                     raza: str = "", clase: str = "") -> Personaje:
    return {
        "nombre":      nombre,
        "nacimiento":  nacimiento,
        "muerte":      muerte,
        "rol":         rol,
        "descripcion": descripcion,
        "nivel":       nivel,
        "raza":        raza,
        "clase":       clase,
        "habilidades": [],
        "armas":       [],
    }

def _lugar_vacio(nombre: str, tipo: str, descripcion: str) -> Lugar:
    return {
        "nombre":      nombre,
        "tipo":        tipo,        # ciudad, region, territorio, otro
        "descripcion": descripcion,
        "facciones":   [],          # facciones presentes en este lugar
    }

def _faccion_vacia(nombre: str, tipo: str, descripcion: str) -> Faccion:
    return {
        "nombre":      nombre,
        "tipo":        tipo,        # imperio, orden, banda, organizacion, otro
        "descripcion": descripcion,
        "miembros":    [],          # nombres de personajes
        "aliados":     [],          # nombres de otras facciones
        "enemigos":    [],
    }

def _relacion_vacia(personaje_a: str, personaje_b: str, tipo: str, descripcion: str) -> Relacion:
    return {
        "personaje_a":  personaje_a,
        "personaje_b":  personaje_b,
        "tipo":         tipo,       # aliado, enemigo, familiar, mentor, rival, amante, otro
        "descripcion":  descripcion,
    }

# ── Persistencia ──────────────────────────────────────────────

def cargar_desde_archivo(ruta: str) -> list[Libro]:
    if not os.path.exists(ruta):
        return []
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            datos = json.load(f)
            return datos if isinstance(datos, list) else []
    except (json.JSONDecodeError, OSError) as e:
        print(f"⚠ Error al leer {ruta}: {e}")
        return []

def guardar_en_archivo(libros: list[Libro], ruta: str) -> None:
    try:
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(libros, f, indent=4, ensure_ascii=False)
    except OSError as e:
        print(f"⚠ Error al guardar {ruta}: {e}")

# ── Libros ────────────────────────────────────────────────────

def agregar_libro(libros: list, titulo: str) -> tuple[bool, str]:
    titulo = titulo.strip()
    if not titulo:
        return False, "El título no puede estar vacío"
    if any(l["titulo"] == titulo for l in libros):
        return False, f"Ya existe un libro llamado '{titulo}'"
    libros.append(_libro_vacio(titulo))
    return True, "Libro agregado"

def eliminar_libro(libros: list, titulo: str) -> tuple[bool, str]:
    original = len(libros)
    libros[:] = [l for l in libros if l["titulo"] != titulo]
    if len(libros) < original:
        return True, "Libro eliminado"
    return False, "Libro no encontrado"

def _buscar_libro(libros: list, titulo: str) -> Optional[Libro]:
    return next((l for l in libros if l["titulo"] == titulo), None)

# ── Eventos ───────────────────────────────────────────────────

def agregar_evento(libros: list, titulo_libro: str,
                   descripcion: str, año: int, personaje: str = "") -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    if not descripcion.strip():
        return False, "La descripción no puede estar vacía"
    libro["eventos"].append({
        "descripcion": descripcion.strip(),
        "año":         int(año),
        "personaje":   personaje.strip(),
    })
    return True, "Evento agregado"

def editar_evento(libros: list, titulo_libro: str, indice: int,
                  nueva_desc: Optional[str] = None,
                  nuevo_año:  Optional[int] = None,
                  nuevo_per:  Optional[str] = None) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    eventos = libro.get("eventos", [])
    if not (0 <= indice < len(eventos)):
        return False, "Índice de evento inválido"
    if nueva_desc is not None:
        eventos[indice]["descripcion"] = nueva_desc.strip()
    if nuevo_año is not None:
        eventos[indice]["año"] = int(nuevo_año)
    if nuevo_per is not None:
        eventos[indice]["personaje"] = nuevo_per.strip()
    return True, "Evento editado"

def eliminar_evento(libros: list, titulo_libro: str, indice: int) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    eventos = libro.get("eventos", [])
    if not (0 <= indice < len(eventos)):
        return False, "Índice de evento inválido"
    del eventos[indice]
    return True, "Evento eliminado"

# ── Personajes ────────────────────────────────────────────────

def agregar_personaje(libros: list, titulo_libro: str, nombre: str,
                      nacimiento: int = 0, muerte: Optional[int] = None,
                      rol: str = "", descripcion: str = "", nivel: int = 1,
                      raza: str = "", clase: str = "") -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    if not nombre.strip():
        return False, "El nombre no puede estar vacío"
    if any(p["nombre"] == nombre for p in libro.get("personajes", [])):
        return False, f"Ya existe un personaje llamado '{nombre}'"
    libro["personajes"].append(_personaje_vacio(
        nombre.strip(), int(nacimiento), muerte,
        rol, descripcion, nivel, raza, clase
    ))
    return True, "Personaje agregado"

# Sentinel para distinguir "no se pasó el campo" de "se pasó None explícitamente"
_UNSET = object()

def editar_personaje(libros: list, titulo_libro: str, nombre_actual: str,
                     nuevo_nombre:      Optional[str] = None,
                     nuevo_nacimiento:  Optional[int] = None,
                     nueva_muerte:      object        = _UNSET) -> tuple[bool, str]:
    """
    nueva_muerte puede ser:
      _UNSET  → no tocar el campo
      None    → borrar la muerte (personaje revive)
      int     → asignar año de muerte
    """
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    p = next((x for x in libro.get("personajes", []) if x["nombre"] == nombre_actual), None)
    if not p:
        return False, "Personaje no encontrado"
    if nuevo_nombre is not None:
        p["nombre"] = nuevo_nombre.strip()
    if nuevo_nacimiento is not None:
        p["nacimiento"] = int(nuevo_nacimiento)
    if nueva_muerte is not _UNSET:
        p["muerte"] = int(nueva_muerte) if nueva_muerte is not None else None
    return True, "Personaje editado"

def eliminar_personaje(libros: list, titulo_libro: str, nombre: str) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    original = len(libro.get("personajes", []))
    libro["personajes"] = [p for p in libro["personajes"] if p["nombre"] != nombre]
    if len(libro["personajes"]) < original:
        return True, "Personaje eliminado"
    return False, "Personaje no encontrado"

def _buscar_personaje(libro: Libro, nombre: str) -> Optional[Personaje]:
    return next((p for p in libro.get("personajes", []) if p["nombre"] == nombre), None)

# ── Habilidades y armas ───────────────────────────────────────

def agregar_habilidad(libros: list, titulo_libro: str,
                      nombre_per: str, habilidad: str) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    p = _buscar_personaje(libro, nombre_per)
    if not p:
        return False, "Personaje no encontrado"
    p.setdefault("habilidades", []).append(habilidad.strip())
    return True, "Habilidad agregada"

def editar_habilidad(libros: list, titulo_libro: str, nombre_per: str,
                     indice: int, nueva: str) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    p = _buscar_personaje(libro, nombre_per)
    if not p:
        return False, "Personaje no encontrado"
    habs = p.get("habilidades", [])
    if not (0 <= indice < len(habs)):
        return False, "Índice inválido"
    habs[indice] = nueva.strip()
    return True, "Habilidad editada"

def agregar_arma(libros: list, titulo_libro: str,
                 nombre_per: str, arma: str) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    p = _buscar_personaje(libro, nombre_per)
    if not p:
        return False, "Personaje no encontrado"
    p.setdefault("armas", []).append(arma.strip())
    return True, "Arma agregada"

def editar_arma(libros: list, titulo_libro: str, nombre_per: str,
                indice: int, nueva: str) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    p = _buscar_personaje(libro, nombre_per)
    if not p:
        return False, "Personaje no encontrado"
    armas = p.get("armas", [])
    if not (0 <= indice < len(armas)):
        return False, "Índice inválido"
    armas[indice] = nueva.strip()
    return True, "Arma editada"

def eliminar_habilidad(libros: list, titulo_libro: str,
                        nombre_per: str, indice: int) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    p = _buscar_personaje(libro, nombre_per)
    if not p:
        return False, "Personaje no encontrado"
    habs = p.get("habilidades", [])
    if not (0 <= indice < len(habs)):
        return False, "Índice inválido"
    del habs[indice]
    return True, "Habilidad eliminada"

def eliminar_arma(libros: list, titulo_libro: str,
                   nombre_per: str, indice: int) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    p = _buscar_personaje(libro, nombre_per)
    if not p:
        return False, "Personaje no encontrado"
    armas = p.get("armas", [])
    if not (0 <= indice < len(armas)):
        return False, "Índice inválido"
    del armas[indice]
    return True, "Arma eliminada"

# ── Consultas ─────────────────────────────────────────────────

def obtener_timeline(libros: list) -> list[dict]:
    timeline = []
    for libro in libros:
        for evento in libro.get("eventos", []):
            timeline.append({
                "libro":       libro["titulo"],
                "descripcion": evento["descripcion"],
                "año":         evento["año"],
                "personaje":   evento.get("personaje", ""),
            })
    return sorted(timeline, key=lambda x: x["año"])

def detectar_errores(libros: list) -> list[str]:
    errores = []
    for libro in libros:
        if not libro.get("eventos"):
            errores.append(f"⚠ '{libro['titulo']}' sin eventos")
        for p in libro.get("personajes", []):
            nac    = p.get("nacimiento", 0)
            muerte = p.get("muerte")
            for ev in libro.get("eventos", []):
                if ev.get("personaje") == p["nombre"]:
                    if ev["año"] < nac:
                        errores.append(
                            f"❌ {p['nombre']} participa antes de nacer "
                            f"({ev['año']} < {nac})"
                        )
                    if muerte and ev["año"] > muerte:
                        errores.append(
                            f"❌ {p['nombre']} participa después de morir "
                            f"({ev['año']} > {muerte})"
                        )
    return errores

def reparar_universo(libros: list) -> int:
    """Asegura estructura mínima en todos los libros. Devuelve número de cambios."""
    cambios = 0
    for libro in libros:
        for campo in ("personajes", "eventos", "lugares", "facciones", "relaciones"):
            if campo not in libro:
                libro[campo] = []
                cambios += 1
        for campo in ("descripcion", "historia"):
            if campo not in libro:
                libro[campo] = ""
                cambios += 1
        for p in libro.get("personajes", []):
            for campo in ("habilidades", "armas"):
                if campo not in p:
                    p[campo] = []
                    cambios += 1
            if "nacimiento" not in p:
                p["nacimiento"] = 0
                cambios += 1
            if "muerte" not in p:
                p["muerte"] = None
                cambios += 1
    return cambios

# ── Lugares ───────────────────────────────────────────────────

def agregar_lugar(libros: list, titulo_libro: str, nombre: str,
                  tipo: str = "ciudad", descripcion: str = "") -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    if not nombre.strip():
        return False, "El nombre no puede estar vacío"
    if any(l["nombre"] == nombre for l in libro.get("lugares", [])):
        return False, f"Ya existe un lugar llamado '{nombre}'"
    libro.setdefault("lugares", []).append(_lugar_vacio(nombre.strip(), tipo, descripcion))
    return True, "Lugar agregado"

def editar_lugar(libros: list, titulo_libro: str, nombre_actual: str,
                 nuevo_nombre: Optional[str] = None, nuevo_tipo: Optional[str] = None,
                 nueva_desc: Optional[str] = None) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    lugar = next((l for l in libro.get("lugares", []) if l["nombre"] == nombre_actual), None)
    if not lugar:
        return False, "Lugar no encontrado"
    if nuevo_nombre is not None:
        lugar["nombre"] = nuevo_nombre.strip()
    if nuevo_tipo is not None:
        lugar["tipo"] = nuevo_tipo
    if nueva_desc is not None:
        lugar["descripcion"] = nueva_desc
    return True, "Lugar editado"

def eliminar_lugar(libros: list, titulo_libro: str, nombre: str) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    original = len(libro.get("lugares", []))
    libro["lugares"] = [l for l in libro["lugares"] if l["nombre"] != nombre]
    if len(libro["lugares"]) < original:
        return True, "Lugar eliminado"
    return False, "Lugar no encontrado"

# ── Facciones ─────────────────────────────────────────────────

def agregar_faccion(libros: list, titulo_libro: str, nombre: str,
                    tipo: str = "organizacion", descripcion: str = "") -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    if not nombre.strip():
        return False, "El nombre no puede estar vacío"
    if any(f["nombre"] == nombre for f in libro.get("facciones", [])):
        return False, f"Ya existe una facción llamada '{nombre}'"
    libro.setdefault("facciones", []).append(_faccion_vacia(nombre.strip(), tipo, descripcion))
    return True, "Facción agregada"

def editar_faccion(libros: list, titulo_libro: str, nombre_actual: str,
                   nuevo_nombre: Optional[str] = None, nuevo_tipo: Optional[str] = None,
                   nueva_desc: Optional[str] = None) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    f = next((x for x in libro.get("facciones", []) if x["nombre"] == nombre_actual), None)
    if not f:
        return False, "Facción no encontrada"
    if nuevo_nombre is not None:
        f["nombre"] = nuevo_nombre.strip()
    if nuevo_tipo is not None:
        f["tipo"] = nuevo_tipo
    if nueva_desc is not None:
        f["descripcion"] = nueva_desc
    return True, "Facción editada"

def eliminar_faccion(libros: list, titulo_libro: str, nombre: str) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    original = len(libro.get("facciones", []))
    libro["facciones"] = [f for f in libro["facciones"] if f["nombre"] != nombre]
    if len(libro["facciones"]) < original:
        return True, "Facción eliminada"
    return False, "Facción no encontrada"

def agregar_miembro_faccion(libros: list, titulo_libro: str,
                             nombre_faccion: str, nombre_personaje: str) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    f = next((x for x in libro.get("facciones", []) if x["nombre"] == nombre_faccion), None)
    if not f:
        return False, "Facción no encontrada"
    if nombre_personaje not in f["miembros"]:
        f["miembros"].append(nombre_personaje)
    return True, "Miembro agregado"

# ── Relaciones entre personajes ───────────────────────────────

def agregar_relacion(libros: list, titulo_libro: str, personaje_a: str,
                     personaje_b: str, tipo: str, descripcion: str = "") -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    # Verificar que existan ambos personajes
    nombres = [p["nombre"] for p in libro.get("personajes", [])]
    if personaje_a not in nombres:
        return False, f"Personaje '{personaje_a}' no encontrado"
    if personaje_b not in nombres:
        return False, f"Personaje '{personaje_b}' no encontrado"
    # Evitar duplicados
    rels = libro.setdefault("relaciones", [])
    ya_existe = any(
        (r["personaje_a"] == personaje_a and r["personaje_b"] == personaje_b) or
        (r["personaje_a"] == personaje_b and r["personaje_b"] == personaje_a)
        for r in rels
    )
    if ya_existe:
        return False, "Ya existe una relación entre estos personajes"
    rels.append(_relacion_vacia(personaje_a, personaje_b, tipo, descripcion))
    return True, "Relación agregada"

def eliminar_relacion(libros: list, titulo_libro: str, indice: int) -> tuple[bool, str]:
    libro = _buscar_libro(libros, titulo_libro)
    if not libro:
        return False, "Libro no encontrado"
    rels = libro.get("relaciones", [])
    if not (0 <= indice < len(rels)):
        return False, "Índice inválido"
    del rels[indice]
    return True, "Relación eliminada"
