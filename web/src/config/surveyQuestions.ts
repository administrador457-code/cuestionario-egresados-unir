import type { SurveyQuestionConfig } from "../types/graduate";

/**
 * Las 10 preguntas del cuestionario "Tu proyección profesional".
 *
 * Los `value` son estables: son lo que se guardará en la base de datos.
 * Cambiar un `label` no afecta nada; cambiar o eliminar un `value` sí.
 *
 * Todas son de selección múltiple ("multiple") salvo el cargo (texto) y los
 * años de experiencia (una sola opción). Máximos y opciones excluyentes deben
 * coincidir con app/registro.py en el backend, que valida lo mismo.
 *
 * Áreas (4), sectores (5) y competencias (7) usan los mismos valores que el
 * recomendador de programas del backend, así se cruzan con el catálogo UNIR.
 */
export const SURVEY_QUESTIONS: SurveyQuestionConfig[] = [
  {
    id: "employmentStatus",
    type: "multiple",
    shortLabel: "Situación laboral",
    text: "¿Cuál es tu situación laboral actual?",
    help: "Puedes marcar varias si aplica, por ejemplo si trabajas y además emprendes.",
    options: [
      { value: "tiempo_completo", label: "Trabajo a tiempo completo" },
      { value: "tiempo_parcial", label: "Trabajo a tiempo parcial" },
      { value: "independiente", label: "Soy independiente o emprendedor" },
      { value: "buscando_empleo", label: "Estoy buscando empleo" },
      { value: "no_busco_empleo", label: "Actualmente no busco empleo" },
    ],
  },
  {
    id: "targetRole",
    type: "text",
    shortLabel: "Cargo al que aspiras",
    text: "¿Cuál es el cargo o rol profesional al que aspiras?",
    help: "Escríbelo con tus palabras. Nos ayuda a sugerirte formación y oportunidades acordes.",
    placeholder: "Ej. Líder de analítica, director de proyectos, especialista en seguridad…",
    maxLength: 150,
  },
  {
    id: "preferredEducationType",
    type: "multiple",
    shortLabel: "Formación de interés",
    text: "¿Qué tipo de formación te interesa continuar?",
    help: "Puedes marcar varias. Piensa en tus siguientes pasos de formación, aunque no sean inmediatos.",
    exclusiveValues: ["ninguna"],
    options: [
      { value: "curso_corto", label: "Curso corto o certificación" },
      { value: "diplomado", label: "Diplomado o programa de experto" },
      { value: "especializacion", label: "Especialización" },
      { value: "maestria", label: "Maestría" },
      { value: "doctorado", label: "Doctorado" },
      { value: "ninguna", label: "Por ahora no deseo continuar" },
    ],
  },
  {
    id: "preferredPerformanceArea",
    type: "multiple",
    shortLabel: "Áreas de desempeño",
    text: "¿En cuáles áreas de desempeño te visualizas?",
    help: "Elige hasta 3, las que más se acerquen a lo que quieres hacer en los próximos años.",
    maxSelections: 3,
    options: [
      { value: "direccion_empresas", label: "Dirección y gestión de organizaciones" },
      { value: "finanzas", label: "Finanzas y contabilidad" },
      { value: "comercial_marketing", label: "Comercial, ventas y marketing" },
      { value: "talento_humano", label: "Talento humano" },
      { value: "educacion", label: "Educación y pedagogía" },
      { value: "tecnologia", label: "Tecnología y transformación digital" },
      { value: "datos_ia", label: "Datos, analítica e inteligencia artificial" },
      { value: "ciberseguridad", label: "Ciberseguridad" },
      { value: "proyectos", label: "Gestión de proyectos" },
      { value: "logistica", label: "Logística y operaciones" },
      { value: "juridica_publica", label: "Derecho y gestión pública" },
      { value: "salud_sst", label: "Salud y seguridad en el trabajo" },
      { value: "comunicacion", label: "Comunicación y contenidos" },
      { value: "sostenibilidad", label: "Medio ambiente y sostenibilidad" },
      { value: "otra", label: "Otra área" },
    ],
  },
  {
    id: "preferredEconomicSector",
    type: "multiple",
    shortLabel: "Sectores económicos",
    text: "¿En cuáles sectores económicos te gustaría trabajar?",
    help: "Elige hasta 3.",
    maxSelections: 3,
    options: [
      { value: "tecnologia", label: "Tecnología y telecomunicaciones" },
      { value: "educacion", label: "Educación" },
      { value: "financiero", label: "Banca, seguros y servicios financieros" },
      { value: "salud", label: "Salud" },
      { value: "publico", label: "Gobierno y sector público" },
      { value: "industria", label: "Industria y manufactura" },
      { value: "logistica_transporte", label: "Transporte y logística" },
      { value: "comercio", label: "Comercio y retail" },
      { value: "consultoria", label: "Consultoría y servicios profesionales" },
      { value: "construccion_energia", label: "Construcción, energía y minería" },
      { value: "agro", label: "Agroindustria" },
      { value: "social", label: "ONG y organizaciones sociales" },
      { value: "turismo_cultura", label: "Turismo, cultura y entretenimiento" },
      { value: "otro", label: "Otro sector" },
    ],
  },
  {
    id: "yearsOfExperience",
    type: "choice",
    shortLabel: "Experiencia",
    text: "¿Cuántos años de experiencia profesional tienes?",
    help: "Cuenta la experiencia laboral después de tu primer título.",
    options: [
      { value: "sin_experiencia", label: "Aún no tengo experiencia" },
      { value: "menos_2", label: "Menos de 2 años" },
      { value: "2_5", label: "Entre 2 y 5 años" },
      { value: "6_10", label: "Entre 6 y 10 años" },
      { value: "mas_10", label: "Más de 10 años" },
    ],
  },
  {
    id: "prioritySkill",
    type: "multiple",
    shortLabel: "Competencias prioritarias",
    text: "¿Qué competencias deseas fortalecer con mayor prioridad?",
    help: "Elige hasta 3, las que más necesitas para llegar al cargo al que aspiras.",
    maxSelections: 3,
    options: [
      { value: "liderazgo", label: "Liderazgo de equipos" },
      { value: "estrategia", label: "Pensamiento estratégico" },
      { value: "analisis_datos", label: "Análisis de datos" },
      { value: "ia", label: "Inteligencia artificial aplicada" },
      { value: "programacion", label: "Programación" },
      { value: "proyectos", label: "Gestión de proyectos" },
      { value: "finanzas", label: "Finanzas y presupuestos" },
      { value: "marketing_digital", label: "Marketing digital" },
      { value: "negociacion", label: "Negociación y ventas" },
      { value: "comunicacion", label: "Comunicación efectiva" },
      { value: "gestion_cambio", label: "Innovación y emprendimiento" },
      { value: "normatividad", label: "Normatividad y cumplimiento" },
      { value: "investigacion", label: "Investigación" },
      { value: "pedagogia_digital", label: "Pedagogía y ambientes virtuales" },
      { value: "ciberseguridad", label: "Ciberseguridad" },
      { value: "ingles", label: "Inglés y otros idiomas" },
      { value: "otra", label: "Otra competencia" },
    ],
  },
  {
    id: "preferredModality",
    type: "multiple",
    shortLabel: "Modalidades preferidas",
    text: "¿Qué modalidades de formación prefieres?",
    help: "Puedes marcar varias.",
    options: [
      { value: "virtual", label: "100 % virtual" },
      { value: "virtual_en_vivo", label: "Virtual con sesiones en vivo" },
      { value: "hibrida", label: "Híbrida" },
      { value: "presencial", label: "Presencial" },
      { value: "indiferente", label: "Me resulta indiferente" },
    ],
  },
  {
    id: "mainEducationBarrier",
    type: "multiple",
    shortLabel: "Principales barreras",
    text: "¿Cuáles son tus principales barreras para seguir formándote?",
    help: "Puedes marcar varias. Saberlo nos ayuda a diseñar opciones que se ajusten a tu realidad.",
    exclusiveValues: ["ninguna"],
    options: [
      { value: "costo", label: "Costo de la formación" },
      { value: "tiempo", label: "Falta de tiempo" },
      { value: "horarios", label: "Horarios poco flexibles" },
      { value: "programa_adecuado", label: "No encuentro el programa adecuado" },
      { value: "familiares", label: "Responsabilidades familiares" },
      { value: "ninguna", label: "No tengo barreras actualmente" },
    ],
  },
  {
    id: "preferredGraduateService",
    type: "multiple",
    shortLabel: "Servicios más valiosos",
    text: "¿Qué servicios de UNIR serían más valiosos para tu desarrollo?",
    help: "Elige hasta 3, los que más usarías en los próximos meses.",
    maxSelections: 3,
    options: [
      { value: "bolsa_empleo", label: "Bolsa de empleo y vacantes" },
      { value: "orientacion", label: "Orientación profesional" },
      { value: "networking", label: "Networking con otros egresados" },
      { value: "descuentos", label: "Descuentos en formación" },
      { value: "mentorias", label: "Mentorías con expertos" },
      { value: "eventos", label: "Eventos y actualización profesional" },
    ],
  },
];

export const TOTAL_QUESTIONS = SURVEY_QUESTIONS.length;
