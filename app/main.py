"""API del cuestionario de ingreso para egresados UNIR.

Endpoints:
    GET  /api/health
    GET  /api/preguntas                      -> las 10 preguntas con sus opciones
    POST /api/respuestas                     -> guarda respuestas y devuelve recomendaciones
    GET  /api/egresados/{token}/recomendaciones

Registro y caracterizacion (frontend React de web/, en Vercel):
    POST /api/registros                        -> guarda el registro y devuelve recomendaciones
    GET  /api/registros/{token}/recomendaciones
    GET  /api/m0/{tipo}/{numero}                -> precarga desde la base M0 (Momento 0)

Onboarding de 4 pantallas (web/):
    GET  /api/habilidades?q=                    -> catálogo normalizado de habilidades
    GET  /api/cargos?q=                         -> cargos de las vacantes vigentes
    GET  /api/areas-sugeridas?cargo=            -> áreas que sugiere un cargo
    POST /api/onboarding                        -> guarda y devuelve recomendaciones
    GET  /api/onboarding/{token}/recomendaciones

El frontend (carpeta /frontend) se sirve en la raiz del mismo servicio.
"""
from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
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
from .m0 import precarga
from .normalizar import normalizar
from .onboarding import VERSION_ONBOARDING, OnboardingEgresado, areas_para_cargo
from .onboarding import perfil_para_recomendador as perfil_onboarding
from .registro import PROGRAMA_OTRO, TIPOS_DOCUMENTO, VERSION_REGISTRO, RegistroEgresado, perfil_para_recomendador

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


# ------------------------------------------------------------------ registro nuevo (web/)
def _recomendacion_para_web(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "position": r["posicion"],
        "programId": r["programa_id"],
        "programName": r["programa_nombre"],
        "programType": r.get("tipo_programa"),
        "score": float(r["puntaje"]),
        "reasons": r["razones"],
        "url": r.get("url"),
    }


@app.post("/api/registros")
def crear_registro(registro: RegistroEgresado) -> dict[str, Any]:
    programas = db.listar_programas(solo_activos=False)
    programa = registro.profile.program
    if programa != PROGRAMA_OTRO and programa not in {str(p["id"]) for p in programas}:
        raise HTTPException(422, "El programa cursado no está en el catálogo.")

    guardado = db.guardar_registro(registro, VERSION_REGISTRO)
    activos = [p for p in programas if p.get("activo", True)]
    sugeridas = recomendar(perfil_para_recomendador(registro, activos), activos)
    db.guardar_recomendaciones_registro(guardado["id"], sugeridas)
    return {
        "registrationId": guardado["token"],
        "receivedAt": datetime.now(timezone.utc).isoformat(),
        "recommendations": [_recomendacion_para_web(r) for r in sugeridas],
    }


@app.get("/api/registros/{token}/recomendaciones")
def ver_recomendaciones_registro(token: str) -> dict[str, Any]:
    try:
        uuid.UUID(token)
    except ValueError:
        raise HTTPException(404, "No encontramos ese registro.")
    datos = db.obtener_recomendaciones_registro(token)
    if not datos:
        raise HTTPException(404, "No encontramos ese registro.")
    return {
        "name": datos["nombre"],
        "targetRole": datos["cargo_aspirado"],
        "recommendations": [_recomendacion_para_web(r) for r in datos["recomendaciones"]],
    }


# ------------------------------------------------------------------ M0 (precarga)
@app.get("/api/m0/{tipo_documento}/{numero_documento}")
def consultar_m0(tipo_documento: str, numero_documento: str) -> dict[str, Any]:
    """Datos de M0 para precargar el registro. Responde {"found": false} si no hay
    registro (no 404, para que el navegador no lo muestre como error). Solo por
    documento: válido para la demo; en producción debe exigir un segundo factor."""
    numero = numero_documento.strip()
    if tipo_documento not in TIPOS_DOCUMENTO or not re.fullmatch(r"[A-Za-z0-9-]{4,20}", numero):
        return {"found": False}
    encontrado = db.buscar_m0(tipo_documento, numero)
    if not encontrado:
        return {"found": False}
    return {"found": True, **precarga(encontrado)}

# ------------------------------------------------------------------ onboarding (web/)
@app.get("/api/habilidades")
def habilidades(q: str = Query("", max_length=60), limit: int = Query(10, ge=1, le=30)) -> list[dict[str, Any]]:
    filas = db.buscar_habilidades(normalizar(q), limit)
    return [{"key": f["clave"], "name": f["nombre"], "category": f["categoria"], "demand": f["vacantes"]}
            for f in filas]


@app.get("/api/cargos")
def cargos(q: str = Query("", max_length=80), limit: int = Query(8, ge=1, le=20)) -> list[dict[str, Any]]:
    texto = normalizar(q)
    if len(texto) < 2:
        return []
    return [{"name": f["nombre"], "demand": f["vacantes"]} for f in db.buscar_cargos(texto, limit)]


@app.get("/api/areas-sugeridas")
def areas_sugeridas(cargo: str = Query("", max_length=150)) -> list[str]:
    return areas_para_cargo(cargo)


@app.post("/api/onboarding")
def crear_onboarding(onboarding: OnboardingEgresado) -> dict[str, Any]:
    programas = db.listar_programas(solo_activos=False)
    programa = onboarding.profile.program
    if programa != PROGRAMA_OTRO and programa not in {str(p["id"]) for p in programas}:
        raise HTTPException(422, "El programa cursado no está en el catálogo.")
    habilidades_pedidas = onboarding.answers.current_skills
    desconocidas = set(habilidades_pedidas) - db.habilidades_existentes(habilidades_pedidas)
    if desconocidas:
        raise HTTPException(422, f"Habilidades fuera del catálogo: {', '.join(sorted(desconocidas))}.")

    guardado = db.guardar_onboarding(onboarding, VERSION_ONBOARDING)
    activos = [p for p in programas if p.get("activo", True)]
    sugeridas = recomendar(perfil_onboarding(onboarding, activos), activos)
    db.guardar_recomendaciones_onboarding(guardado["id"], sugeridas)
    return {
        "registrationId": guardado["token"],
        "receivedAt": datetime.now(timezone.utc).isoformat(),
        "recommendations": [_recomendacion_para_web(r) for r in sugeridas],
    }


@app.get("/api/onboarding/{token}/recomendaciones")
def ver_recomendaciones_onboarding(token: str) -> dict[str, Any]:
    try:
        uuid.UUID(token)
    except ValueError:
        raise HTTPException(404, "No encontramos ese registro.")
    datos = db.obtener_onboarding(token)
    if not datos:
        raise HTTPException(404, "No encontramos ese registro.")
    return {
        "name": datos["nombre"],
        "targetRole": datos["cargo"],
        "recommendations": [_recomendacion_para_web(r) for r in datos["recomendaciones"]],
    }


if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
