import { useCallback, useEffect, useRef, useState } from "react";
import { CompletionSummary, type CompletionData } from "./components/CompletionSummary";
import { GraduateRegistrationForm } from "./components/GraduateRegistrationForm";
import { Header } from "./components/Header";
import { OnboardingStep } from "./components/OnboardingStep";
import { ProcessSteps } from "./components/ProcessSteps";
import { SurveyProgress } from "./components/SurveyProgress";
import { Toast } from "./components/Toast";
import { PROGRAMS, labelFor } from "./config/formOptions";
import { ONBOARDING_STEPS, TOTAL_STEPS } from "./config/onboardingOptions";
import { EMPTY_ANSWERS, clearDraft, loadDraft, saveDraft } from "./lib/draftStorage";
import { validateStep } from "./lib/validation";
import { submitGraduateRegistration } from "./services/registrationService";
import buttons from "./styles/buttons.module.css";
import type {
  GraduateRegistration,
  M0Prefill,
  OnboardingAnswers,
  ProfileField,
  ProfileFormValues,
  Stage,
} from "./types/graduate";
import styles from "./App.module.css";

const EMPTY_PROFILE: ProfileFormValues = {
  firstName: "",
  lastName: "",
  documentType: "",
  documentNumber: "",
  email: "",
  program: "",
  graduationYear: "",
  privacyConsent: false,
};

const SAVED_MESSAGE = "Tu avance se guardó en este dispositivo.";
const SUBMIT_ERROR = "No fue posible registrar la información. Revisa tu conexión e inténtalo nuevamente.";

type SubmitStatus = "idle" | "submitting" | "error";

function hasProgress(profile: ProfileFormValues, answers: OnboardingAnswers): boolean {
  const typed = (Object.keys(EMPTY_PROFILE) as ProfileField[]).some((field) => profile[field] !== EMPTY_PROFILE[field]);
  return typed || JSON.stringify(answers) !== JSON.stringify(EMPTY_ANSWERS);
}

function buildRegistration(
  profile: ProfileFormValues,
  answers: OnboardingAnswers,
  prefilledFromM0: boolean,
): GraduateRegistration {
  return {
    profile: {
      ...profile,
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      documentNumber: profile.documentNumber.trim(),
      email: profile.email.trim().toLowerCase(),
      graduationYear: Number(profile.graduationYear),
    },
    answers: {
      ...answers,
      targetRole: answers.targetRole.trim(),
      currentSkills: answers.currentSkills.map((skill) => skill.key),
    },
    prefilledFromM0,
    completedAt: new Date().toISOString(),
    status: "completed",
  };
}

