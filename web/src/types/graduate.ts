/** Modelo de datos del registro y onboarding de egresados. */

/** Datos mínimos del egresado: lo que lo identifica y lo cruza con M0. */
export interface GraduateProfile {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  /** Valor estable del programa (id del catálogo UNIR u "otro"). */
  program: string;
  graduationYear: number;
  privacyConsent: boolean;
}

/** Habilidad del catálogo normalizado (misma clave que usan vacantes y programas). */
export interface SkillRef {
  key: string;
  name: string;
}

/** Las 4 pantallas del onboarding. */
export interface OnboardingAnswers {
  /** 1. Tu objetivo */
  targetRole: string;
  careerGoal: string;
  /** 2. Dónde te visualizas */
  performanceAreas: string[];
  economicSectors: string[];
  /** 3. Lo que sabes */
  currentSkills: SkillRef[];
  /** 4. Tu formación */
  educationTypes: string[];
}

/** Lo que se envía a la API (las habilidades viajan solo como claves). */
export interface GraduateRegistration {
  profile: GraduateProfile;
  answers: Omit<OnboardingAnswers, "currentSkills"> & { currentSkills: string[] };
  prefilledFromM0: boolean;
  completedAt: string;
  status: "draft" | "completed";
}

/**
 * Estado editable del formulario. Mientras se diligencia, el año de
 * graduación es texto (valor del select) y se convierte a número al enviar.
 */
export type ProfileFormValues = Omit<GraduateProfile, "graduationYear"> & {
  graduationYear: string;
};

export type ProfileField = keyof ProfileFormValues;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

/** Etapas del proceso que muestra el panel lateral. */
export type Stage = "profile" | "survey" | "done";

export interface SelectOption {
  value: string;
  label: string;
}

/** Lo que se guarda en localStorage mientras el egresado no termina. */
export interface GraduateDraft {
  version: 3;
  stage: Exclude<Stage, "done">;
  profile: ProfileFormValues;
  answers: OnboardingAnswers;
  currentStep: number;
  prefilledFromM0: boolean;
  savedAt: string;
}

/** Programa UNIR recomendado por el backend según las respuestas. */
export interface ProgramRecommendation {
  position: number;
  programId: number;
  programName: string;
  programType: string | null;
  /** Afinidad de 0 a 100. */
  score: number;
  reasons: string[];
  url: string | null;
}

/** Datos que la base institucional M0 (Momento 0) ya tiene del egresado. */
export interface M0Prefill {
  source: "M0";
  /** true = registro ficticio de demostración. */
  demo: boolean;
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    program: string;
    graduationYear: number | null;
  };
  survey: {
    employmentStatus: string[];
    targetRole: string;
  };
  context: {
    currentRole: string | null;
    company: string | null;
    employed: boolean | null;
    surveyDate: string | null;
  };
}

/** Sugerencia de cargo tomada de las vacantes vigentes. */
export interface RoleSuggestion {
  name: string;
  /** Vacantes vigentes con ese cargo. */
  demand: number;
}

/** Habilidad sugerida por el catálogo. */
export interface SkillSuggestion extends SkillRef {
  category: string | null;
  /** Vacantes vigentes que la piden. */
  demand: number;
}
