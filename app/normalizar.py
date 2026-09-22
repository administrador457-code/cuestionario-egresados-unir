"""Utilidades de normalizacion de texto en espanol (sin tildes, minusculas)."""
from __future__ import annotations

import re
import unicodedata

STOPWORDS = {
    "a", "al", "ante", "con", "de", "del", "el", "en", "la", "las", "lo", "los",
    "para", "por", "que", "se", "su", "sus", "un", "una", "uno", "y", "o", "e",
    "como", "mas", "sobre", "entre", "hacia", "desde",
    # palabras genericas de cargos que no aportan al cruce
    "cargo", "puesto", "trabajo", "area", "nivel", "senior", "junior", "sr", "jr",
}


def normalizar(texto: str | None) -> str:
    """Minusculas, sin tildes y con espacios simples."""
    if not texto:
        return ""
    texto = unicodedata.normalize("NFKD", str(texto))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    texto = re.sub(r"[^a-z0-9 ]+", " ", texto.lower())
    return re.sub(r"\s+", " ", texto).strip()


def raiz(palabra: str) -> str:
    """Recorte basico de plural y genero para comparar palabras.

    gerentes/gerente -> gerent, coordinadora/coordinador -> coordinador,
    academica/academico -> academic, gestiones/gestion -> gestion.
    """
    if palabra.endswith("iones") and len(palabra) >= 7:
        palabra = palabra[:-2]
    elif palabra.endswith("s") and len(palabra) >= 5:
        palabra = palabra[:-1]
    if palabra.endswith("ora") and len(palabra) >= 6:
        return palabra[:-1]
    if palabra[-1:] in ("a", "e", "o") and len(palabra) >= 6:
        return palabra[:-1]
    return palabra


def tokens(texto: str | None) -> set[str]:
    """Palabras significativas (>= 3 letras, sin stopwords), con recorte simple de plural."""
    salida: set[str] = set()
    for palabra in normalizar(texto).split():
        if len(palabra) < 3 or palabra in STOPWORDS:
            continue
        salida.add(raiz(palabra))
    return salida


def contiene_alguna(texto_normalizado: str, claves: list[str]) -> list[str]:
    """Claves (ya normalizadas) que aparecen como palabra o frase dentro del texto."""
    relleno = f" {texto_normalizado} "
    encontradas = []
    for clave in claves:
        if f" {clave} " in relleno or (len(clave) >= 6 and clave in texto_normalizado):
            encontradas.append(clave)
    return encontradas
