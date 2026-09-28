"""Onboarding de 4 pantallas del frontend (web/).

1. Tu objetivo: cargo al que aspira + objetivo profesional.
2. Dónde te visualizas: áreas y sectores.
3. Lo que sabes: habilidades y herramientas que domina (catálogo normalizado).
4. Tu formación: tipos de formación de interés.

Lo que UNIR ya sabe del egresado (situación laboral, empresa, salario...) se
toma de M0; aquí solo se pregunta lo que hace falta para recomendar.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from .normalizar import normalizar
from .preguntas import AREAS_DESEMPENO
from .registro import (
    AREAS,
    PROGRAMA_OTRO,
    SECTORES,
    PerfilEgresado,
    _Camel,
    _opcion,
    _opciones,
)

VERSION_ONBOARDING = 1

OBJETIVOS = {"conseguir_empleo", "ascender", "cambiar_cargo", "cambiar_sector", "fortalecer_perfil"}
TIPOS_FORMACION = {"curso_certificacion", "diplomado", "especializacion", "maestria", "doctorado",
                   "no_seguro", "ninguna"}
EXCLUSIVAS_FORMACION = frozenset({"no_seguro", "ninguna"})
MAX_AREAS = 3
MAX_SECTORES = 3
MAX_HABILIDADES = 15


class PerfilOnboarding(PerfilEgresado):
    """Datos mínimos: los que identifican al egresado y lo cruzan con M0."""

    # En el onboarding no se piden: vienen de M0 o se completan después.
    phone: str | None = None  # type: ignore[assignment]
    country: str | None = None  # type: ignore[assignment]
    city: str | None = None  # type: ignore[assignment]

    @field_validator("phone")
    @classmethod
    def _telefono(cls, v: str | None) -> str | None:  # sin validación estricta aquí
        return v


class RespuestasOnboarding(_Camel):
    target_role: str = Field(min_length=2, max_length=150)
    career_goal: str
    performance_areas: list[str]
    economic_sectors: list[str]
    current_skills: list[str] = Field(max_length=MAX_HABILIDADES)
    education_types: list[str]

    @field_validator("target_role", mode="before")
    @classmethod
    def _cargo(cls, v: Any) -> Any:
        return " ".join(v.split()) if isinstance(v, str) else v

    @field_validator("career_goal")
    @classmethod
    def _objetivo(cls, v: str) -> str:
        return _opcion(v, OBJETIVOS, "careerGoal")

    @field_validator("performance_areas")
    @classmethod
    def _areas(cls, v: list[str]) -> list[str]:
        return _opciones(v, AREAS, "performanceAreas", maximo=MAX_AREAS)

    @field_validator("economic_sectors")
    @classmethod
    def _sectores(cls, v: list[str]) -> list[str]:
        return _opciones(v, SECTORES, "economicSectors", maximo=MAX_SECTORES)

    @field_validator("current_skills")
    @classmethod
    def _habilidades(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("Elige al menos una habilidad en 'currentSkills'.")
        if len(set(v)) != len(v):
            raise ValueError("Habilidades repetidas en 'currentSkills'.")
        return v

    @field_validator("education_types")
    @classmethod
    def _formacion(cls, v: list[str]) -> list[str]:
        return _opciones(v, TIPOS_FORMACION, "educationTypes", exclusivas=EXCLUSIVAS_FORMACION)


class OnboardingEgresado(_Camel):
    profile: PerfilOnboarding
    answers: RespuestasOnboarding
    prefilled_from_m0: bool = False
    completed_at: str | None = None
    status: Literal["completed"]


# --------------------------------------------------------- al recomendador
_TIPO_A_RECOMENDADOR = {
    "curso_certificacion": "curso_corto",
    "diplomado": "curso_corto",
    "especializacion": "especializacion",
    "maestria": "maestria",
    "doctorado": "doctorado",
}


def perfil_para_recomendador(onboarding: OnboardingEgresado, programas: list[dict[str, Any]]) -> dict[str, Any]:
    """Traduce el onboarding al perfil que usa app/recomendador.py.

    "No estoy seguro" y "Por ahora no" no filtran por tipo: el recomendador
    decide. Las habilidades actuales todavía no entran al puntaje (se usarán
    para calcular brechas frente a las vacantes).
    """
    r = onboarding.answers
    programa = onboarding.profile.program
    nivel = "profesional"
    if programa != PROGRAMA_OTRO:
        from .recomendador import tipo_programa

        cursado = next((p for p in programas if str(p["id"]) == programa), None)
        if cursado and tipo_programa(cursado) in ("especializacion", "maestria", "doctorado"):
            nivel = tipo_programa(cursado)
    return {
        "programa_egreso": programa,
        "nivel_formacion": nivel,
        "cargo_aspirado": r.target_role,
        "areas_interes": [a for a in r.performance_areas if a != "otra"],
        "sectores_interes": [s for s in r.economic_sectors if s != "otro"],
        "habilidades_fortalecer": [],
        "tipo_formacion": [_TIPO_A_RECOMENDADOR[t] for t in r.education_types if t in _TIPO_A_RECOMENDADOR],
        "horizonte_meta": "2_anios",
        "horas_semanales": "5_10",
    }


def areas_para_cargo(cargo: str, maximo: int = 3) -> list[str]:
    """Áreas de desempeño que sugiere el texto del cargo (para precargar la pantalla 2)."""
    texto = normalizar(cargo)
    if not texto:
        return []
    relleno = f" {texto} "
    puntajes = []
    for area in AREAS_DESEMPENO:
        aciertos = sum(1 for c in area["claves"] if f" {normalizar(c)} " in relleno)
        if aciertos:
            puntajes.append((aciertos, area["valor"]))
    puntajes.sort(key=lambda p: -p[0])
    return [valor for _, valor in puntajes[:maximo]]
