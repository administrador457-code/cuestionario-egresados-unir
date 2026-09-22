"""Copia el catalogo de programas UNIR a la base propia del cuestionario.

ORIGEN  (PROGRAMAS_DATABASE_URL): base de la plataforma de pertinencia.
        Se abre en modo SOLO LECTURA (default_transaction_read_only=on) y solo
        se ejecutan SELECT. El script no puede escribir alli aunque quisiera.
DESTINO (DATABASE_URL): base propia del cuestionario, tabla programas_unir.

Uso:
    python scripts/sincronizar_programas.py            # sincroniza
    python scripts/sincronizar_programas.py --revisar  # solo muestra lo que leeria
    python scripts/sincronizar_programas.py --desde-json scripts/programas_demo.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import db  # noqa: E402

COLUMNAS_OPCIONALES = ["descripcion", "facultad", "nivel", "modalidad", "rol", "campo_laboral", "source_url", "estado"]
TABLAS_RELACION = [
    # (tabla puente, columna fk, tabla catalogo)
    ("especializacion_skills", "skill_id", "skills"),
    ("especializacion_competencias", "competencia_id", "competencias"),
    ("especializacion_herramientas", "herramienta_id", "herramientas"),
]


def _columnas(conn, tabla: str) -> set[str]:
    filas = conn.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s",
        (tabla,),
    ).fetchall()
    return {f["column_name"] for f in filas}


def leer_origen(url: str) -> list[dict]:
    with psycopg.connect(url, row_factory=dict_row, options="-c default_transaction_read_only=on") as conn:
        cols = _columnas(conn, "especializaciones")
        if not {"id", "nombre"} <= cols:
            raise SystemExit("La tabla 'especializaciones' no existe o no tiene id y nombre en el origen.")

        seleccion = ["e.id", "e.nombre"] + [
            f"e.{c}" if c in cols else f"NULL AS {c}" for c in COLUMNAS_OPCIONALES
        ]

        subconsultas = []
        for puente, fk, catalogo in TABLAS_RELACION:
            if _columnas(conn, puente) and {"nombre"} <= _columnas(conn, catalogo):
                tiene_dominio = "dominio" in _columnas(conn, catalogo)
                subconsultas.append(
                    f"SELECT r.especializacion_id, c.nombre, "
                    f"{'c.dominio' if tiene_dominio else 'NULL::text'} AS dominio "
                    f"FROM public.{puente} r JOIN public.{catalogo} c ON c.id = r.{fk}"
                )

        if subconsultas:
            union = " UNION ALL ".join(subconsultas)
            sql = f"""
                SELECT {", ".join(seleccion)},
                       COALESCE(array_agg(DISTINCT x.nombre) FILTER (WHERE x.nombre IS NOT NULL), '{{}}') AS skills,
                       COALESCE(array_agg(DISTINCT x.dominio) FILTER (WHERE COALESCE(x.dominio, '') <> ''), '{{}}') AS dominios
                  FROM public.especializaciones e
                  LEFT JOIN ({union}) x ON x.especializacion_id = e.id
                 GROUP BY e.id
                 ORDER BY e.nombre
            """
        else:
            sql = f"SELECT {', '.join(seleccion)}, '{{}}'::text[] AS skills, '{{}}'::text[] AS dominios " \
                  f"FROM public.especializaciones e ORDER BY e.nombre"
        return conn.execute(sql).fetchall()


def escribir_destino(programas: list[dict]) -> tuple[int, int]:
    db.aplicar_esquema()
    with db.conexion() as conn, conn.transaction():
        ids = []
        for p in programas:
            activo = (p.get("estado") or "activo").strip().lower() == "activo"
            conn.execute(
                """
                INSERT INTO programas_unir
                    (id, nombre, descripcion, facultad, nivel, modalidad, rol, campo_laboral,
                     source_url, skills, dominios, activo, sincronizado_en)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                ON CONFLICT (id) DO UPDATE SET
                    nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion,
                    facultad = EXCLUDED.facultad, nivel = EXCLUDED.nivel,
                    modalidad = EXCLUDED.modalidad, rol = EXCLUDED.rol,
                    campo_laboral = EXCLUDED.campo_laboral, source_url = EXCLUDED.source_url,
                    skills = EXCLUDED.skills, dominios = EXCLUDED.dominios,
                    activo = EXCLUDED.activo, sincronizado_en = now()
                """,
                (
                    p["id"], p["nombre"], p.get("descripcion"), p.get("facultad"), p.get("nivel"),
                    p.get("modalidad"), p.get("rol"), p.get("campo_laboral"), p.get("source_url"),
                    list(p.get("skills") or []), list(p.get("dominios") or []), activo,
                ),
            )
            ids.append(p["id"])
        # Los que ya no vienen en el origen se desactivan (no se borran: puede
        # haber recomendaciones historicas que los mencionen).
        desactivados = conn.execute(
            "UPDATE programas_unir SET activo = FALSE WHERE activo AND NOT (id = ANY(%s))", (ids,)
        ).rowcount
    return len(ids), desactivados


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--revisar", action="store_true", help="Solo lee el origen y muestra un resumen.")
    parser.add_argument("--desde-json", type=Path, help="Carga programas desde un JSON en lugar del origen.")
    args = parser.parse_args()

    if args.desde_json:
        programas = json.loads(args.desde_json.read_text(encoding="utf-8"))
    else:
        origen = os.environ.get("PROGRAMAS_DATABASE_URL", "").strip()
        if not origen:
            raise SystemExit("Falta PROGRAMAS_DATABASE_URL (base de la plataforma, se lee en solo lectura).")
        if origen == os.environ.get("DATABASE_URL", "").strip():
            raise SystemExit("PROGRAMAS_DATABASE_URL y DATABASE_URL son la misma base. Deben ser distintas.")
        programas = leer_origen(origen)

    con_skills = sum(1 for p in programas if p.get("skills"))
    print(f"Programas leídos: {len(programas)} ({con_skills} con skills asociadas)")

    if args.revisar:
        for p in programas[:15]:
            print(f"  - [{p['id']}] {p['nombre']} | nivel={p.get('nivel')} | skills={len(p.get('skills') or [])}")
        return

    total, desactivados = escribir_destino(programas)
    print(f"Sincronizados: {total}. Desactivados por no estar en el origen: {desactivados}.")


if __name__ == "__main__":
    main()
