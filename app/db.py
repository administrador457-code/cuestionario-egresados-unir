"""Acceso a la base de datos PROPIA del cuestionario (variable DATABASE_URL)."""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("Falta la variable DATABASE_URL (base de datos propia del cuestionario).")
    return url


@contextmanager
def conexion() -> Iterator[psycopg.Connection]:
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
        yield conn


def aplicar_esquema() -> None:
    with conexion() as conn:
        conn.execute(SCHEMA_PATH.read_text(encoding="utf-8"))


def listar_programas(solo_activos: bool = True) -> list[dict[str, Any]]:
    sql = "SELECT * FROM programas_unir"
    if solo_activos:
        sql += " WHERE activo"
    with conexion() as conn:
        return conn.execute(sql + " ORDER BY nombre").fetchall()


def guardar_respuestas(nombre: str, email: str, acepta: bool, perfil: dict[str, Any], version: int) -> dict[str, Any]:
    """Crea o actualiza el egresado (por email) y su perfil. Devuelve id y token."""
    with conexion() as conn, conn.transaction():
        egresado = conn.execute(
            """
            INSERT INTO egresados (nombre, email, acepta_tratamiento_datos)
            VALUES (%s, %s, %s)
            ON CONFLICT (email) DO UPDATE
               SET nombre = EXCLUDED.nombre,
                   acepta_tratamiento_datos = EXCLUDED.acepta_tratamiento_datos,
                   aceptado_en = now()
            RETURNING id, token
            """,
            (nombre, email, acepta),
        ).fetchone()
        egresado_id = egresado["id"]

        programa = perfil.get("programa_egreso")
        programa_id = int(programa) if programa and str(programa).isdigit() else None

        conn.execute(
            """
            INSERT INTO perfil_egresado (
                egresado_id, version_cuestionario, situacion_laboral, nivel_formacion,
                programa_egreso_id, cargo_aspirado, areas_interes, sectores_interes,
                tipo_formacion, habilidades_fortalecer, horizonte_meta, horas_semanales)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (egresado_id) DO UPDATE SET
                version_cuestionario = EXCLUDED.version_cuestionario,
                situacion_laboral = EXCLUDED.situacion_laboral,
                nivel_formacion = EXCLUDED.nivel_formacion,
                programa_egreso_id = EXCLUDED.programa_egreso_id,
                cargo_aspirado = EXCLUDED.cargo_aspirado,
                areas_interes = EXCLUDED.areas_interes,
                sectores_interes = EXCLUDED.sectores_interes,
                tipo_formacion = EXCLUDED.tipo_formacion,
                habilidades_fortalecer = EXCLUDED.habilidades_fortalecer,
                horizonte_meta = EXCLUDED.horizonte_meta,
                horas_semanales = EXCLUDED.horas_semanales,
                actualizado_en = now()
            """,
            (
                egresado_id, version, perfil["situacion_laboral"], perfil["nivel_formacion"],
                programa_id, perfil["cargo_aspirado"], perfil["areas_interes"],
                perfil["sectores_interes"], perfil["tipo_formacion"],
                perfil["habilidades_fortalecer"], perfil["horizonte_meta"], perfil["horas_semanales"],
            ),
        )
    return {"id": egresado_id, "token": str(egresado["token"])}


