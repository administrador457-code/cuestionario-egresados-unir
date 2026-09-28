import type { SelectOption } from "../types/graduate";

/**
 * Opciones de las 4 pantallas del onboarding. Los `value` son estables y
 * deben coincidir con app/onboarding.py y app/registro.py en el backend.
 * Áreas y sectores usan los mismos valores que el recomendador de programas.
 */

export const CAREER_GOALS: SelectOption[] = [
  { value: "conseguir_empleo", label: "Conseguir empleo" },
  { value: "ascender", label: "Ascender en mi trabajo actual" },
  { value: "cambiar_cargo", label: "Cambiar de cargo" },
  { value: "cambiar_sector", label: "Cambiar de sector" },
  { value: "fortalecer_perfil", label: "Fortalecer mi perfil profesional" },
];

export const PERFORMANCE_AREAS: SelectOption[] = [
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
];

export const ECONOMIC_SECTORS: SelectOption[] = [
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
];

export const EDUCATION_TYPES: SelectOption[] = [
  { value: "curso_certificacion", label: "Curso o certificación" },
  { value: "diplomado", label: "Diplomado" },
  { value: "especializacion", label: "Especialización" },
  { value: "maestria", label: "Maestría" },
  { value: "doctorado", label: "Doctorado" },
  { value: "no_seguro", label: "No estoy seguro, recomiéndame" },
  { value: "ninguna", label: "Por ahora no quiero estudiar" },
];

export const EDUCATION_EXCLUSIVE = ["no_seguro", "ninguna"];

export const MAX_AREAS = 3;
export const MAX_SECTORS = 3;
export const MAX_SKILLS = 15;
export const TARGET_ROLE_MAX = 150;

/** Pantallas del onboarding, en orden. */
export const ONBOARDING_STEPS = [
  { id: "objetivo", title: "Tu objetivo" },
  { id: "donde", title: "Dónde te visualizas" },
  { id: "sabes", title: "Lo que sabes" },
  { id: "formacion", title: "Tu formación" },
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;
