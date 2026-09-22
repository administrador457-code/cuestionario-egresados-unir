"""Registro y caracterizacion de egresados (frontend React de web/).

Define el modelo que envia el frontend, lo valida con los mismos catalogos
que muestra (web/src/config/surveyQuestions.ts) y lo traduce al perfil que
usa el recomendador de programas.

Si cambias o agregas un `value` en el frontend, actualizalo aqui tambien.
"""
from __future__ import annotations

import re
from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic.alias_generators import to_camel

VERSION_REGISTRO = 1

# ------------------------------------------------------------------ catalogos
TIPOS_DOCUMENTO = {"CC", "CE", "PPT", "PA", "DNI"}

SITUACION_LABORAL = {"tiempo_completo", "tiempo_parcial", "independiente", "buscando_empleo", "no_busco_empleo"}
TIPO_FORMACION = {"curso_corto", "diplomado", "especializacion", "maestria", "doctorado", "ninguna"}
AREAS = {
    "direccion_empresas", "finanzas", "comercial_marketing", "talento_humano", "educacion", "tecnologia",
    "datos_ia", "ciberseguridad", "proyectos", "logistica", "juridica_publica", "salud_sst", "comunicacion",
    "sostenibilidad", "otra",
}
SECTORES = {
    "tecnologia", "educacion", "financiero", "salud", "publico", "industria", "logistica_transporte",
    "comercio", "consultoria", "construccion_energia", "agro", "social", "turismo_cultura", "otro",
}
EXPERIENCIA = {"sin_experiencia", "menos_2", "2_5", "6_10", "mas_10"}
COMPETENCIAS = {
    "liderazgo", "estrategia", "analisis_datos", "ia", "programacion", "proyectos", "finanzas",
    "marketing_digital", "negociacion", "comunicacion", "gestion_cambio", "normatividad", "investigacion",
    "pedagogia_digital", "ciberseguridad", "ingles", "otra",
}
MODALIDADES = {"virtual", "virtual_en_vivo", "hibrida", "presencial", "indiferente"}
BARRERAS = {"costo", "tiempo", "horarios", "programa_adecuado", "familiares", "ninguna"}
SERVICIOS = {"bolsa_empleo", "orientacion", "networking", "descuentos", "mentorias", "eventos"}

PROGRAMA_OTRO = "otro"
PRIMER_ANIO_GRADUACION = 2010

_DOCUMENTO = re.compile(r"^[A-Za-z0-9-]{4,20}$")
_TELEFONO = re.compile(r"^\+?[\d\s()-]+$")


