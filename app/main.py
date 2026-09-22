"""API del cuestionario de ingreso para egresados UNIR.

Endpoints:
    GET  /api/health
    GET  /api/preguntas                      -> las 10 preguntas con sus opciones
    POST /api/respuestas                     -> guarda respuestas y devuelve recomendaciones
    GET  /api/egresados/{token}/recomendaciones

El frontend (carpeta /frontend) se sirve en la raiz del mismo servicio.
"""
from __future__ import annotations

import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from . import db
from .preguntas import (
    AREAS_DESEMPENO,
    HABILIDADES,
    HORAS_SEMANALES,
    HORIZONTE_META,
    MAX_AREAS,
    MAX_HABILIDADES,
    MAX_SECTORES,
    NIVEL_FORMACION,
    PROGRAMA_NO_LISTADO,
    SECTORES_ECONOMICOS,
    SITUACION_LABORAL,
    TIPO_FORMACION,
    VERSION_CUESTIONARIO,
    construir_preguntas,
    valores,
)
from .recomendador import recomendar

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

@asynccontextmanager
async def _ciclo_de_vida(_: FastAPI):
    db.aplicar_esquema()  # crea las tablas propias si no existen
    yield


app = FastAPI(title="Cuestionario de ingreso - Egresados UNIR", version="1.0.0", lifespan=_ciclo_de_vida)

_origenes = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if _origenes:
    app.add_middleware(
        CORSMiddleware, allow_origins=_origenes, allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
    )


class Respuestas(BaseModel):
    situacion_laboral: str
    nivel_formacion: str
    programa_egreso: str
    cargo_aspirado: str = Field(min_length=2, max_length=120)
    areas_interes: list[str] = Field(min_length=1, max_length=MAX_AREAS)
    sectores_interes: list[str] = Field(min_length=1, max_length=MAX_SECTORES)
    tipo_formacion: str
    habilidades_fortalecer: list[str] = Field(min_length=1, max_length=MAX_HABILIDADES)
    horizonte_meta: str
    horas_semanales: str

    @field_validator("cargo_aspirado")
    @classmethod
    def _limpiar_cargo(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Escribe el cargo al que aspiras.")
        return v

    @model_validator(mode="after")
    def _validar_opciones(self) -> "Respuestas":
        unicas = {
            "situacion_laboral": SITUACION_LABORAL, "nivel_formacion": NIVEL_FORMACION,
            "tipo_formacion": TIPO_FORMACION, "horizonte_meta": HORIZONTE_META,
            "horas_semanales": HORAS_SEMANALES,
        }
        for campo, catalogo in unicas.items():
            if getattr(self, campo) not in valores(catalogo):
                raise ValueError(f"Opción no válida en '{campo}'.")
        multiples = {
            "areas_interes": AREAS_DESEMPENO, "sectores_interes": SECTORES_ECONOMICOS,
            "habilidades_fortalecer": HABILIDADES,
        }
        for campo, catalogo in multiples.items():
            elegidos = getattr(self, campo)
            if len(set(elegidos)) != len(elegidos) or not set(elegidos) <= valores(catalogo):
                raise ValueError(f"Opciones no válidas en '{campo}'.")
        if self.programa_egreso != PROGRAMA_NO_LISTADO and not self.programa_egreso.isdigit():
            raise ValueError("Programa de egreso no válido.")
        return self


class EnvioCuestionario(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    email: EmailStr
    acepta_tratamiento_datos: bool
    respuestas: Respuestas

    @field_validator("acepta_tratamiento_datos")
    @classmethod
    def _debe_aceptar(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Debes aceptar la política de tratamiento de datos para continuar.")
        return v


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"estado": "ok"}


@app.get("/api/preguntas")
def preguntas() -> dict[str, Any]:
    programas = db.listar_programas()
    return {
        "version": VERSION_CUESTIONARIO,
        "total_programas": len(programas),
        "preguntas": construir_preguntas(programas),
    }


@app.post("/api/respuestas")
def enviar_respuestas(envio: EnvioCuestionario) -> dict[str, Any]:
    perfil = envio.respuestas.model_dump()
    programas = db.listar_programas()

    if perfil["programa_egreso"] != PROGRAMA_NO_LISTADO:
        ids = {str(p["id"]) for p in programas}
        if perfil["programa_egreso"] not in ids:
            raise HTTPException(422, "El programa de egreso no está en el catálogo.")

    egresado = db.guardar_respuestas(
        nombre=" ".join(envio.nombre.split()),
        email=envio.email.lower(),
        acepta=envio.acepta_tratamiento_datos,
        perfil=perfil,
        version=VERSION_CUESTIONARIO,
    )
    sugeridas = recomendar(perfil, programas)
    db.guardar_recomendaciones(egresado["id"], sugeridas)
    return {"token": egresado["token"], "recomendaciones": sugeridas}


@app.get("/api/egresados/{token}/recomendaciones")
def ver_recomendaciones(token: str) -> dict[str, Any]:
    try:
        uuid.UUID(token)
    except ValueError:
        raise HTTPException(404, "No encontramos ese registro.")
    egresado = db.obtener_por_token(token)
    if not egresado:
        raise HTTPException(404, "No encontramos ese registro.")
    return {
        "nombre": egresado["nombre"],
        "cargo_aspirado": egresado.get("cargo_aspirado"),
        "recomendaciones": db.obtener_recomendaciones(egresado["id"]),
    }


if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
