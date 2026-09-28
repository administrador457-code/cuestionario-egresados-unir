import styles from "./SurveyProgress.module.css";

interface SurveyProgressProps {
  current: number; // índice 0..total-1
  total: number;
  /** Pantallas completas (con todas sus respuestas válidas). */
  answered: number;
  /** Nombre de la pantalla actual, p. ej. "Tu objetivo". */
  label?: string;
}

export function SurveyProgress({ current, total, answered, label }: SurveyProgressProps) {
  const percent = Math.round((answered / total) * 100);
  return (
    <div className={styles.progreso}>
      <div className={styles.fila}>
        {/* aria-live: el lector de pantalla anuncia cada cambio de pregunta */}
        <p className={styles.contador} aria-live="polite">
          Paso {current + 1} de {total}
          {label ? <span className={styles.nombrePaso}> · {label}</span> : null}
        </p>
        <p className={styles.respondidas}>
          {answered} de {total} completos
        </p>
      </div>
      <div
        className={styles.barra}
        role="progressbar"
        aria-label="Avance del cuestionario"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-valuetext={`${answered} de ${total} pasos completos`}
      >
        <span className={styles.relleno} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
