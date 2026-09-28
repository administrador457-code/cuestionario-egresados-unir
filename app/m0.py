"""Precarga desde M0 (encuesta institucional Momento 0).

Traduce un registro de M0 a los campos del registro de la app (web/), para
que el egresado solo revise y corrija lo que UNIR ya sabe de él.

IMPORTANTE: hoy la consulta es solo por documento y devuelve datos
personales. Sirve para la demo; antes de conectar la base M0 real hay que
exigir un segundo factor (p. ej. código enviado al correo registrado en M0).
"""
from __future__ import annotations

from datetime import date
from typing import Any


def _situacion_laboral(m0: dict[str, Any]) -> list[str]:
    """Pregunta 1 de la app a partir de M0."""
    if m0.get("empleado_actual"):
        if m0.get("tipo_empleo") == "cuenta_propia":
            return ["independiente"]
        return ["tiempo_parcial"] if m0.get("jornada") == "parcial" else ["tiempo_completo"]
    if m0.get("empleado_actual") is False:
        motivos = m0.get("motivos_desempleo") or []
        return ["buscando_empleo"] if "buscando_empleo" in motivos or not motivos else ["no_busco_empleo"]
    return []


def _anio(fecha: date | None) -> int | None:
    return fecha.year if fecha else None


def precarga(m0: dict[str, Any]) -> dict[str, Any]:
    """Respuesta de GET /api/m0/...: campos listos para el formulario + contexto de M0."""
    return {
        "source": "M0",
        "demo": bool(m0.get("es_demo")),
        "profile": {
            "firstName": m0["nombres"],
            "lastName": m0["apellidos"],
            "email": m0.get("correo") or "",
            "phone": m0.get("telefono") or "",
            "country": m0.get("pais") or "",
            "city": m0.get("ciudad") or "",
            "program": str(m0["programa_id"]) if m0.get("programa_id") else "",
            "graduationYear": _anio(m0.get("fecha_titulo")),
        },
        "survey": {
            "employmentStatus": _situacion_laboral(m0),
            "targetRole": m0.get("trabajo_esperado") or "",
        },
        "context": {
            "currentRole": m0.get("cargo_actual"),
            "company": m0.get("empresa"),
            "employed": m0.get("empleado_actual"),
            "surveyDate": m0["fecha_encuesta"].isoformat() if m0.get("fecha_encuesta") else None,
        },
    }
