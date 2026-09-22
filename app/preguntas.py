"""Las 10 preguntas del cuestionario de ingreso y sus catalogos.

Cada opcion tiene un `valor` estable (lo que se guarda en la base de datos) y
una `etiqueta` (lo que ve el egresado). Si cambias el texto de una etiqueta no
pasa nada; si cambias o eliminas un `valor`, sube VERSION_CUESTIONARIO para
poder distinguir las respuestas antiguas de las nuevas.

Las areas, sectores y habilidades llevan `claves`: palabras o frases (sin
tildes) que el recomendador busca en el nombre, descripcion, rol, campo
laboral y skills de cada programa UNIR.
"""
from __future__ import annotations

from typing import Any

VERSION_CUESTIONARIO = 1

SITUACION_LABORAL = [
    {"valor": "empleado_mi_area", "etiqueta": "Trabajo en el área de lo que estudié"},
    {"valor": "empleado_otra_area", "etiqueta": "Trabajo, pero en otra área"},
    {"valor": "independiente", "etiqueta": "Soy independiente o tengo mi empresa"},
    {"valor": "buscando_empleo", "etiqueta": "Estoy buscando empleo"},
    {"valor": "estudiando", "etiqueta": "Me dedico a estudiar"},
]

NIVEL_FORMACION = [
    {"valor": "tecnico_tecnologo", "etiqueta": "Técnico o tecnólogo", "orden": 1},
    {"valor": "profesional", "etiqueta": "Profesional universitario", "orden": 2},
    {"valor": "especializacion", "etiqueta": "Especialización", "orden": 3},
    {"valor": "maestria", "etiqueta": "Maestría", "orden": 4},
    {"valor": "doctorado", "etiqueta": "Doctorado", "orden": 5},
]

TIPO_FORMACION = [
    {"valor": "especializacion", "etiqueta": "Una especialización"},
    {"valor": "maestria", "etiqueta": "Una maestría"},
    {"valor": "curso_corto", "etiqueta": "Un diplomado o curso corto"},
    {"valor": "sin_definir", "etiqueta": "Aún no lo tengo claro"},
    {"valor": "ninguna", "etiqueta": "Por ahora no quiero estudiar"},
]

HORIZONTE_META = [
    {"valor": "6_meses", "etiqueta": "En los próximos 6 meses", "meses": 6},
    {"valor": "1_anio", "etiqueta": "En un año", "meses": 12},
    {"valor": "2_anios", "etiqueta": "En dos años", "meses": 24},
    {"valor": "3_mas", "etiqueta": "En tres años o más", "meses": 36},
]

HORAS_SEMANALES = [
    {"valor": "menos_5", "etiqueta": "Menos de 5 horas", "horas": 4},
    {"valor": "5_10", "etiqueta": "Entre 5 y 10 horas", "horas": 8},
    {"valor": "10_20", "etiqueta": "Entre 10 y 20 horas", "horas": 15},
    {"valor": "mas_20", "etiqueta": "Más de 20 horas", "horas": 22},
]

