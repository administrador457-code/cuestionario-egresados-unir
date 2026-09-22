import { SURVEY_QUESTIONS } from "../config/surveyQuestions";
import type { GraduateDraft, SurveyAnswers } from "../types/graduate";

/** Clave de localStorage para el avance del egresado. */
export const DRAFT_STORAGE_KEY = "unirGraduateDraft";

/** Lee el borrador guardado. Devuelve null si no hay o si está dañado. */
export function loadDraft(): GraduateDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Omit<Partial<GraduateDraft>, "version"> & { version?: number };
    if (!draft.profile || !draft.answers) return null;
    if (draft.version === 1) {
      // Versión 1: todas las preguntas cerradas eran de una sola opción.
      return { ...(draft as GraduateDraft), version: 2, answers: migrateAnswers(draft.answers) };
    }
    if (draft.version !== 2) return null;
    return draft as GraduateDraft;
  } catch {
    return null;
  }
}

/** Convierte respuestas de una sola opción en listas donde ahora hay selección múltiple. */
function migrateAnswers(answers: SurveyAnswers): SurveyAnswers {
  const migrated: SurveyAnswers = { ...answers };
  for (const question of SURVEY_QUESTIONS) {
    const value = migrated[question.id];
    if (question.type === "multiple" && typeof value === "string") migrated[question.id] = [value];
  }
  return migrated;
}

/**
 * Guarda el borrador con la fecha y hora actuales. Devuelve null si el
 * navegador no lo permite (modo privado, cuota llena, almacenamiento bloqueado).
 */
export function saveDraft(draft: Omit<GraduateDraft, "version" | "savedAt">): GraduateDraft | null {
  const complete: GraduateDraft = { ...draft, version: 2, savedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(complete));
    return complete;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* sin almacenamiento disponible: no hay nada que borrar */
  }
}
