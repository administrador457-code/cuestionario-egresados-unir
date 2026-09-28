import type { GraduateDraft, OnboardingAnswers, ProfileFormValues } from "../types/graduate";

/** Clave de localStorage para el avance del egresado. */
export const DRAFT_STORAGE_KEY = "unirGraduateDraft";

export const EMPTY_ANSWERS: OnboardingAnswers = {
  targetRole: "",
  careerGoal: "",
  performanceAreas: [],
  economicSectors: [],
  currentSkills: [],
  educationTypes: [],
};

const PROFILE_KEYS: (keyof ProfileFormValues)[] = [
  "firstName", "lastName", "documentType", "documentNumber", "email", "program", "graduationYear", "privacyConsent",
];

/**
 * Lee el borrador guardado. Devuelve null si no hay o si está dañado.
 * Los borradores de versiones anteriores (cuestionario de 10 preguntas)
 * conservan solo los datos personales; las respuestas empiezan de nuevo.
 */
export function loadDraft(): GraduateDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<GraduateDraft> & { version?: number };
    if (!draft.profile) return null;
    if (draft.version === 3 && draft.answers) {
      return { ...(draft as GraduateDraft), answers: { ...EMPTY_ANSWERS, ...draft.answers } };
    }
    const profile = Object.fromEntries(
      PROFILE_KEYS.map((key) => [key, (draft.profile as Record<string, unknown>)[key] ?? (key === "privacyConsent" ? false : "")]),
    ) as unknown as ProfileFormValues;
    return {
      version: 3,
      stage: "profile",
      profile,
      answers: EMPTY_ANSWERS,
      currentStep: 0,
      prefilledFromM0: false,
      savedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Guarda el borrador con la fecha y hora actuales. Devuelve null si el
 * navegador no lo permite (modo privado, cuota llena, almacenamiento bloqueado).
 */
export function saveDraft(draft: Omit<GraduateDraft, "version" | "savedAt">): GraduateDraft | null {
  const complete: GraduateDraft = { ...draft, version: 3, savedAt: new Date().toISOString() };
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
