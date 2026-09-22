import { useCallback, useEffect, useRef, useState } from "react";
import { CompletionSummary, type CompletionData } from "./components/CompletionSummary";
import { GraduateRegistrationForm } from "./components/GraduateRegistrationForm";
import { Header } from "./components/Header";
import { ProcessSteps } from "./components/ProcessSteps";
import { SurveyProgress } from "./components/SurveyProgress";
import { SurveyQuestion } from "./components/SurveyQuestion";
import { Toast } from "./components/Toast";
import { PROGRAMS, labelFor } from "./config/formOptions";
import { SURVEY_QUESTIONS, TOTAL_QUESTIONS } from "./config/surveyQuestions";
import { clearDraft, loadDraft, saveDraft } from "./lib/draftStorage";
import { isQuestionAnswered } from "./lib/validation";
import { submitGraduateRegistration } from "./services/registrationService";
import buttons from "./styles/buttons.module.css";
import type {
  GraduateRegistration,
  GraduateSurvey,
  ProfileField,
  ProfileFormValues,
  Stage,
  SurveyAnswers,
} from "./types/graduate";
import styles from "./App.module.css";

const EMPTY_PROFILE: ProfileFormValues = {
  firstName: "",
  lastName: "",
  documentType: "",
  documentNumber: "",
  email: "",
  phone: "",
  country: "Colombia",
  city: "",
  program: "",
  graduationYear: "",
  privacyConsent: false,
};

const SAVED_MESSAGE = "Tu avance se guardó en este dispositivo.";
const SUBMIT_ERROR = "No fue posible registrar la información. Revisa tu conexión e inténtalo nuevamente.";

type SubmitStatus = "idle" | "submitting" | "error";

function hasProgress(profile: ProfileFormValues, answers: SurveyAnswers): boolean {
  const typed = (Object.keys(EMPTY_PROFILE) as ProfileField[]).some(
    (field) => profile[field] !== EMPTY_PROFILE[field],
  );
  return typed || Object.keys(answers).length > 0;
}

function buildRegistration(profile: ProfileFormValues, answers: SurveyAnswers): GraduateRegistration {
  const survey = Object.fromEntries(
    SURVEY_QUESTIONS.map((question) => {
      const value = answers[question.id];
      if (question.type === "multiple") return [question.id, Array.isArray(value) ? value : []];
      return [question.id, typeof value === "string" ? value.trim() : ""];
    }),
  ) as unknown as GraduateSurvey;
  return {
    profile: {
      ...profile,
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      documentNumber: profile.documentNumber.trim(),
      email: profile.email.trim().toLowerCase(),
      phone: profile.phone.trim(),
      city: profile.city.trim(),
      graduationYear: Number(profile.graduationYear),
    },
    survey,
    completedAt: new Date().toISOString(),
    status: "completed",
  };
}

