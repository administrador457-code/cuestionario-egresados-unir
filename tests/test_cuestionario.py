"""Pruebas del recomendador (siempre) y de la API (si hay TEST_DATABASE_URL).

    python -m pytest -q
    TEST_DATABASE_URL=postgresql://... python -m pytest -q   # incluye la API
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from app.preguntas import construir_preguntas
from app.recomendador import recomendar

PROGRAMAS = json.loads((Path(__file__).parent.parent / "scripts" / "programas_demo.json").read_text(encoding="utf-8"))

MARIA = {
    "situacion_laboral": "empleado_mi_area", "nivel_formacion": "profesional", "programa_egreso": "no_listado",
    "cargo_aspirado": "Gerente Comercial", "areas_interes": ["comercial_marketing", "direccion_empresas"],
    "sectores_interes": ["comercio"], "tipo_formacion": "especializacion",
    "habilidades_fortalecer": ["liderazgo", "negociacion", "marketing_digital"],
    "horizonte_meta": "1_anio", "horas_semanales": "5_10",
}


def test_son_diez_preguntas():
    preguntas = construir_preguntas(PROGRAMAS)
    assert len(preguntas) == 10
    assert len({p["id"] for p in preguntas}) == 10


def test_caso_maria_recomienda_gerencia_comercial_primero():
    recs = recomendar(MARIA, PROGRAMAS)
    assert recs[0]["programa_nombre"] == "Especialización en Gerencia Comercial"
    assert all(r["tipo_programa"] == "especializacion" for r in recs)
    assert recs[0]["razones"]


def test_coordinadora_academica_coincide_con_coordinador_academico():
    perfil = dict(MARIA, cargo_aspirado="coordinadora académica", areas_interes=["educacion"],
                  sectores_interes=["educacion"], tipo_formacion="maestria", nivel_formacion="especializacion",
                  habilidades_fortalecer=["investigacion"])
    recs = recomendar(perfil, PROGRAMAS)
    assert recs[0]["programa_nombre"] == "Maestría en Educación"
    assert any("cargo al que aspiras" in r for r in recs[0]["razones"])


def test_excluye_programa_del_que_egreso():
    perfil = dict(MARIA, programa_egreso="1")
    assert all(r["programa_id"] != 1 for r in recomendar(perfil, PROGRAMAS))


def test_no_recomienda_programas_sin_afinidad():
    perfil = dict(MARIA, cargo_aspirado="docente", areas_interes=["educacion"], sectores_interes=["educacion"],
                  tipo_formacion="maestria", habilidades_fortalecer=["pedagogia_digital"])
    nombres = [r["programa_nombre"] for r in recomendar(perfil, PROGRAMAS)]
    assert "Maestría en Ciberseguridad" not in nombres


def test_si_no_hay_del_tipo_pedido_usa_los_demas():
    solo_especializaciones = [p for p in PROGRAMAS if "Maestría" not in p["nombre"]]
    recs = recomendar(dict(MARIA, tipo_formacion="maestria"), solo_especializaciones)
    assert recs  # no se queda vacio por el filtro de tipo


# ---------------------------------------------------------------- API
DB_PRUEBA = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture(scope="module")
def cliente():
    if not DB_PRUEBA:
        pytest.skip("Define TEST_DATABASE_URL para probar la API contra Postgres.")
    os.environ["DATABASE_URL"] = DB_PRUEBA
    from fastapi.testclient import TestClient

    from app import db
    from app.main import app
    from scripts.sincronizar_programas import escribir_destino

    db.aplicar_esquema()
    with db.conexion() as conn:
        conn.execute("TRUNCATE recomendaciones, perfil_egresado, egresados, programas_unir")
    escribir_destino(PROGRAMAS)
    with TestClient(app) as c:
        yield c


def test_api_flujo_completo(cliente):
    preguntas = cliente.get("/api/preguntas").json()
    assert len(preguntas["preguntas"]) == 10

    envio = {"nombre": "María Pérez", "email": "Maria@Ejemplo.co", "acepta_tratamiento_datos": True,
             "respuestas": MARIA}
    r = cliente.post("/api/respuestas", json=envio)
    assert r.status_code == 200, r.text
    token = r.json()["token"]

    guardadas = cliente.get(f"/api/egresados/{token}/recomendaciones").json()
    assert guardadas["recomendaciones"][0]["programa_nombre"] == "Especialización en Gerencia Comercial"

    # volver a responder actualiza el mismo registro (mismo correo)
    r2 = cliente.post("/api/respuestas", json=dict(envio, email="maria@ejemplo.co"))
    assert r2.json()["token"] == token


def test_api_rechaza_opciones_invalidas(cliente):
    malo = dict(MARIA, areas_interes=["astronautica"])
    r = cliente.post("/api/respuestas", json={"nombre": "X Y", "email": "x@y.co",
                                              "acepta_tratamiento_datos": True, "respuestas": malo})
    assert r.status_code == 422


def test_api_exige_aceptar_tratamiento_de_datos(cliente):
    r = cliente.post("/api/respuestas", json={"nombre": "X Y", "email": "x@y.co",
                                              "acepta_tratamiento_datos": False, "respuestas": MARIA})
    assert r.status_code == 422


def test_api_token_invalido(cliente):
    assert cliente.get("/api/egresados/123/recomendaciones").status_code == 404


# ------------------------------------------------ catalogo real (muestra)
# Extractos del catalogo real sincronizado (sept. 2026). El texto de campo
# laboral enumera muchos cargos y sectores; estas pruebas evitan que eso infle
# las recomendaciones (p. ej. Gestion Publica para un gerente comercial).
REALES = json.loads((Path(__file__).parent / "programas_reales_muestra.json").read_text(encoding="utf-8"))


def _nombres(perfil):
    return [r["programa_nombre"] for r in recomendar(perfil, REALES)]


def test_real_gerente_comercial():
    nombres = _nombres(MARIA)
    assert nombres[0] == "Especialización en Dirección Comercial y Ventas"
    assert "Especialización en Marketing Digital" in nombres[:3]
    assert "Especialización en Gestión Pública" not in nombres[:3]


def test_real_analista_de_datos():
    perfil = dict(MARIA, cargo_aspirado="analista de datos", areas_interes=["datos_ia", "tecnologia"],
                  sectores_interes=["financiero"], tipo_formacion="sin_definir",
                  habilidades_fortalecer=["analisis_datos", "ia"])
    recs = recomendar(perfil, REALES)
    top3 = [r["programa_nombre"] for r in recs[:3]]
    assert set(top3) == {"Especialización en Inteligencia de Negocio", "Especialización en Inteligencia Artificial",
                         "Especialización en Visual Analytics y Big Data"}
    derecho = [r for r in recs if r["programa_nombre"] == "Especialización en Derecho Digital"]
    assert not derecho or not any("cargo al que aspiras" in x for x in derecho[0]["razones"])


def test_real_coordinadora_academica():
    perfil = dict(MARIA, cargo_aspirado="coordinadora académica", areas_interes=["educacion"],
                  sectores_interes=["educacion"], tipo_formacion="maestria",
                  habilidades_fortalecer=["investigacion", "pedagogia_digital", "liderazgo"])
    nombres = _nombres(perfil)
    assert nombres[:2] == ["Especialización en Pedagogía y Docencia", "Especialización en Gerencia Educativa"]
    # Derechos Humanos toca la pedagogia en sus skills, pero no puede superar a los programas de educacion
    if "Especialización en Derechos Humanos" in nombres:
        assert nombres.index("Especialización en Derechos Humanos") > 1


def test_skills_genericas_no_cuentan_como_habilidad():
    # "investigación" aparece en todos los programas: no debe "fortalecer investigación" en cualquiera
    perfil = dict(MARIA, habilidades_fortalecer=["investigacion"])
    for r in recomendar(perfil, REALES, limite=20):
        if r["programa_nombre"] == "Especialización en Dirección Comercial y Ventas":
            assert not any("investigación" in x for x in r["razones"])
