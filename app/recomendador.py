"""Recomendacion de programas UNIR a partir del perfil del egresado.

Es un puntaje ponderado y explicable (0 a 100). Cada componente devuelve un
valor entre 0 y 1 y las razones que lo justifican, para que el egresado y el
asesor vean por que se sugiere cada programa.

Pesos (suman 100):
    area de desempeno ............ 35
    cargo y habilidades .......... 30
    tipo y nivel de formacion .... 20
    sector economico ............. 10
    plazo y dedicacion ...........  5
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .normalizar import contiene_alguna, normalizar, tokens
from .preguntas import (
    AREAS_DESEMPENO,
    HABILIDADES,
    HORAS_SEMANALES,
    HORIZONTE_META,
    NIVEL_FORMACION,
    SECTORES_ECONOMICOS,
    por_valor,
)

PESOS = {"area": 35, "cargo_habilidades": 30, "formacion": 20, "sector": 10, "tiempo": 5}

# Un programa solo se recomienda si tiene afinidad real con lo que el egresado
# quiere (area + cargo/habilidades + sector). Formacion y tiempo por si solos no bastan.
AFINIDAD_MINIMA = 15

# Orden de nivel para comparar con el nivel del egresado
ORDEN_TIPO = {"pregrado": 2, "especializacion": 3, "maestria": 4, "doctorado": 5}
# Duracion aproximada en meses (solo para el componente de plazo)
DURACION_MESES = {"curso_corto": 3, "especializacion": 12, "maestria": 18, "doctorado": 36, "pregrado": 48}

_AREAS = por_valor(AREAS_DESEMPENO)
_SECTORES = por_valor(SECTORES_ECONOMICOS)
_HABILIDADES = por_valor(HABILIDADES)
_NIVELES = por_valor(NIVEL_FORMACION)
_HORIZONTES = por_valor(HORIZONTE_META)
_HORAS = por_valor(HORAS_SEMANALES)


def _claves_normalizadas(catalogo_item: dict[str, Any]) -> list[str]:
    return [normalizar(c) for c in catalogo_item.get("claves", [])]


def tipo_programa(programa: dict[str, Any]) -> str:
    """Deduce el tipo de programa a partir del nombre y del campo nivel."""
    texto = normalizar(f"{programa.get('nombre', '')} {programa.get('nivel', '')}")
    if "doctorado" in texto:
        return "doctorado"
    if any(p in texto for p in ("maestria", "master", "magister")):
        return "maestria"
    if "especializacion" in texto:
        return "especializacion"
    if any(p in texto for p in ("diplomado", "curso", "certificacion")):
        return "curso_corto"
    if any(p in texto for p in ("pregrado", "profesional", "licenciatura", "tecnologia en")):
        return "pregrado"
    return "posgrado"


@dataclass
class _ProgramaIndexado:
    datos: dict[str, Any]
    tipo: str
    nombre_norm: str
    texto_norm: str
    tokens: set[str] = field(default_factory=set)


def _indexar(programa: dict[str, Any]) -> _ProgramaIndexado:
    partes = [
        programa.get("nombre"), programa.get("descripcion"), programa.get("rol"),
        programa.get("campo_laboral"), programa.get("facultad"),
        " ".join(programa.get("dominios") or []), " ".join(programa.get("skills") or []),
    ]
    texto = normalizar(" ".join(p for p in partes if p))
    return _ProgramaIndexado(
        datos=programa,
        tipo=tipo_programa(programa),
        nombre_norm=normalizar(programa.get("nombre")),
        texto_norm=texto,
        tokens=tokens(texto),
    )


def _afinidad_catalogo(prog: _ProgramaIndexado, item: dict[str, Any]) -> float:
    """0..1: que tanto se relaciona el programa con un area/sector/habilidad."""
    claves = _claves_normalizadas(item)
    if contiene_alguna(prog.nombre_norm, claves):
        return 1.0
    aciertos = len(contiene_alguna(prog.texto_norm, claves))
    return min(1.0, aciertos / 2)


def _componente_area(prog, perfil) -> tuple[float, list[str]]:
    mejor, mejor_etiqueta = 0.0, None
    for valor in perfil.get("areas_interes") or []:
        item = _AREAS.get(valor)
        if not item:
            continue
        afinidad = _afinidad_catalogo(prog, item)
        if afinidad > mejor:
            mejor, mejor_etiqueta = afinidad, item["etiqueta"]
    razones = [f"Se relaciona con el área que elegiste: {mejor_etiqueta.lower()}."] if mejor >= 0.5 else []
    return mejor, razones


def _componente_cargo_habilidades(prog, perfil) -> tuple[float, list[str]]:
    razones: list[str] = []

    # Cargo aspirado (texto libre): palabras del cargo que aparecen en el programa
    tokens_cargo = tokens(perfil.get("cargo_aspirado"))
    puntaje_cargo = None
    if tokens_cargo:
        comunes = tokens_cargo & prog.tokens
        por_palabras = len(comunes) / len(tokens_cargo)
        puntaje_cargo = por_palabras
        # Credito parcial si el cargo apunta a un area que el programa cubre
        # (p. ej. "director de ventas" -> comercial), sin afirmar que prepara para el cargo.
        cargo_norm = normalizar(perfil.get("cargo_aspirado"))
        for item in AREAS_DESEMPENO:
            if contiene_alguna(cargo_norm, _claves_normalizadas(item)) and _afinidad_catalogo(prog, item) >= 0.5:
                puntaje_cargo = max(puntaje_cargo, 0.4)
                break
        # Solo se afirma "prepara para el cargo" si coinciden todas (o casi todas) sus palabras
        if por_palabras >= 0.99 or (len(tokens_cargo) >= 3 and por_palabras >= 0.66):
            razones.append(f"Prepara para el cargo al que aspiras ({perfil['cargo_aspirado'].strip()}).")

    # Habilidades que quiere fortalecer
    elegidas = [h for h in (perfil.get("habilidades_fortalecer") or []) if h in _HABILIDADES]
    puntaje_hab = None
    if elegidas:
        cubiertas = [_HABILIDADES[h]["etiqueta"] for h in elegidas if _afinidad_catalogo(prog, _HABILIDADES[h]) >= 0.5]
        puntaje_hab = len(cubiertas) / len(elegidas)
        if cubiertas:
            lista = ", ".join(c.lower() for c in cubiertas[:3])
            razones.append(f"Fortalece {len(cubiertas)} de las {len(elegidas)} habilidades que marcaste: {lista}.")

    partes = [p for p in (puntaje_cargo, puntaje_hab) if p is not None]
    return (sum(partes) / len(partes) if partes else 0.0), razones


def _componente_formacion(prog, perfil) -> tuple[float, list[str]]:
    razones: list[str] = []
    preferido = perfil.get("tipo_formacion")

    if preferido in ("especializacion", "maestria", "curso_corto"):
        coincide_tipo = 1.0 if prog.tipo == preferido else (0.4 if prog.tipo in ORDEN_TIPO else 0.2)
        if prog.tipo == preferido:
            razones.append("Es el tipo de formación que buscas.")
    else:  # sin_definir o ninguna: no penaliza el tipo
        coincide_tipo = 0.7

    nivel_egresado = (_NIVELES.get(perfil.get("nivel_formacion")) or {}).get("orden", 2)
    orden_programa = ORDEN_TIPO.get(prog.tipo)
    if orden_programa is None:  # curso corto o posgrado sin clasificar
        coherencia = 0.8
    elif orden_programa > nivel_egresado:
        coherencia = 1.0
    elif orden_programa == nivel_egresado:
        coherencia = 0.5
    else:
        coherencia = 0.1

    return (coincide_tipo + coherencia) / 2, razones


def _componente_sector(prog, perfil) -> tuple[float, list[str]]:
    mejor, etiqueta = 0.0, None
    for valor in perfil.get("sectores_interes") or []:
        item = _SECTORES.get(valor)
        if not item:
            continue
        afinidad = _afinidad_catalogo(prog, item)
        if afinidad > mejor:
            mejor, etiqueta = afinidad, item["etiqueta"]
    razones = [f"Tiene salida en el sector {etiqueta.lower()}."] if mejor >= 0.5 else []
    return mejor, razones


def _componente_tiempo(prog, perfil) -> tuple[float, list[str]]:
    razones: list[str] = []
    meses_meta = (_HORIZONTES.get(perfil.get("horizonte_meta")) or {}).get("meses", 24)
    horas = (_HORAS.get(perfil.get("horas_semanales")) or {}).get("horas", 8)
    duracion = DURACION_MESES.get(prog.tipo, 12)

    plazo = 1.0 if duracion <= meses_meta else 0.4
    exigente = prog.tipo in ("maestria", "doctorado")
    dedicacion = 0.5 if (exigente and horas < 5) else 1.0
    if plazo == 1.0 and dedicacion == 1.0:
        razones.append("Encaja con el plazo y el tiempo que puedes dedicar.")
    return (plazo + dedicacion) / 2, razones


COMPONENTES = {
    "area": _componente_area,
    "cargo_habilidades": _componente_cargo_habilidades,
    "formacion": _componente_formacion,
    "sector": _componente_sector,
    "tiempo": _componente_tiempo,
}


def recomendar(perfil: dict[str, Any], programas: list[dict[str, Any]], limite: int = 5) -> list[dict[str, Any]]:
    """Devuelve los `limite` programas mejor puntuados para el perfil.

    `perfil` usa las mismas claves que las preguntas (areas_interes,
    cargo_aspirado, etc.). `programa_egreso` puede ser el id del programa del
    que egreso, que se excluye.
    """
    excluido = str(perfil.get("programa_egreso") or "")
    candidatos = [
        _indexar(p) for p in programas
        if p.get("activo", True) and str(p.get("id")) != excluido
    ]

    # Si el egresado pidio especializacion o maestria y hay programas de ese
    # tipo, solo se consideran esos. Si no hay ninguno, se sigue con todos.
    preferido = perfil.get("tipo_formacion")
    if preferido in ("especializacion", "maestria"):
        del_tipo = [c for c in candidatos if c.tipo == preferido]
        if del_tipo:
            candidatos = del_tipo

    resultados = []
    for prog in candidatos:
        total = 0.0
        desglose: dict[str, float] = {}
        razones: list[str] = []
        for nombre, funcion in COMPONENTES.items():
            valor, motivos = funcion(prog, perfil)
            desglose[nombre] = round(valor * PESOS[nombre], 2)
            total += valor * PESOS[nombre]
            razones.extend(motivos)
        resultados.append({
            "programa_id": prog.datos.get("id"),
            "programa_nombre": prog.datos.get("nombre"),
            "tipo_programa": prog.tipo,
            "facultad": prog.datos.get("facultad"),
            "url": prog.datos.get("source_url"),
            "puntaje": round(total, 1),
            "desglose": desglose,
            "razones": razones[:4],
        })

    resultados = [
        r for r in resultados
        if r["desglose"]["area"] + r["desglose"]["cargo_habilidades"] + r["desglose"]["sector"] >= AFINIDAD_MINIMA
    ]
    resultados.sort(key=lambda r: (-r["puntaje"], r["programa_nombre"] or ""))
    for posicion, r in enumerate(resultados[:limite], start=1):
        r["posicion"] = posicion
    return resultados[:limite]
