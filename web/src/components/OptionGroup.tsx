import type { ReactNode } from "react";
import { toggleMultipleValue } from "../lib/validation";
import type { SelectOption } from "../types/graduate";
import { SelectableOption } from "./SelectableOption";
import styles from "./OptionGroup.module.css";

interface BaseProps {
  name: string;
  legend: ReactNode;
  help?: string;
  options: SelectOption[];
}

interface SingleProps extends BaseProps {
  kind: "single";
  value: string;
  onChange: (value: string) => void;
}

interface MultipleProps extends BaseProps {
  kind: "multiple";
  value: string[];
  onChange: (value: string[]) => void;
  maxSelections?: number;
  exclusiveValues?: string[];
}

/**
 * Pregunta de opciones como tarjetas. Una sola opción usa radios nativos;
 * varias, casillas. Ambos funcionan con teclado y lector de pantalla.
 */
export function OptionGroup(props: SingleProps | MultipleProps) {
  const { name, legend, help, options } = props;
  const helpId = `ayuda-${name}`;
  const statusId = `estado-${name}`;
  const twoColumns = options.length > 6;

  if (props.kind === "single") {
    return (
      <fieldset className={styles.grupo} aria-describedby={help ? helpId : undefined}>
        <legend className={styles.leyenda}>{legend}</legend>
        {help ? <p id={helpId} className={styles.ayuda}>{help}</p> : null}
        <div className={`${styles.opciones} ${twoColumns ? styles.dosColumnas : ""}`}>
          {options.map((option) => (
            <SelectableOption
              key={option.value}
              kind="radio"
              name={name}
              value={option.value}
              label={option.label}
              checked={props.value === option.value}
              onSelect={props.onChange}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  const { value, maxSelections, exclusiveValues, onChange } = props;
  const full = maxSelections !== undefined && value.length >= maxSelections;
  return (
    <fieldset className={styles.grupo} aria-describedby={`${help ? helpId : ""} ${statusId}`.trim()}>
      <legend className={styles.leyenda}>{legend}</legend>
      {help ? <p id={helpId} className={styles.ayuda}>{help}</p> : null}
      <p id={statusId} className={styles.seleccion} aria-live="polite">
        {selectionStatus(value.length, maxSelections)}
      </p>
      <div className={`${styles.opciones} ${twoColumns ? styles.dosColumnas : ""}`}>
        {options.map((option) => {
          const checked = value.includes(option.value);
          return (
            <SelectableOption
              key={option.value}
              kind="checkbox"
              name={name}
              value={option.value}
              label={option.label}
              checked={checked}
              disabled={full && !checked}
              onSelect={(item) => onChange(toggleMultipleValue({ maxSelections, exclusiveValues }, value, item))}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

function selectionStatus(count: number, max: number | undefined): string {
  if (max === undefined) {
    if (count === 0) return "Puedes marcar varias opciones.";
    return count === 1 ? "1 opción seleccionada." : `${count} opciones seleccionadas.`;
  }
  if (count >= max) return `Elegiste ${count} de ${max}. Para cambiar una, primero desmarca otra.`;
  return `${count} de ${max} seleccionadas.`;
}
