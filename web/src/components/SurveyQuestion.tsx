import type { KeyboardEvent, Ref } from "react";
import { toggleMultipleValue } from "../lib/validation";
import type { SurveyAnswerValue, SurveyQuestionConfig } from "../types/graduate";
import { SelectableOption } from "./SelectableOption";
import styles from "./SurveyQuestion.module.css";

interface SurveyQuestionProps {
  question: SurveyQuestionConfig;
  number: number;
  value: SurveyAnswerValue;
  onChange: (value: SurveyAnswerValue) => void;
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
    const text = typeof value === "string" ? value : "";
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
          value={text}
          maxLength={question.maxLength}
          placeholder={question.placeholder}
          aria-required="true"
          aria-describedby={`${helpId} ${counterId}`}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKey}
        />
        <p id={counterId} className={styles.contador}>
          {text.length} de {question.maxLength} caracteres
        </p>
      </div>
    );
  }

  if (question.type === "multiple") {
    const selected = Array.isArray(value) ? value : [];
    const max = question.maxSelections;
    const full = max !== undefined && selected.length >= max;
    const statusId = `estado-${question.id}`;
    return (
      <fieldset className={styles.bloque} aria-describedby={`${helpId} ${statusId}`}>
        <legend className={styles.leyenda}>{heading}</legend>
        <p id={helpId} className={styles.ayuda}>
          {question.help}
        </p>
        <p id={statusId} className={styles.seleccion} aria-live="polite">
          {selectionStatus(selected.length, max)}
        </p>
        <div className={`${styles.opciones} ${question.options.length > 8 ? styles.dosColumnas : ""}`}>
          {question.options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <SelectableOption
                key={option.value}
                kind="checkbox"
                name={question.id}
                value={option.value}
                label={option.label}
                checked={checked}
                disabled={full && !checked}
                onSelect={(item) => onChange(toggleMultipleValue(question, selected, item))}
              />
            );
          })}
        </div>
      </fieldset>
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
            kind="radio"
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

function selectionStatus(count: number, max: number | undefined): string {
  if (max === undefined) {
    if (count === 0) return "Selección múltiple: puedes marcar varias opciones.";
    return count === 1 ? "1 opción seleccionada." : `${count} opciones seleccionadas.`;
  }
  if (count >= max) return `Elegiste ${count} de ${max}. Para cambiar una, primero desmarca otra.`;
  return `${count} de ${max} seleccionadas.`;
}
