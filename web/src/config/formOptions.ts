import type { SelectOption } from "../types/graduate";

export const DOCUMENT_TYPES: SelectOption[] = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PPT", label: "Permiso por Protección Temporal" },
  { value: "PA", label: "Pasaporte" },
  { value: "DNI", label: "Documento de identidad de otro país" },
];

export const COUNTRIES: SelectOption[] = [
  "Colombia", "Argentina", "Bolivia", "Chile", "Costa Rica", "Ecuador", "El Salvador", "España",
  "Estados Unidos", "Guatemala", "Honduras", "México", "Nicaragua", "Panamá", "Paraguay", "Perú",
  "Puerto Rico", "República Dominicana", "Uruguay", "Venezuela", "Otro país",
].map((pais) => ({ value: pais, label: pais }));

/**
 * Programas de UNIR Colombia. Los `value` son los ids del catálogo que el
 * backend sincroniza desde la plataforma de pertinencia (tabla programas_unir).
 * Cuando exista la API, esta lista puede cargarse desde GET /api/preguntas.
 */
export const PROGRAMS: SelectOption[] = [
  { value: "26", label: "Especialización en Administración y Gerencia de la Salud" },
  { value: "1", label: "Especialización en Alta Gerencia" },
  { value: "108", label: "Especialización en Criminología" },
  { value: "19", label: "Especialización en Derecho Digital" },
  { value: "16", label: "Especialización en Derecho de la Empresa" },
  { value: "18", label: "Especialización en Derechos Humanos" },
  { value: "7", label: "Especialización en Dirección Comercial y Ventas" },
  { value: "9", label: "Especialización en Dirección y Gestión de Proyectos" },
  { value: "15", label: "Especialización en Dirección y Gestión de Tecnologías de la Información" },
  { value: "24", label: "Especialización en Educación Inclusiva" },
  { value: "21", label: "Especialización en Educación y Orientación Familiar" },
  { value: "23", label: "Especialización en Gerencia Educativa" },
  { value: "3", label: "Especialización en Gerencia Financiera" },
  { value: "14", label: "Especialización en Gestión Ambiental y Energética" },
  { value: "5", label: "Especialización en Gestión Humana" },
  { value: "17", label: "Especialización en Gestión Pública" },
  { value: "2", label: "Especialización en Gestión de la Seguridad y Salud en el Trabajo" },
  { value: "10", label: "Especialización en Ingeniería de Software" },
  { value: "11", label: "Especialización en Inteligencia Artificial" },
  { value: "4", label: "Especialización en Inteligencia de Negocio" },
  { value: "6", label: "Especialización en Marketing Digital" },
  { value: "20", label: "Especialización en Neuropsicología y Educación" },
  { value: "25", label: "Especialización en Pedagogía y Docencia" },
  { value: "8", label: "Especialización en Revisoría Fiscal y Auditoría de Cuentas" },
  { value: "12", label: "Especialización en Seguridad Informática" },
  { value: "22", label: "Especialización en TIC para la Enseñanza" },
  { value: "13", label: "Especialización en Visual Analytics y Big Data" },
  { value: "otro", label: "Otro programa (no aparece en la lista)" },
];

export const FIRST_GRADUATION_YEAR = 2010;

export function graduationYears(now = new Date()): SelectOption[] {
  const years: SelectOption[] = [];
  for (let year = now.getFullYear(); year >= FIRST_GRADUATION_YEAR; year -= 1) {
    years.push({ value: String(year), label: String(year) });
  }
  return years;
}

export function labelFor(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