AREAS_DESEMPENO = [
    {"valor": "direccion_empresas", "etiqueta": "Dirección y gestión de organizaciones",
     "claves": ["gerencia", "gerente", "direccion", "director", "administracion", "gestion empresarial",
                "estrategia", "estrategica", "negocios", "mba", "emprendimiento", "organizaciones"]},
    {"valor": "finanzas", "etiqueta": "Finanzas y contabilidad",
     "claves": ["finanzas", "financiera", "financiero", "contabilidad", "contable", "tributaria",
                "auditoria", "revisoria", "costos", "presupuesto", "inversion", "banca", "riesgo financiero"]},
    {"valor": "comercial_marketing", "etiqueta": "Comercial, ventas y marketing",
     "claves": ["comercial", "ventas", "marketing", "mercadeo", "mercadotecnia", "publicidad",
                "marca", "clientes", "ecommerce", "comercio electronico", "digital marketing"]},
    {"valor": "talento_humano", "etiqueta": "Talento humano",
     "claves": ["talento humano", "recursos humanos", "gestion humana", "seleccion", "nomina",
                "bienestar laboral", "desarrollo organizacional", "cultura organizacional"]},
    {"valor": "educacion", "etiqueta": "Educación y pedagogía",
     "claves": ["educacion", "educativa", "educativo", "pedagogia", "docencia", "docente", "didactica",
                "ensenanza", "aprendizaje", "curriculo", "escolar", "neuroeducacion"]},
    {"valor": "tecnologia", "etiqueta": "Tecnología y transformación digital",
     "claves": ["tecnologia", "software", "sistemas", "informatica", "desarrollo web", "programacion",
                "transformacion digital", "cloud", "nube", "devops", "ingenieria de software", "ti"]},
    {"valor": "datos_ia", "etiqueta": "Datos, analítica e inteligencia artificial",
     "claves": ["datos", "analitica", "big data", "business intelligence", "inteligencia artificial",
                "machine learning", "ciencia de datos", "estadistica", "visualizacion", "python", "sql"]},
    {"valor": "ciberseguridad", "etiqueta": "Ciberseguridad",
     "claves": ["ciberseguridad", "seguridad informatica", "seguridad de la informacion", "hacking",
                "forense", "ciberdefensa", "riesgo tecnologico"]},
    {"valor": "proyectos", "etiqueta": "Gestión de proyectos",
     "claves": ["proyectos", "project management", "pmi", "scrum", "agil", "agile", "pmo", "portafolio"]},
    {"valor": "logistica", "etiqueta": "Logística y operaciones",
     "claves": ["logistica", "cadena de suministro", "supply chain", "operaciones", "produccion",
                "inventarios", "compras", "calidad", "lean"]},
    {"valor": "juridica_publica", "etiqueta": "Derecho y gestión pública",
     "claves": ["derecho", "juridica", "juridico", "legal", "contratacion", "gestion publica",
                "administracion publica", "gobierno", "politicas publicas", "compliance", "normatividad"]},
    {"valor": "salud_sst", "etiqueta": "Salud y seguridad en el trabajo",
     "claves": ["salud", "seguridad y salud en el trabajo", "sst", "sg sst", "riesgos laborales",
                "higiene", "ergonomia", "hospitalaria", "clinica"]},
    {"valor": "comunicacion", "etiqueta": "Comunicación y contenidos",
     "claves": ["comunicacion", "periodismo", "contenidos", "redes sociales", "comunicacion corporativa",
                "relaciones publicas", "audiovisual", "diseno"]},
    {"valor": "sostenibilidad", "etiqueta": "Medio ambiente y sostenibilidad",
     "claves": ["ambiental", "medio ambiente", "sostenibilidad", "sostenible", "energias renovables",
                "cambio climatico", "responsabilidad social"]},
]

