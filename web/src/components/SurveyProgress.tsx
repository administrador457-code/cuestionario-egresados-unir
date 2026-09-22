import styles from "./SurveyProgress.module.css";

interface SurveyProgressProps {
  current: number; // índice 0..total-1
  total: number;
  answered: number;
}

export function SurveyProgress({ current, total, answered }: SurveyProgressProps) {
  const percent = Math.round((answered / total) * 100);
  return (
    <div className={styles.progreso}>
      <div className={styles.fila}>
        {/* aria-live: el lector de pantalla anuncia cada cambio de pregunta */}
        <p className={styles.contador} aria-live="polite">
          Pregunta {current + 1} de {total}
        </p>
        <p className={styles.respondidas}>
          {answered} de {total} respondidas
        </p>
      </div>
      <div
        className={styles.barra}
        role="progressbar"
        aria-label="Avance del cuestionario"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-valuetext={`${answered} de ${total} preguntas respondidas`}
      >
        <span className={styles.relleno} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
