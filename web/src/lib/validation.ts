import { FIRST_GRADUATION_YEAR } from "../config/formOptions";
import { MAX_AREAS, MAX_SECTORS, MAX_SKILLS } from "../config/onboardingOptions";
import type { OnboardingAnswers, ProfileErrors, ProfileField, ProfileFormValues } from "../types/graduate";

/** Orden visual de los campos: define a cuál se lleva el foco primero. */
export const PROFILE_FIELD_ORDER: ProfileField[] = [
  "documentType",
  "documentNumber",
  "firstName",
  "lastName",
  "email",
  "program",
  "graduationYear",
  "privacyConsent",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOCUMENT_PATTERN = /^[A-Za-z0-9-]{4,20}$/;

export function validateProfileField(field: ProfileField, values: ProfileFormValues): string | undefined {
  const value = values[field];
  const text = typeof value === "string" ? value.trim() : "";

  switch (field) {
    case "documentType":
      return text ? undefined : "Elige el tipo de documento.";
    case "documentNumber":
      if (!text) return "Escribe tu número de documento.";
      return DOCUMENT_PATTERN.test(text)
        ? undefined
        : "Usa solo números y letras, sin puntos ni espacios (entre 4 y 20 caracteres).";
    case "firstName":
      return text.length < 2 ? "Escribe tus nombres." : undefined;
    case "lastName":
      return text.length < 2 ? "Escribe tus apellidos." : undefined;
    case "email":
      if (!text) return "Escribe tu correo electrónico.";
      return EMAIL_PATTERN.test(text) ? undefined : "Revisa el correo: debe tener la forma nombre@dominio.com.";
    case "program":
      return text ? undefined : "Elige el programa que cursaste en UNIR.";
    case "graduationYear": {
      if (!text) return "Elige tu año de graduación.";
      const year = Number(text);
      const current = new Date().getFullYear();
      return Number.isInteger(year) && year >= FIRST_GRADUATION_YEAR && year <= current
        ? undefined
        : "Elige un año de graduación válido.";
    }
    case "privacyConsent":
      return values.privacyConsent ? undefined : "Debes autorizar el tratamiento de tus datos para continuar.";
  }
}

export function validateProfile(values: ProfileFormValues): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const field of PROFILE_FIELD_ORDER) {
    const error = validateProfileField(field, values);
    if (error) errors[field] = error;
  }
  return errors;
}

export function firstInvalidField(errors: ProfileErrors): ProfileField | undefined {
  return PROFILE_FIELD_ORDER.find((field) => errors[field]);
}

/**
 * Errores de una pantalla del onboarding (0 a 3), en el orden en que aparecen.
 * Lista vacía = se puede avanzar.
 */
export function validateStep(step: number, answers: OnboardingAnswers): string[] {
  const errors: string[] = [];
  if (step === 0) {
    if (answers.targetRole.trim().length < 2) errors.push("Escribe el cargo o rol al que aspiras.");
    if (!answers.careerGoal) errors.push("Elige tu principal objetivo profesional.");
  } else if (step === 1) {
    if (answers.performanceAreas.length === 0) errors.push("Elige al menos un área de desempeño.");
    if (answers.performanceAreas.length > MAX_AREAS) errors.push(`Elige como máximo ${MAX_AREAS} áreas.`);
    if (answers.economicSectors.length === 0) errors.push("Elige al menos un sector económico.");
    if (answers.economicSectors.length > MAX_SECTORS) errors.push(`Elige como máximo ${MAX_SECTORS} sectores.`);
  } else if (step === 2) {
    if (answers.currentSkills.length === 0) errors.push("Agrega al menos una habilidad o herramienta que domines.");
    if (answers.currentSkills.length > MAX_SKILLS) errors.push(`Agrega como máximo ${MAX_SKILLS} habilidades.`);
  } else if (step === 3) {
    if (answers.educationTypes.length === 0) errors.push("Elige al menos una opción de formación.");
  }
  return errors;
}

/**
 * Marca o desmarca una opción de selección múltiple respetando las opciones
 * excluyentes (p. ej. "No estoy seguro" borra las demás y al revés) y el máximo.
 */
export function toggleMultipleValue(
  rules: { maxSelections?: number; exclusiveValues?: string[] },
  current: string[],
  value: string,
): string[] {
  if (current.includes(value)) return current.filter((item) => item !== value);
  const exclusive = rules.exclusiveValues ?? [];
  if (exclusive.includes(value)) return [value];
  const next = [...current.filter((item) => !exclusive.includes(item)), value];
  if (rules.maxSelections !== undefined && next.length > rules.maxSelections) return current;
  return next;
}
