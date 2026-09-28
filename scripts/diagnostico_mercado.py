"""Diagnóstico de SOLO LECTURA de los datos de mercado laboral en la
plataforma de pertinencia (PROGRAMAS_DATABASE_URL).

Sirve para diseñar la fase 1 (brechas frente al cargo objetivo): cuántas
vacantes hay, de qué fechas, qué habilidades traen y si existen fechas de
publicación o vencimiento. No escribe nada en ninguna base.

Uso:
    python scripts/diagnostico_mercado.py
"""
from __future__ import annotations

import os
import sys

import psycopg
from psycopg.rows import dict_row


def _tabla_existe(conn, tabla: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s", (tabla,)
    ).fetchone() is not None


def _columnas(conn, tabla: str) -> list[str]:
    filas = conn.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s "
        "ORDER BY ordinal_position",
        (tabla,),
    ).fetchall()
    return [f["column_name"] for f in filas]


def _seccion(titulo: str) -> None:
    print(f"\n=== {titulo} ===")


def _consulta(conn, titulo: str, sql: str) -> None:
    """Ejecuta una consulta de lectura e imprime el resultado. Si falla, lo informa y sigue."""
    _seccion(titulo)
    try:
        for fila in conn.execute(sql).fetchall():
            print("  " + " | ".join(f"{k}={v}" for k, v in fila.items()))
    except Exception as error:  # noqa: BLE001 - es un diagnóstico, no debe detenerse
        conn.rollback()
        print(f"  (no se pudo consultar: {type(error).__name__}: {str(error).splitlines()[0]})")


def main() -> None:
    url = os.environ.get("PROGRAMAS_DATABASE_URL", "").strip()
    if not url:
        sys.exit("Falta PROGRAMAS_DATABASE_URL.")

    with psycopg.connect(url, row_factory=dict_row, options="-c default_transaction_read_only=on") as conn:
        for tabla in ("jobs", "job_skills", "canonical_skills", "ml_program_job_matches", "program_intelligence"):
            _seccion(f"Tabla {tabla}")
            if not _tabla_existe(conn, tabla):
                print("  no existe")
                continue
            print("  columnas: " + ", ".join(_columnas(conn, tabla)))
            _consulta(conn, f"{tabla}: filas", f"SELECT count(*) AS filas FROM public.{tabla}")

        _consulta(conn, "Columnas de fecha/estado en tablas de vacantes", """
            SELECT table_name, column_name, data_type
              FROM information_schema.columns
             WHERE table_schema = 'public'
               AND (table_name ILIKE '%job%' OR table_name ILIKE '%vacant%' OR table_name ILIKE '%oferta%')
               AND (column_name ILIKE '%fecha%' OR column_name ILIKE '%date%' OR column_name ILIKE '%_at'
                    OR column_name ILIKE '%expir%' OR column_name ILIKE '%status%' OR column_name ILIKE '%estado%'
                    OR column_name ILIKE '%activ%' OR column_name ILIKE '%vigen%')
             ORDER BY table_name, column_name
        """)

        cols = set(_columnas(conn, "jobs")) if _tabla_existe(conn, "jobs") else set()
        if cols:
            _consulta(conn, "jobs: rango de fechas de captura", """
                SELECT min(created_at) AS primera, max(created_at) AS ultima,
                       count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS ultimos_30_dias,
                       count(*) FILTER (WHERE created_at >= now() - interval '90 days') AS ultimos_90_dias
                  FROM public.jobs
            """)
            if "canonical_job_id" in cols:
                _consulta(conn, "jobs: vacantes únicas (sin duplicados)", """
                    SELECT count(*) AS total,
                           count(*) FILTER (WHERE canonical_job_id IS NULL OR canonical_job_id = id) AS canonicas
                      FROM public.jobs
                """)
            for campo in ("source", "modality", "seniority", "industry", "location", "experience_level"):
                if campo in cols:
                    _consulta(conn, f"jobs: top {campo}", f"""
                        SELECT coalesce({campo}, '(vacío)') AS valor, count(*) AS n
                          FROM public.jobs GROUP BY 1 ORDER BY 2 DESC LIMIT 10
                    """)
            titulo = "semantic_title_family" if "semantic_title_family" in cols else "title"
            _consulta(conn, f"jobs: top cargos ({titulo})", f"""
                SELECT coalesce({titulo}, '(vacío)') AS cargo, count(*) AS n
                  FROM public.jobs GROUP BY 1 ORDER BY 2 DESC LIMIT 20
            """)
            _consulta(conn, "jobs: vacantes con salario", """
                SELECT count(*) FILTER (WHERE salary_min IS NOT NULL OR salary_max IS NOT NULL) AS con_salario,
                       count(*) AS total
                  FROM public.jobs
            """)

        if _tabla_existe(conn, "job_skills"):
            _consulta(conn, "job_skills: cobertura", """
                SELECT count(DISTINCT job_id) AS vacantes_con_skills, count(*) AS filas,
                       round(avg(confidence)::numeric, 3) AS confianza_media
                  FROM public.job_skills
            """)
            _consulta(conn, "job_skills: top habilidades", """
                SELECT canonical_skill, skill_category, count(DISTINCT job_id) AS vacantes
                  FROM public.job_skills GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 25
            """)
            _consulta(conn, "job_skills: categorías", """
                SELECT skill_category, count(*) AS n FROM public.job_skills GROUP BY 1 ORDER BY 2 DESC LIMIT 12
            """)

        if _tabla_existe(conn, "skills") and _tabla_existe(conn, "job_skills"):
            _consulta(conn, "Coincidencia de vocabulario: skills de programas vs habilidades de vacantes", """
                SELECT count(*) AS skills_programas,
                       count(*) FILTER (WHERE EXISTS (
                           SELECT 1 FROM public.job_skills j WHERE lower(j.canonical_skill) = lower(s.nombre)
                       )) AS tambien_en_vacantes
                  FROM public.skills s
            """)

    print("\nDiagnóstico terminado (solo lectura).")


if __name__ == "__main__":
    main()
