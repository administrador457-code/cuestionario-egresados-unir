import type { Ref } from "react";
import type { ProgramRecommendation } from "../types/graduate";
import buttons from "../styles/buttons.module.css";
import styles from "./CompletionSummary.module.css";

export interface CompletionData {
  fullName: string;
  programLabel: string;
  graduationYear: number;
  answered: number;
  total: number;
  recommendations: ProgramRecommendation[];
}

const PROGRAM_TYPES: Record<string, string> = {
  especializacion: "Especialización",
  maestria: "Maestría",
  doctorado: "Doctorado",
  curso_corto: "Curso o diplomado",
  pregrado: "Pregrado",
};

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

      <section className={styles.recomendaciones} aria-labelledby="titulo-recomendaciones">
        <h2 id="titulo-recomendaciones" className={styles.subtitulo}>
          Programas que encajan con tu proyección
        </h2>
        {data.recommendations.length > 0 ? (
          <>
            <p className={styles.nota}>
              Los ordenamos según tus respuestas. Un asesor de UNIR puede ayudarte a elegir y resolver dudas sobre
              admisión.
            </p>
            <ol className={styles.lista}>
              {data.recommendations.map((rec) => {
                const score = Math.round(rec.score);
                const type = rec.programType ? PROGRAM_TYPES[rec.programType] : undefined;
                return (
                  <li key={rec.programId} className={styles.programa}>
                    <span className={styles.posicion} aria-hidden="true">
                      {rec.position}
                    </span>
                    <div className={styles.detallePrograma}>
                      <h3 className={styles.nombrePrograma}>{rec.programName}</h3>
                      {type ? <p className={styles.tipo}>{type}</p> : null}
                      <div className={styles.afinidad}>
                        <span className={styles.barra} aria-hidden="true">
                          <span style={{ width: `${score}%` }} />
                        </span>
                        <span>Afinidad {score} de 100</span>
                      </div>
                      {rec.reasons.length > 0 ? (
                        <ul className={styles.razones}>
                          {rec.reasons.slice(0, 3).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      ) : null}
                      {rec.url ? (
                        <a className={styles.enlace} href={rec.url} target="_blank" rel="noopener noreferrer">
                          Conocer el programa<span className="visually-hidden"> {rec.programName} (se abre en otra pestaña)</span>
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <p className={styles.nota}>
            No encontramos un programa del catálogo que coincida claramente con tus intereses. Un asesor de UNIR
            puede orientarte sobre otras opciones.
          </p>
        )}
      </section>

      <div>
        <button type="button" className={buttons.secundario} onClick={onRestart}>
          Realizar un nuevo registro
        </button>
      </div>
    </section>
  );
}