def guardar_recomendaciones(egresado_id: int, recomendaciones: list[dict[str, Any]]) -> None:
    """Reemplaza las recomendaciones vigentes del egresado."""
    with conexion() as conn, conn.transaction():
        conn.execute("DELETE FROM recomendaciones WHERE egresado_id = %s", (egresado_id,))
        for r in recomendaciones:
            conn.execute(
                """
                INSERT INTO recomendaciones
                    (egresado_id, posicion, programa_id, programa_nombre, puntaje, desglose, razones)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    egresado_id, r["posicion"], r["programa_id"], r["programa_nombre"], r["puntaje"],
                    json.dumps(r["desglose"], ensure_ascii=False), json.dumps(r["razones"], ensure_ascii=False),
                ),
            )


def obtener_por_token(token: str) -> dict[str, Any] | None:
    with conexion() as conn:
        return conn.execute(
            """
            SELECT e.id, e.nombre, p.*
              FROM egresados e
              LEFT JOIN perfil_egresado p ON p.egresado_id = e.id
             WHERE e.token = %s
            """,
            (token,),
        ).fetchone()


def obtener_recomendaciones(egresado_id: int) -> list[dict[str, Any]]:
    with conexion() as conn:
        return conn.execute(
            """
            SELECT r.posicion, r.programa_id, r.programa_nombre, r.puntaje, r.desglose, r.razones,
                   r.generado_en, p.facultad, p.source_url AS url
              FROM recomendaciones r
              LEFT JOIN programas_unir p ON p.id = r.programa_id
             WHERE r.egresado_id = %s
             ORDER BY r.posicion
            """,
            (egresado_id,),
        ).fetchall()


# ------------------------------------------------------------ registro nuevo
def guardar_registro(registro, version: int) -> dict[str, Any]:
    """Crea o actualiza (por tipo y numero de documento) el registro. Devuelve id y token."""
    p, s = registro.profile, registro.survey
    programa_id = int(p.program) if p.program.isdigit() else None
    with conexion() as conn:
        fila = conn.execute(
            """
            INSERT INTO registros_egresados (
                version_registro, nombres, apellidos, tipo_documento, numero_documento, email, telefono,
                pais, ciudad, programa_cursado_id, anio_graduacion, acepta_tratamiento_datos,
                situacion_laboral, cargo_aspirado, tipo_formacion, area_desempeno, sector_economico,
                anios_experiencia, competencia_prioritaria, modalidad_preferida, barrera_principal,
                servicio_preferido)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tipo_documento, numero_documento) DO UPDATE SET
                version_registro = EXCLUDED.version_registro,
                nombres = EXCLUDED.nombres, apellidos = EXCLUDED.apellidos, email = EXCLUDED.email,
                telefono = EXCLUDED.telefono, pais = EXCLUDED.pais, ciudad = EXCLUDED.ciudad,
                programa_cursado_id = EXCLUDED.programa_cursado_id, anio_graduacion = EXCLUDED.anio_graduacion,
                acepta_tratamiento_datos = EXCLUDED.acepta_tratamiento_datos, aceptado_en = now(),
                situacion_laboral = EXCLUDED.situacion_laboral, cargo_aspirado = EXCLUDED.cargo_aspirado,
                tipo_formacion = EXCLUDED.tipo_formacion, area_desempeno = EXCLUDED.area_desempeno,
                sector_economico = EXCLUDED.sector_economico, anios_experiencia = EXCLUDED.anios_experiencia,
                competencia_prioritaria = EXCLUDED.competencia_prioritaria,
                modalidad_preferida = EXCLUDED.modalidad_preferida, barrera_principal = EXCLUDED.barrera_principal,
                servicio_preferido = EXCLUDED.servicio_preferido, actualizado_en = now()
            RETURNING id, token
            """,
            (
                version, p.first_name, p.last_name, p.document_type, p.document_number, str(p.email).lower(),
                p.phone, p.country, p.city, programa_id, p.graduation_year, p.privacy_consent,
                s.employment_status, s.target_role, s.preferred_education_type, s.preferred_performance_area,
                s.preferred_economic_sector, s.years_of_experience, s.priority_skill, s.preferred_modality,
                s.main_education_barrier, s.preferred_graduate_service,
            ),
        ).fetchone()
    return {"id": fila["id"], "token": str(fila["token"])}


def guardar_recomendaciones_registro(registro_id: int, recomendaciones: list[dict[str, Any]]) -> None:
    with conexion() as conn, conn.transaction():
        conn.execute("DELETE FROM recomendaciones_registro WHERE registro_id = %s", (registro_id,))
        for r in recomendaciones:
            conn.execute(
                """
                INSERT INTO recomendaciones_registro
                    (registro_id, posicion, programa_id, programa_nombre, puntaje, desglose, razones)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    registro_id, r["posicion"], r["programa_id"], r["programa_nombre"], r["puntaje"],
                    json.dumps(r["desglose"], ensure_ascii=False), json.dumps(r["razones"], ensure_ascii=False),
                ),
            )


def obtener_recomendaciones_registro(token: str) -> dict[str, Any] | None:
    with conexion() as conn:
        registro = conn.execute(
            "SELECT id, nombres, cargo_aspirado FROM registros_egresados WHERE token = %s", (token,)
        ).fetchone()
        if not registro:
            return None
        recomendaciones = conn.execute(
            """
            SELECT r.posicion, r.programa_id, r.programa_nombre, r.puntaje, r.razones,
                   p.facultad, p.source_url AS url
              FROM recomendaciones_registro r
              LEFT JOIN programas_unir p ON p.id = r.programa_id
             WHERE r.registro_id = %s
             ORDER BY r.posicion
            """,
            (registro["id"],),
        ).fetchall()
    return {"nombre": registro["nombres"], "cargo_aspirado": registro["cargo_aspirado"],
            "recomendaciones": recomendaciones}