class _Camel(BaseModel):
    """Acepta los nombres en camelCase que envia el frontend."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


def _opcion(valor: str, permitidos: set[str], campo: str) -> str:
    if valor not in permitidos:
        raise ValueError(f"Opción no válida en '{campo}'.")
    return valor


class PerfilEgresado(_Camel):
    first_name: str = Field(min_length=2, max_length=120)
    last_name: str = Field(min_length=2, max_length=120)
    document_type: str
    document_number: str
    email: EmailStr
    phone: str
    country: str = Field(min_length=2, max_length=60)
    city: str = Field(min_length=2, max_length=80)
    program: str
    graduation_year: int
    privacy_consent: bool

    @field_validator("first_name", "last_name", "country", "city", mode="before")
    @classmethod
    def _limpiar_texto(cls, v: Any) -> Any:
        return " ".join(v.split()) if isinstance(v, str) else v

    @field_validator("document_type")
    @classmethod
    def _tipo_documento(cls, v: str) -> str:
        return _opcion(v, TIPOS_DOCUMENTO, "documentType")

    @field_validator("document_number")
    @classmethod
    def _numero_documento(cls, v: str) -> str:
        v = v.strip()
        if not _DOCUMENTO.match(v):
            raise ValueError("Número de documento no válido.")
        return v.upper()

    @field_validator("phone")
    @classmethod
    def _telefono(cls, v: str) -> str:
        v = v.strip()
        digitos = re.sub(r"\D", "", v)
        if not _TELEFONO.match(v) or not 7 <= len(digitos) <= 15:
            raise ValueError("Teléfono no válido.")
        return v

    @field_validator("program")
    @classmethod
    def _programa(cls, v: str) -> str:
        if v != PROGRAMA_OTRO and not v.isdigit():
            raise ValueError("Programa no válido.")
        return v

    @field_validator("graduation_year")
    @classmethod
    def _anio(cls, v: int) -> int:
        if not PRIMER_ANIO_GRADUACION <= v <= date.today().year:
            raise ValueError("Año de graduación no válido.")
        return v

    @field_validator("privacy_consent")
    @classmethod
    def _consentimiento(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Debe autorizar el tratamiento de datos.")
        return v


class EncuestaEgresado(_Camel):
    employment_status: str
    target_role: str = Field(min_length=2, max_length=150)
    preferred_education_type: str
    preferred_performance_area: str
    preferred_economic_sector: str
    years_of_experience: str
    priority_skill: str
    preferred_modality: str
    main_education_barrier: str
    preferred_graduate_service: str

    @field_validator("target_role", mode="before")
    @classmethod
    def _cargo(cls, v: Any) -> Any:
        return " ".join(v.split()) if isinstance(v, str) else v

    @field_validator("employment_status")
    @classmethod
    def _v1(cls, v: str) -> str:
        return _opcion(v, SITUACION_LABORAL, "employmentStatus")

    @field_validator("preferred_education_type")
    @classmethod
    def _v3(cls, v: str) -> str:
        return _opcion(v, TIPO_FORMACION, "preferredEducationType")

    @field_validator("preferred_performance_area")
    @classmethod
    def _v4(cls, v: str) -> str:
        return _opcion(v, AREAS, "preferredPerformanceArea")

    @field_validator("preferred_economic_sector")
    @classmethod
    def _v5(cls, v: str) -> str:
        return _opcion(v, SECTORES, "preferredEconomicSector")

    @field_validator("years_of_experience")
    @classmethod
    def _v6(cls, v: str) -> str:
        return _opcion(v, EXPERIENCIA, "yearsOfExperience")

    @field_validator("priority_skill")
    @classmethod
    def _v7(cls, v: str) -> str:
        return _opcion(v, COMPETENCIAS, "prioritySkill")

    @field_validator("preferred_modality")
    @classmethod
    def _v8(cls, v: str) -> str:
        return _opcion(v, MODALIDADES, "preferredModality")

    @field_validator("main_education_barrier")
    @classmethod
    def _v9(cls, v: str) -> str:
        return _opcion(v, BARRERAS, "mainEducationBarrier")

    @field_validator("preferred_graduate_service")
    @classmethod
    def _v10(cls, v: str) -> str:
        return _opcion(v, SERVICIOS, "preferredGraduateService")


class RegistroEgresado(_Camel):
    profile: PerfilEgresado
    survey: EncuestaEgresado
    completed_at: str | None = None  # lo fija el servidor; se acepta pero no se usa
    status: Literal["completed"]


# --------------------------------------------------------- al recomendador
# El recomendador (app/recomendador.py) trabaja con el perfil del cuestionario
# anterior. Aqui se traduce el registro nuevo a ese formato.
_TIPO_A_RECOMENDADOR = {
    "especializacion": "especializacion",
    "maestria": "maestria",
    "curso_corto": "curso_corto",
    "diplomado": "curso_corto",
    "doctorado": "sin_definir",   # no hay doctorados en el catalogo: no se filtra por tipo
    "ninguna": "ninguna",
}


def perfil_para_recomendador(registro: RegistroEgresado, programas: list[dict[str, Any]]) -> dict[str, Any]:
    encuesta = registro.survey
    programa = registro.profile.program

    # Todos los egresados vienen de un programa UNIR: si esta en el catalogo, su
    # nivel es el de ese programa (hoy, especializacion); si no, profesional.
    nivel = "profesional"
    if programa != PROGRAMA_OTRO:
        from .recomendador import tipo_programa  # import local para evitar ciclo

        cursado = next((p for p in programas if str(p["id"]) == programa), None)
        if cursado and tipo_programa(cursado) in ("especializacion", "maestria", "doctorado"):
            nivel = tipo_programa(cursado)

    def lista(valor: str, excluido: str) -> list[str]:
        return [] if valor == excluido else [valor]

    return {
        "programa_egreso": programa,
        "nivel_formacion": nivel,
        "cargo_aspirado": encuesta.target_role,
        "areas_interes": lista(encuesta.preferred_performance_area, "otra"),
        "sectores_interes": lista(encuesta.preferred_economic_sector, "otro"),
        "habilidades_fortalecer": lista(encuesta.priority_skill, "otra"),
        "tipo_formacion": _TIPO_A_RECOMENDADOR[encuesta.preferred_education_type],
        # El registro nuevo no pregunta plazo ni horas: se usan valores neutros.
        "horizonte_meta": "2_anios",
        "horas_semanales": "5_10",
    }
