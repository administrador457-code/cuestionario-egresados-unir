import type { Ref } from "react";
import buttons from "../styles/buttons.module.css";
import styles from "./CompletionSummary.module.css";

export interface CompletionData {
  fullName: string;
  programLabel: string;
  graduationYear: number;
  answered: number;
  total: number;
}

interface CompletionSummaryProps {
  data: CompletionData;
  onRestart: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}

export function CompletionSummary({ data, onRestart, headingRef }: CompletionSummaryProps) {
  return (
    <section className={styles.final} aria-labelledby="titulo-final">
      <span className={styles.icono} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" focusable="false">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 id="titulo-final" ref={headingRef} tabIndex={-1} className={styles.titulo}>
        Gracias por seguir conectado con UNIR
      </h1>
      <p className={styles.texto}>
        Hemos registrado tu perfil y tus intereses. Esta información permitirá ofrecerte contenidos y oportunidades
        más pertinentes.
      </p>

      <dl className={styles.resumen}>
        <div>
          <dt>Nombre completo</dt>
          <dd>{data.fullName}</dd>
        </div>
        <div>
          <dt>Programa cursado</dt>
          <dd>{data.programLabel}</dd>
        </div>
        <div>
          <dt>Año de graduación</dt>
          <dd>{data.graduationYear}</dd>
        </div>
        <div>
          <dt>Respuestas completadas</dt>
          <dd>
            {data.answered} de {data.total}
          </dd>
        </div>
      </dl>

      <div>
        <button type="button" className={buttons.secundario} onClick={onRestart}>
          Realizar un nuevo registro
        </button>
      </div>
    </section>
  );
}