export default function App() {
  // El borrador se lee una sola vez, al montar.
  const [initialDraft] = useState(loadDraft);

  const [stage, setStage] = useState<Stage>(initialDraft?.stage ?? "profile");
  const [profile, setProfile] = useState<ProfileFormValues>(initialDraft?.profile ?? EMPTY_PROFILE);
  const [answers, setAnswers] = useState<SurveyAnswers>(initialDraft?.answers ?? {});
  const [currentQuestion, setCurrentQuestion] = useState(
    Math.min(Math.max(initialDraft?.currentQuestion ?? 0, 0), TOTAL_QUESTIONS - 1),
  );
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [toast, setToast] = useState<string | null>(
    initialDraft ? "Retomamos tu avance guardado en este dispositivo." : null,
  );
  const [questionError, setQuestionError] = useState<string | null>(null);

  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
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

  // Guardado temporal: cada cambio se guarda de inmediato; el aviso se muestra
  // cuando el egresado hace una pausa, para no parpadear en cada tecla.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (stage === "done" || !hasProgress(profile, answers)) return;
    const saved = saveDraft({ stage, profile, answers, currentQuestion });
    const pause = window.setTimeout(
      () => showToast(saved ? SAVED_MESSAGE : "Tu navegador no permite guardar el avance en este dispositivo."),
      900,
    );
    return () => window.clearTimeout(pause);
  }, [stage, profile, answers, currentQuestion, showToast]);

  // Foco: al cambiar de etapa va al título; al cambiar de pregunta, a la pregunta.
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      stageHeadingRef.current?.focus();
      window.scrollTo({ top: 0 });
    }
  }, [stage]);

  const previousQuestion = useRef(currentQuestion);
  useEffect(() => {
    if (previousQuestion.current !== currentQuestion) {
      previousQuestion.current = currentQuestion;
      questionHeadingRef.current?.focus();
    }
  }, [currentQuestion]);

  const updateProfile = useCallback(<F extends ProfileField>(field: F, value: ProfileFormValues[F]) => {
    setProfile((current) => ({ ...current, [field]: value }));
  }, []);

  const question = SURVEY_QUESTIONS[currentQuestion];
  const answeredCount = SURVEY_QUESTIONS.filter((q) => isQuestionAnswered(q, answers)).length;
  const isLast = currentQuestion === TOTAL_QUESTIONS - 1;
  const currentAnswered = isQuestionAnswered(question, answers);

  function goNext() {
    if (!currentAnswered) {
      setQuestionError(
        question.type === "text"
          ? "Escribe tu respuesta para continuar."
          : question.type === "multiple"
            ? "Elige al menos una opción para continuar."
            : "Elige una opción para continuar.",
      );
      return;
    }
    setQuestionError(null);
    if (isLast) {
      void submit();
    } else {
      setCurrentQuestion((index) => index + 1);
    }
  }

  function goPrevious() {
    setQuestionError(null);
    if (currentQuestion === 0) {
      setStage("profile");
    } else {
      setCurrentQuestion((index) => index - 1);
    }
  }

  async function submit() {
    if (submittingRef.current) return; // evita envíos duplicados
    submittingRef.current = true;
    setSubmitStatus("submitting");
    try {
      const registration = buildRegistration(profile, answers);
      const result = await submitGraduateRegistration(registration);
      clearDraft();
      setCompletion({
        fullName: `${registration.profile.firstName} ${registration.profile.lastName}`,
        programLabel: labelFor(PROGRAMS, registration.profile.program),
        graduationYear: registration.profile.graduationYear,
        answered: answeredCount,
        total: TOTAL_QUESTIONS,
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
    setProfile(EMPTY_PROFILE);
    setAnswers({});
    setCurrentQuestion(0);
    previousQuestion.current = 0;
    setCompletion(null);
    setSubmitStatus("idle");
    setQuestionError(null);
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
                <GraduateRegistrationForm values={profile} onChange={updateProfile} onContinue={() => setStage("survey")} />
              </section>
            ) : null}

            {stage === "survey" ? (
              <section className={styles.tarjeta} aria-labelledby="titulo-encuesta">
                <header className={styles.cabecera}>
                  <h1 id="titulo-encuesta" ref={stageHeadingRef} tabIndex={-1}>
                    Tu proyección profesional
                  </h1>
                  <p>
                    Tus respuestas ayudarán a UNIR a diseñar mejores servicios, programas y oportunidades para sus
                    egresados.
                  </p>
                </header>

                <SurveyProgress current={currentQuestion} total={TOTAL_QUESTIONS} answered={answeredCount} />

                <div className={styles.pregunta}>
                  <SurveyQuestion
                    key={question.id}
                    question={question}
                    number={currentQuestion + 1}
                    value={answers[question.id] ?? (question.type === "multiple" ? [] : "")}
                    headingRef={questionHeadingRef}
                    onSubmitText={goNext}
                    onChange={(value) => {
                      setAnswers((current) => ({ ...current, [question.id]: value }));
                      setQuestionError(null);
                      if (submitStatus === "error") setSubmitStatus("idle");
                    }}
                  />
                </div>

                {/* Avisos y navegación. Las regiones vivas están siempre presentes y, vacías, no ocupan espacio. */}
                <div className={styles.pie}>
                  <div aria-live="assertive">
                    {questionError ? <p className={styles.avisoPregunta}>{questionError}</p> : null}
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
                      aria-disabled={!currentAnswered || undefined}
                    >
                      {submitting ? "Enviando…" : isLast ? "Enviar respuestas" : "Siguiente"}
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