export default function App() {
  // El borrador se lee una sola vez, al montar.
  const [initialDraft] = useState(loadDraft);

  const [stage, setStage] = useState<Stage>(initialDraft?.stage ?? "profile");
  const [profile, setProfile] = useState<ProfileFormValues>(initialDraft?.profile ?? EMPTY_PROFILE);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialDraft?.answers ?? EMPTY_ANSWERS);
  const [currentStep, setCurrentStep] = useState(
    Math.min(Math.max(initialDraft?.currentStep ?? 0, 0), TOTAL_STEPS - 1),
  );
  const [prefilledFromM0, setPrefilledFromM0] = useState(initialDraft?.prefilledFromM0 ?? false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [toast, setToast] = useState<string | null>(
    initialDraft ? "Retomamos tu avance guardado en este dispositivo." : null,
  );
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const submittingRef = useRef(false);
  const isFirstRender = useRef(true);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Oculta el aviso inicial de "retomamos tu avance".
  useEffect(() => {
    if (!initialDraft) return;
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(toastTimer.current);
  }, [initialDraft]);

  // Guardado temporal: cada cambio se guarda de inmediato; el aviso aparece en una pausa.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (stage === "done" || !hasProgress(profile, answers)) return;
    const saved = saveDraft({ stage, profile, answers, currentStep, prefilledFromM0 });
    const pause = window.setTimeout(
      () => showToast(saved ? SAVED_MESSAGE : "Tu navegador no permite guardar el avance en este dispositivo."),
      900,
    );
    return () => window.clearTimeout(pause);
  }, [stage, profile, answers, currentStep, prefilledFromM0, showToast]);

  // Foco: al cambiar de etapa va al título; al cambiar de paso, al título del paso.
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      stageHeadingRef.current?.focus();
      window.scrollTo({ top: 0 });
    }
  }, [stage]);

  const previousStep = useRef(currentStep);
  useEffect(() => {
    if (previousStep.current !== currentStep) {
      previousStep.current = currentStep;
      stepHeadingRef.current?.focus();
      window.scrollTo({ top: 0 });
    }
  }, [currentStep]);

  const updateProfile = useCallback(<F extends ProfileField>(field: F, value: ProfileFormValues[F]) => {
    setProfile((current) => ({ ...current, [field]: value }));
  }, []);

  const updateAnswers = useCallback((patch: Partial<OnboardingAnswers>) => {
    setAnswers((current) => ({ ...current, ...patch }));
    setStepErrors([]);
  }, []);

  // Precarga desde M0: completa los campos vacíos y los que venían de una
  // precarga anterior (si cambia el documento), nunca lo que el egresado escribió.
  const m0Values = useRef<Partial<Record<ProfileField, string>>>({});
  const m0Role = useRef<string>("");

  const applyM0 = useCallback(
    (prefill: M0Prefill): number => {
      let filled = 0;
      const incoming: Partial<Record<ProfileField, string>> = {
        firstName: prefill.profile.firstName,
        lastName: prefill.profile.lastName,
        email: prefill.profile.email,
        program: prefill.profile.program,
        graduationYear: prefill.profile.graduationYear ? String(prefill.profile.graduationYear) : "",
      };
      const next = { ...profile };
      for (const [field, value] of Object.entries(incoming) as [ProfileField, string][]) {
        if (!value) continue;
        const current = String(next[field] ?? "");
        const replaceable = current === "" || current === m0Values.current[field];
        if (replaceable && current !== value) {
          (next as Record<ProfileField, unknown>)[field] = value;
          filled += 1;
        }
        m0Values.current[field] = value;
      }
      setProfile(next);
      const role = prefill.survey.targetRole;
      if (role && (!answers.targetRole || answers.targetRole === m0Role.current)) {
        setAnswers((current) => ({ ...current, targetRole: role }));
        m0Role.current = role;
      }
      setPrefilledFromM0(true);
      return filled;
    },
    [profile, answers.targetRole],
  );

  const stepValid = validateStep(currentStep, answers).length === 0;
  const completedSteps = ONBOARDING_STEPS.filter((_, index) => validateStep(index, answers).length === 0).length;
  const isLast = currentStep === TOTAL_STEPS - 1;

  function goNext() {
    const errors = validateStep(currentStep, answers);
    if (errors.length) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    if (isLast) void submit();
    else setCurrentStep((index) => index + 1);
  }

  function goPrevious() {
    setStepErrors([]);
    if (currentStep === 0) setStage("profile");
    else setCurrentStep((index) => index - 1);
  }

  async function submit() {
    if (submittingRef.current) return; // evita envíos duplicados
    submittingRef.current = true;
    setSubmitStatus("submitting");
    try {
      const registration = buildRegistration(profile, answers, prefilledFromM0);
      const result = await submitGraduateRegistration(registration);
      clearDraft();
      setCompletion({
        fullName: `${registration.profile.firstName} ${registration.profile.lastName}`,
        programLabel: labelFor(PROGRAMS, registration.profile.program),
        graduationYear: registration.profile.graduationYear,
        targetRole: registration.answers.targetRole,
        recommendations: result.recommendations ?? [],
      });
      setSubmitStatus("idle");
      setToast(null);
      setStage("done");
    } catch (error) {
      console.warn("No se pudo enviar el registro:", error);
      setSubmitStatus("error");
    } finally {
      submittingRef.current = false;
    }
  }

  function restart() {
    clearDraft();
    m0Values.current = {};
    m0Role.current = "";
    setProfile(EMPTY_PROFILE);
    setAnswers(EMPTY_ANSWERS);
    setCurrentStep(0);
    previousStep.current = 0;
    setPrefilledFromM0(false);
    setCompletion(null);
    setSubmitStatus("idle");
    setStepErrors([]);
    setToast(null);
    setStage("profile");
  }

  const submitting = submitStatus === "submitting";

  return (
    <div className={styles.app}>
      <a className={styles.saltar} href="#contenido">
        Saltar al formulario
      </a>
      <Header />
      <div className={styles.cuerpo}>
        <aside className={styles.lateral}>
          <ProcessSteps stage={stage} />
        </aside>

        <main id="contenido" className={styles.principal} tabIndex={-1}>
          <div className={styles.contenedor}>
            {stage === "profile" ? (
              <section className={styles.tarjeta} aria-labelledby="titulo-perfil">
                <header className={styles.cabecera}>
                  <h1 id="titulo-perfil" ref={stageHeadingRef} tabIndex={-1}>
                    Actualiza tus datos
                  </h1>
                  <p>
                    Esta información nos permitirá mantener el contacto y comprender mejor tu trayectoria después de
                    UNIR.
                  </p>
                </header>
                <GraduateRegistrationForm
                  values={profile}
                  onChange={updateProfile}
                  onPrefill={applyM0}
                  onContinue={() => setStage("survey")}
                />
              </section>
            ) : null}

            {stage === "survey" ? (
              <section className={styles.tarjeta} aria-labelledby="titulo-encuesta">
                <header className={styles.cabecera}>
                  <h1 id="titulo-encuesta" ref={stageHeadingRef} tabIndex={-1}>
                    Tu proyección profesional
                  </h1>
                  <p>
                    Cuatro pasos cortos. Con tus respuestas comparamos tu perfil con lo que pide hoy el mercado y te
                    sugerimos programas de UNIR.
                  </p>
                </header>

                <SurveyProgress
                  current={currentStep}
                  total={TOTAL_STEPS}
                  answered={completedSteps}
                  label={ONBOARDING_STEPS[currentStep].title}
                />

                <OnboardingStep
                  key={currentStep}
                  step={currentStep}
                  answers={answers}
                  onChange={updateAnswers}
                  onEnter={goNext}
                  headingRef={stepHeadingRef}
                />

                {/* Avisos y navegación. Las regiones vivas están siempre presentes y, vacías, no ocupan espacio. */}
                <div className={styles.pie}>
                  <div aria-live="assertive">
                    {stepErrors.length ? (
                      <ul className={styles.avisoPregunta}>
                        {stepErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div role="alert">
                    {submitStatus === "error" ? (
                      <div className={styles.errorEnvio}>
                        <p>{SUBMIT_ERROR}</p>
                        <button type="button" className={buttons.primario} onClick={() => void submit()}>
                          Volver a intentar
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <p className="visually-hidden" aria-live="polite">
                    {submitting ? "Enviando tus respuestas." : ""}
                  </p>
                  <div className={styles.navegacion}>
                    <button type="button" className={buttons.secundario} onClick={goPrevious} disabled={submitting}>
                      Anterior
                    </button>
                    <button
                      type="button"
                      className={buttons.primario}
                      onClick={goNext}
                      disabled={submitting}
                      aria-disabled={!stepValid || undefined}
                    >
                      {submitting ? "Enviando…" : isLast ? "Ver mi ruta profesional" : "Siguiente"}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {stage === "done" && completion ? (
              <div className={styles.tarjeta}>
                <CompletionSummary data={completion} onRestart={restart} headingRef={stageHeadingRef} />
              </div>
            ) : null}
          </div>
        </main>
      </div>
      <Toast message={toast} />
    </div>
  );
}
