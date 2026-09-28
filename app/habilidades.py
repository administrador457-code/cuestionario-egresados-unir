"""Capa de normalización de habilidades y cargos.

Las vacantes (plataforma de pertinencia), los programas UNIR y lo que declara
el egresado nombran lo mismo de formas distintas: "python" y "Python",
"api" y "APIs", "BI" y "business intelligence". Aquí se reducen a una clave
única, para que las tres fuentes se puedan comparar.

Para agregar un sinónimo: añádelo a SINONIMOS (variante -> clave canónica,
ambas ya normalizadas). Para fijar cómo se muestra una habilidad: NOMBRES.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from typing import Any, Iterable

from .normalizar import normalizar

# Variante normalizada -> clave canónica normalizada.
SINONIMOS: dict[str, str] = {
    "apis": "api",
    "api rest": "api",
    "rest api": "api",
    "bi": "business intelligence",
    "inteligencia de negocios": "business intelligence",
    "inteligencia de negocio": "business intelligence",
    "ia": "inteligencia artificial",
    "ai": "inteligencia artificial",
    "artificial intelligence": "inteligencia artificial",
    "ml": "machine learning",
    "aprendizaje automatico": "machine learning",
    "powerbi": "power bi",
    "microsoft power bi": "power bi",
    "ms excel": "excel",
    "microsoft excel": "excel",
    "excel avanzado": "excel",
    "agil": "agile",
    "metodologias agiles": "agile",
    "metodologia agil": "agile",
    "comunicacion efectiva": "comunicacion",
    "comunicacion asertiva": "comunicacion",
    "teamwork": "trabajo en equipo",
    "leadership": "liderazgo",
    "amazon web services": "aws",
    "microsoft azure": "azure",
    "google cloud platform": "google cloud",
    "gcp": "google cloud",
    "postgres": "postgresql",
    "js": "javascript",
    "analisis de datos": "analitica de datos",
    "data analysis": "analitica de datos",
    "data analytics": "analitica de datos",
    "visualizacion": "visualizacion de datos",
    "data visualization": "visualizacion de datos",
    "gestion de proyectos": "gestion de proyectos",
    "project management": "gestion de proyectos",
    "ingles": "ingles",
    "english": "ingles",
}

# Cómo se muestra cada clave (si no está aquí, se usa la forma más frecuente).
NOMBRES: dict[str, str] = {
    "api": "APIs",
    "business intelligence": "Business Intelligence",
    "inteligencia artificial": "Inteligencia artificial",
    "machine learning": "Machine learning",
    "power bi": "Power BI",
    "excel": "Excel",
    "sql": "SQL",
    "python": "Python",
    "aws": "AWS",
    "azure": "Azure",
    "google cloud": "Google Cloud",
    "agile": "Agile",
    "scrum": "Scrum",
    "oracle": "Oracle",
    "postgresql": "PostgreSQL",
    "javascript": "JavaScript",
    "comunicacion": "Comunicación",
    "trabajo en equipo": "Trabajo en equipo",
    "liderazgo": "Liderazgo",
    "pensamiento analitico": "Pensamiento analítico",
    "analitica de datos": "Analítica de datos",
    "visualizacion de datos": "Visualización de datos",
    "gestion de proyectos": "Gestión de proyectos",
    "ingles": "Inglés",
}

CATEGORIAS_VACIAS = {"", "unknown", "unclassified", "none", "null"}


def clave_habilidad(texto: str | None) -> str:
    """Clave canónica de una habilidad: minúsculas, sin tildes y con sinónimos resueltos."""
    base = normalizar(texto)
    # Conserva C++, C#, .NET de forma legible en la clave
    if texto and re.search(r"c\+\+|c#|\.net", texto, re.IGNORECASE):
        base = texto.strip().lower()
    return SINONIMOS.get(base, base)


def _mejor_nombre(formas: Counter) -> str:
    """La forma original más frecuente; ante empate, la que tiene mayúsculas."""
    return max(formas.items(), key=lambda kv: (kv[1], any(c.isupper() for c in kv[0])))[0].strip()


def consolidar_habilidades(
    filas_vacantes: Iterable[dict[str, Any]],
    skills_programas: Iterable[str],
) -> list[dict[str, Any]]:
    """Une las habilidades de vacantes y programas en un catálogo normalizado.

    `filas_vacantes`: dicts con `nombre`, `categoria` y `vacantes` (número de
    vacantes vigentes que la piden), tal como salen de la plataforma.
    """
    vacantes: Counter = Counter()
    formas: dict[str, Counter] = defaultdict(Counter)
    categorias: dict[str, Counter] = defaultdict(Counter)
    for fila in filas_vacantes:
        clave = clave_habilidad(fila.get("nombre"))
        if len(clave) < 2:
            continue
        vacantes[clave] += int(fila.get("vacantes") or 0)
        formas[clave][fila["nombre"]] += int(fila.get("vacantes") or 1)
        categoria = (fila.get("categoria") or "").strip()
        if categoria.lower() not in CATEGORIAS_VACIAS:
            categorias[clave][categoria] += 1

    en_programas: set[str] = set()
    for nombre in skills_programas:
        clave = clave_habilidad(nombre)
        if len(clave) < 2:
            continue
        en_programas.add(clave)
        formas[clave][nombre] += 0 if clave in vacantes else 1

    catalogo = []
    for clave in set(vacantes) | en_programas:
        nombre = NOMBRES.get(clave) or _mejor_nombre(formas[clave]) or clave
        catalogo.append({
            "clave": clave,
            "nombre": nombre[:1].upper() + nombre[1:],
            "categoria": categorias[clave].most_common(1)[0][0] if categorias[clave] else None,
            "vacantes": vacantes.get(clave, 0),
            "en_programas": clave in en_programas,
        })
    catalogo.sort(key=lambda h: (-h["vacantes"], h["clave"]))
    return catalogo


# ------------------------------------------------------------------ cargos
_RUIDO_CARGO = re.compile(
    r"\((?:a|as|o|os|a/o|o/a|e)\)|\b(?:urgente|importante empresa|se requiere|se busca|vacante)\b",
    re.IGNORECASE,
)


def limpiar_cargo(titulo: str | None) -> str:
    """Quita ruido frecuente de los títulos de vacantes: '(a)', ciudades tras guion, 'urgente'."""
    if not titulo:
        return ""
    texto = _RUIDO_CARGO.sub(" ", titulo)
    texto = re.split(r"\s[-–|/]\s", texto)[0]          # "Analista de datos - Bogotá" -> "Analista de datos"
    texto = re.sub(r"\s+", " ", texto).strip(" .,-")
    return texto if 3 <= len(texto) <= 80 else ""


def consolidar_cargos(filas: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Agrupa títulos de vacantes por clave normalizada, con el nombre más frecuente."""
    conteo: Counter = Counter()
    formas: dict[str, Counter] = defaultdict(Counter)
    for fila in filas:
        limpio = limpiar_cargo(fila.get("titulo"))
        if not limpio:
            continue
        clave = normalizar(limpio)
        n = int(fila.get("vacantes") or 1)
        conteo[clave] += n
        formas[clave][limpio] += n
    cargos = [
        {"clave": clave, "nombre": _mejor_nombre(formas[clave]), "vacantes": n}
        for clave, n in conteo.items()
    ]
    cargos.sort(key=lambda c: (-c["vacantes"], c["clave"]))
    return cargos
