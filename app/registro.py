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

# Selección múltiple: máximos y opciones que no se combinan con otras.
MAX_AREAS = 3
MAX_SECTORES = 3
MAX_COMPETENCIAS = 3
MAX_SERVICIOS = 3
EXCLUSIVA_FORMACION = frozenset({"ninguna"})
EXCLUSIVA_BARRERA = frozenset({"ninguna"})

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


def _opciones(
    valores: list[str], permitidos: set[str], campo: str,
    maximo: int | None = None, exclusivas: frozenset[str] = frozenset(),
) -> list[str]:
    """Valida una pregunta de selección múltiple (mismas reglas que el frontend)."""
    if not valores:
        raise ValueError(f"Elige al menos una opción en '{campo}'.")
    if len(set(valores)) != len(valores):
        raise ValueError(f"Opciones repetidas en '{campo}'.")
    for valor in valores:
        _opcion(valor, permitidos, campo)
    if maximo is not None and len(valores) > maximo:
        raise ValueError(f"Máximo {maximo} opciones en '{campo}'.")
    if len(valores) > 1 and exclusivas & set(valores):
        raise ValueError(f"'{', '.join(sorted(exclusivas))}' no se combina con otras opciones en '{campo}'.")
    return valores


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
    """Las 10 respuestas. Todas son de selección múltiple salvo el cargo
    (texto) y los años de experiencia (una sola opción)."""

    employment_status: list[str]
    target_role: str = Field(min_length=2, max_length=150)
    preferred_education_type: list[str]
    preferred_performance_area: list[str]
    preferred_economic_sector: list[str]
    years_of_experience: str
    priority_skill: list[str]
    preferred_modality: list[str]
    main_education_barrier: list[str]
    preferred_graduate_service: list[str]

    @field_validator("target_role", mode="before")
    @classmethod
    def _cargo(cls, v: Any) -> Any:
        return " ".join(v.split()) if isinstance(v, str) else v

    @field_validator("employment_status")
    @classmethod
    def _v1(cls, v: list[str]) -> list[str]:
        return _opciones(v, SITUACION_LABORAL, "employmentStatus")

    @field_validator("preferred_education_type")
    @classmethod
    def _v3(cls, v: list[str]) -> list[str]:
        return _opciones(v, TIPO_FORMACION, "preferredEducationType", exclusivas=EXCLUSIVA_FORMACION)

    @field_validator("preferred_performance_area")
    @classmethod
    def _v4(cls, v: list[str]) -> list[str]:
        return _opciones(v, AREAS, "preferredPerformanceArea", maximo=MAX_AREAS)

    @field_validator("preferred_economic_sector")
    @classmethod
    def _v5(cls, v: list[str]) -> list[str]:
        return _opciones(v, SECTORES, "preferredEconomicSector", maximo=MAX_SECTORES)

    @field_validator("years_of_experience")
    @classmethod
    def _v6(cls, v: str) -> str:
        return _opcion(v, EXPERIENCIA, "yearsOfExperience")

    @field_validator("priority_skill")
    @classmethod
    def _v7(cls, v: list[str]) -> list[str]:
        return _opciones(v, COMPETENCIAS, "prioritySkill", maximo=MAX_COMPETENCIAS)

    @field_validator("preferred_modality")
    @classmethod
    def _v8(cls, v: list[str]) -> list[str]:
        return _opciones(v, MODALIDADES, "preferredModality")

    @field_validator("main_education_barrier")
    @classmethod
    def _v9(cls, v: list[str]) -> list[str]:
        return _opciones(v, BARRERAS, "mainEducationBarrier", exclusivas=EXCLUSIVA_BARRERA)

    @field_validator("preferred_graduate_service")
    @classmethod
    def _v10(cls, v: list[str]) -> list[str]:
        return _opciones(v, SERVICIOS, "preferredGraduateService", maximo=MAX_SERVICIOS)


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
    "doctorado": "doctorado",   # hoy no hay doctorados en el catálogo: no filtra nada
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

    def sin(valores: list[str], excluido: str) -> list[str]:
        return [v for v in valores if v != excluido]

    tipos = list(dict.fromkeys(_TIPO_A_RECOMENDADOR[t] for t in encuesta.preferred_education_type))

    return {
        "programa_egreso": programa,
        "nivel_formacion": nivel,
        "cargo_aspirado": encuesta.target_role,
        "areas_interes": sin(encuesta.preferred_performance_area, "otra"),
        "sectores_interes": sin(encuesta.preferred_economic_sector, "otro"),
        "habilidades_fortalecer": sin(encuesta.priority_skill, "otra"),
        "tipo_formacion": tipos,
        # El registro nuevo no pregunta plazo ni horas: se usan valores neutros.
        "horizonte_meta": "2_anios",
        "horas_semanales": "5_10",
    }