SECTORES_ECONOMICOS = [
    {"valor": "educacion", "etiqueta": "Educación",
     "claves": ["educacion", "educativa", "pedagogia", "docencia", "escolar"]},
    {"valor": "salud", "etiqueta": "Salud",
     "claves": ["salud", "hospitalaria", "clinica", "sst"]},
    {"valor": "financiero", "etiqueta": "Banca, seguros y servicios financieros",
     "claves": ["finanzas", "financiera", "banca", "seguros", "fintech", "inversion", "riesgo"]},
    {"valor": "tecnologia", "etiqueta": "Tecnología y telecomunicaciones",
     "claves": ["tecnologia", "software", "telecomunicaciones", "digital", "datos", "ciberseguridad"]},
    {"valor": "comercio", "etiqueta": "Comercio y retail",
     "claves": ["comercial", "ventas", "marketing", "retail", "ecommerce", "comercio"]},
    {"valor": "industria", "etiqueta": "Industria y manufactura",
     "claves": ["produccion", "manufactura", "industrial", "operaciones", "calidad", "logistica"]},
    {"valor": "publico", "etiqueta": "Sector público",
     "claves": ["publica", "publico", "gobierno", "contratacion", "politicas publicas", "estado"]},
    {"valor": "construccion_energia", "etiqueta": "Construcción, energía y minería",
     "claves": ["construccion", "energia", "mineria", "infraestructura", "renovables", "ambiental"]},
    {"valor": "agro", "etiqueta": "Agroindustria",
     "claves": ["agro", "agroindustria", "agricola", "rural", "alimentos"]},
    {"valor": "logistica_transporte", "etiqueta": "Transporte y logística",
     "claves": ["logistica", "transporte", "cadena de suministro", "supply chain"]},
    {"valor": "consultoria", "etiqueta": "Consultoría y servicios profesionales",
     "claves": ["consultoria", "gestion", "proyectos", "estrategia", "auditoria"]},
    {"valor": "social", "etiqueta": "ONG y organizaciones sociales",
     "claves": ["social", "responsabilidad social", "comunitario", "cooperacion", "sostenibilidad"]},
    {"valor": "turismo_cultura", "etiqueta": "Turismo, cultura y entretenimiento",
     "claves": ["turismo", "hotelera", "cultura", "cultural", "entretenimiento", "eventos"]},
]

HABILIDADES = [
    {"valor": "liderazgo", "etiqueta": "Liderazgo de equipos",
     "claves": ["liderazgo", "lider", "direccion de equipos", "gestion de equipos", "coaching"]},
    {"valor": "estrategia", "etiqueta": "Pensamiento estratégico",
     "claves": ["estrategia", "estrategica", "planeacion", "planificacion", "toma de decisiones"]},
    {"valor": "analisis_datos", "etiqueta": "Análisis de datos",
     "claves": ["datos", "analitica", "estadistica", "excel", "power bi", "business intelligence", "sql"]},
    {"valor": "ia", "etiqueta": "Inteligencia artificial aplicada",
     "claves": ["inteligencia artificial", "machine learning", "aprendizaje automatico", "ia generativa"]},
    {"valor": "programacion", "etiqueta": "Programación",
     "claves": ["programacion", "python", "java", "javascript", "desarrollo de software", "desarrollo web"]},
    {"valor": "proyectos", "etiqueta": "Gestión de proyectos",
     "claves": ["proyectos", "scrum", "agil", "pmi", "project management"]},
    {"valor": "finanzas", "etiqueta": "Finanzas y presupuestos",
     "claves": ["finanzas", "financiera", "presupuesto", "costos", "contabilidad", "evaluacion financiera"]},
    {"valor": "marketing_digital", "etiqueta": "Marketing digital",
     "claves": ["marketing digital", "seo", "sem", "redes sociales", "ecommerce", "marketing"]},
    {"valor": "negociacion", "etiqueta": "Negociación y ventas",
     "claves": ["negociacion", "ventas", "comercial", "clientes"]},
    {"valor": "comunicacion", "etiqueta": "Comunicación efectiva",
     "claves": ["comunicacion", "oratoria", "presentaciones", "redaccion"]},
    {"valor": "gestion_cambio", "etiqueta": "Gestión del cambio e innovación",
     "claves": ["innovacion", "gestion del cambio", "transformacion", "design thinking", "creatividad"]},
    {"valor": "normatividad", "etiqueta": "Normatividad y cumplimiento",
     "claves": ["normatividad", "normativa", "legal", "compliance", "regulacion", "juridica"]},
    {"valor": "investigacion", "etiqueta": "Investigación",
     "claves": ["investigacion", "metodologia", "cientifica", "academica"]},
    {"valor": "pedagogia_digital", "etiqueta": "Pedagogía y ambientes virtuales",
     "claves": ["pedagogia", "didactica", "e learning", "virtual", "tic", "educacion digital"]},
    {"valor": "ciberseguridad", "etiqueta": "Ciberseguridad",
     "claves": ["ciberseguridad", "seguridad informatica", "seguridad de la informacion"]},
    {"valor": "ingles", "etiqueta": "Inglés profesional",
     "claves": ["ingles", "english", "bilingue"]},
]

