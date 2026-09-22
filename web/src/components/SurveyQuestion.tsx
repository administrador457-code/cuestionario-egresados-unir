import type { KeyboardEvent, Ref } from "react";
import type { SurveyQuestionConfig } from "../types/graduate";
import { SelectableOption } from "./SelectableOption";
import styles from "./SurveyQuestion.module.css";

interface SurveyQuestionProps {
  question: SurveyQuestionConfig;
  number: number;
  value: string;
  onChange: (value: string) => void;
  /** Enter en la pregunta abierta avanza, igual que "Siguiente". */
  onSubmitText: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}

export function SurveyQuestion({ question, number, value, onChange, onSubmitText, headingRef }: SurveyQuestionProps) {
  const helpId = `ayuda-${question.id}`;
  const heading = (
    <h2 ref={headingRef} tabIndex={-1} className={styles.pregunta}>
      <span className={styles.numero}>{number}.</span> {question.text}
    </h2>
  );

  if (question.type === "text") {
    const counterId = `contador-${question.id}`;
    const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSubmitText();
      }
    };
    return (
      <div className={styles.bloque}>
        <label htmlFor={`respuesta-${question.id}`} className={styles.etiquetaPregunta}>
          {heading}
        </label>
        <p id={helpId} className={styles.ayuda}>
          {question.help}
        </p>
        <input
          id={`respuesta-${question.id}`}
          className={styles.texto}
          type="text"
          value={value}
          maxLength={question.maxLength}
          placeholder={question.placeholder}
          aria-required="true"
          aria-describedby={`${helpId} ${counterId}`}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKey}
        />
        <p id={counterId} className={styles.contador}>
          {value.length} de {question.maxLength} caracteres
        </p>
      </div>
    );
  }

  return (
    <fieldset className={styles.bloque} aria-describedby={helpId}>
      <legend className={styles.leyenda}>{heading}</legend>
      <p id={helpId} className={styles.ayuda}>
        {question.help}
      </p>
      <div className={`${styles.opciones} ${question.options.length > 8 ? styles.dosColumnas : ""}`}>
        {question.options.map((option) => (
          <SelectableOption
            key={option.value}
            name={question.id}
            value={option.value}
            label={option.label}
            checked={value === option.value}
            onSelect={onChange}
          />
        ))}
      </div>
    </fieldset>
  );
}
