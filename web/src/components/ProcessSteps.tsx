import type { Stage } from "../types/graduate";
import styles from "./ProcessSteps.module.css";

const STEPS: { stage: Stage; title: string; detail: string }[] = [
  { stage: "profile", title: "Tu perfil", detail: "Datos de contacto." },
  { stage: "survey", title: "Tu futuro", detail: "10 preguntas." },
  { stage: "done", title: "Finalizar", detail: "Revisión y envío." },
];

const ORDER: Stage[] = ["profile", "survey", "done"];

interface ProcessStepsProps {
  stage: Stage;
}

export function ProcessSteps({ stage }: ProcessStepsProps) {
  const currentIndex = ORDER.indexOf(stage);

  return (
    <nav className={styles.panel} aria-label="Etapas del registro">
      <p className={styles.titulo}>Registro de egresados</p>
      <ol className={styles.lista}>
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex || stage === "done";
          const state = isComplete && !isCurrent ? "completa" : isCurrent ? "actual" : "pendiente";
          return (
            <li
              key={step.stage}
              className={`${styles.paso} ${styles[state]}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className={styles.marcador} aria-hidden="true">
                {isComplete ? <CheckIcon /> : index + 1}
              </span>
              <span className={styles.textos}>
                <span className={styles.nombrePaso}>{step.title}</span>
                <span className={styles.detalle}>{step.detail}</span>
                <span className="visually-hidden">
                  {isComplete ? " Etapa completada." : isCurrent ? " Etapa actual." : " Etapa pendiente."}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