PROGRAMA_NO_LISTADO = "no_listado"

# Limites de seleccion para preguntas multiples
MAX_AREAS = 3
MAX_SECTORES = 2
MAX_HABILIDADES = 5


def _opciones(catalogo: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [{"valor": o["valor"], "etiqueta": o["etiqueta"]} for o in catalogo]


def construir_preguntas(programas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Devuelve las 10 preguntas listas para el frontend.

    `programas` es la lista de programas UNIR sincronizados (id, nombre); se usa
    para las opciones de la pregunta 3.
    """
    opciones_programa = [
        {"valor": str(p["id"]), "etiqueta": p["nombre"]}
        for p in sorted(programas, key=lambda p: p["nombre"])
    ]
    opciones_programa.append({"valor": PROGRAMA_NO_LISTADO, "etiqueta": "Mi programa no aparece en la lista"})

    return [
        {"id": "situacion_laboral", "corto": "Situación laboral", "tipo": "unica",
         "texto": "¿Cuál es tu situación laboral actual?",
         "opciones": _opciones(SITUACION_LABORAL)},
        {"id": "nivel_formacion", "corto": "Nivel de formación", "tipo": "unica",
         "texto": "¿Cuál es tu máximo nivel de formación terminado?",
         "opciones": _opciones(NIVEL_FORMACION)},
        {"id": "programa_egreso", "corto": "Programa UNIR", "tipo": "lista",
         "texto": "¿De qué programa de UNIR egresaste?",
         "ayuda": "Escribe para buscar en la lista.",
         "opciones": opciones_programa},
        {"id": "cargo_aspirado", "corto": "Cargo al que aspiras", "tipo": "texto",
         "texto": "¿Cuál es el cargo al que aspiras?",
         "ayuda": "Por ejemplo: gerente comercial, coordinadora académica, analista de datos.",
         "max_caracteres": 120},
        {"id": "areas_interes", "corto": "Áreas de desempeño", "tipo": "multiple", "maximo": MAX_AREAS,
         "texto": "¿En qué áreas de desempeño te visualizas?",
         "ayuda": f"Elige hasta {MAX_AREAS}.",
         "opciones": _opciones(AREAS_DESEMPENO)},
        {"id": "sectores_interes", "corto": "Sector económico", "tipo": "multiple", "maximo": MAX_SECTORES,
         "texto": "¿En qué sector económico te gustaría trabajar?",
         "ayuda": f"Elige hasta {MAX_SECTORES}.",
         "opciones": _opciones(SECTORES_ECONOMICOS)},
        {"id": "tipo_formacion", "corto": "Formación que te interesa", "tipo": "unica",
         "texto": "¿Qué tipo de formación te interesa seguir?",
         "opciones": _opciones(TIPO_FORMACION)},
        {"id": "habilidades_fortalecer", "corto": "Habilidades a fortalecer", "tipo": "multiple",
         "maximo": MAX_HABILIDADES,
         "texto": "¿Qué habilidades quieres fortalecer para llegar a ese cargo?",
         "ayuda": f"Elige hasta {MAX_HABILIDADES}.",
         "opciones": _opciones(HABILIDADES)},
        {"id": "horizonte_meta", "corto": "Plazo de tu meta", "tipo": "unica",
         "texto": "¿En cuánto tiempo quieres alcanzar esa meta?",
         "opciones": _opciones(HORIZONTE_META)},
        {"id": "horas_semanales", "corto": "Tiempo para estudiar", "tipo": "unica",
         "texto": "¿Cuántas horas a la semana podrías dedicar a estudiar?",
         "opciones": _opciones(HORAS_SEMANALES)},
    ]


def valores(catalogo: list[dict[str, Any]]) -> set[str]:
    return {o["valor"] for o in catalogo}


def por_valor(catalogo: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {o["valor"]: o for o in catalogo}
