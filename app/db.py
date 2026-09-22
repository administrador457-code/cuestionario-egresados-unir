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
