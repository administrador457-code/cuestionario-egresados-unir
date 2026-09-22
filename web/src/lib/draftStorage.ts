import type { GraduateDraft } from "../types/graduate";

/** Clave de localStorage para el avance del egresado. */
export const DRAFT_STORAGE_KEY = "unirGraduateDraft";

/** Lee el borrador guardado. Devuelve null si no hay o si está dañado. */
export function loadDraft(): GraduateDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<GraduateDraft>;
    if (draft.version !== 1 || !draft.profile || !draft.answers) return null;
    return draft as GraduateDraft;
  } catch {
    return null;
  }
}

/**
 * Guarda el borrador con la fecha y hora actuales. Devuelve null si el
 * navegador no lo permite (modo privado, cuota llena, almacenamiento bloqueado).
 */
export function saveDraft(draft: Omit<GraduateDraft, "version" | "savedAt">): GraduateDraft | null {
  const complete: GraduateDraft = { ...draft, version: 1, savedAt: new Date().toISOString() };
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
