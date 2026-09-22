import { FIRST_GRADUATION_YEAR } from "../config/formOptions";
import type {
  ProfileErrors,
  ProfileField,
  ProfileFormValues,
  SurveyAnswers,
  SurveyQuestionConfig,
} from "../types/graduate";

/** Orden visual de los campos: define a cuál se lleva el foco primero. */
export const PROFILE_FIELD_ORDER: ProfileField[] = [
  "firstName",
  "lastName",
  "documentType",
  "documentNumber",
  "email",
  "phone",
  "country",
  "city",
  "program",
  "graduationYear",
  "privacyConsent",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOCUMENT_PATTERN = /^[A-Za-z0-9-]{4,20}$/;
const PHONE_ALLOWED = /^\+?[\d\s()-]+$/;

export function validateProfileField(field: ProfileField, values: ProfileFormValues): string | undefined {
  const value = values[field];
  const text = typeof value === "string" ? value.trim() : "";

  switch (field) {
    case "firstName":
      return text.length < 2 ? "Escribe tus nombres." : undefined;
    case "lastName":
      return text.length < 2 ? "Escribe tus apellidos." : undefined;
    case "documentType":
      return text ? undefined : "Elige el tipo de documento.";
    case "documentNumber":
      if (!text) return "Escribe tu número de documento.";
      return DOCUMENT_PATTERN.test(text)
        ? undefined
        : "Usa solo números y letras, sin puntos ni espacios (entre 4 y 20 caracteres).";
    case "email":
      if (!text) return "Escribe tu correo electrónico.";
      return EMAIL_PATTERN.test(text) ? undefined : "Revisa el correo: debe tener la forma nombre@dominio.com.";
    case "phone": {
      if (!text) return "Escribe tu teléfono móvil.";
      const digits = text.replace(/\D/g, "");
      if (!PHONE_ALLOWED.test(text) || digits.length < 7 || digits.length > 15) {
        return "Escribe un teléfono válido: entre 7 y 15 dígitos, con indicativo si estás fuera de Colombia.";
      }
      return undefined;
    }
    case "country":
      return text ? undefined : "Elige tu país de residencia.";
    case "city":
      return text.length < 2 ? "Escribe tu ciudad de residencia." : undefined;
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

export function isQuestionAnswered(question: SurveyQuestionConfig, answers: SurveyAnswers): boolean {
  const value = answers[question.id];
  if (question.type === "text") return typeof value === "string" && value.trim().length > 0;
  return typeof value === "string" && question.options.some((option) => option.value === value);
}
