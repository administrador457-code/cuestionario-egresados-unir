/** Modelo de datos del registro de egresados. */

export interface GraduateProfile {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  /** Valor estable del programa (id del catálogo UNIR u "otro"). */
  program: string;
  graduationYear: number;
  privacyConsent: boolean;
}

export interface GraduateSurvey {
  employmentStatus: string;
  targetRole: string;
  preferredEducationType: string;
  preferredPerformanceArea: string;
  preferredEconomicSector: string;
  yearsOfExperience: string;
  prioritySkill: string;
  preferredModality: string;
  mainEducationBarrier: string;
  preferredGraduateService: string;
}

export interface GraduateRegistration {
  profile: GraduateProfile;
  survey: GraduateSurvey;
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

export type SurveyField = keyof GraduateSurvey;
export type SurveyAnswers = Partial<Record<SurveyField, string>>;

/** Etapas del proceso que muestra el panel lateral. */
export type Stage = "profile" | "survey" | "done";

export interface SelectOption {
  value: string;
  label: string;
}

interface BaseQuestion {
  id: SurveyField;
  /** Etiqueta corta para resúmenes. */
  shortLabel: string;
  text: string;
  help: string;
}

export interface ChoiceQuestion extends BaseQuestion {
  type: "choice";
  options: SelectOption[];
}

export interface TextQuestion extends BaseQuestion {
  type: "text";
  placeholder: string;
  maxLength: number;
}

export type SurveyQuestionConfig = ChoiceQuestion | TextQuestion;

/** Lo que se guarda en localStorage mientras el egresado no termina. */
export interface GraduateDraft {
  version: 1;
  stage: Exclude<Stage, "done">;
  profile: ProfileFormValues;
  answers: SurveyAnswers;
  currentQuestion: number;
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
