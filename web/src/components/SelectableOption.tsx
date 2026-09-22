import styles from "./SelectableOption.module.css";

interface SelectableOptionProps {
  /** "radio": una sola opción. "checkbox": selección múltiple. */
  kind: "radio" | "checkbox";
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: (value: string) => void;
}

/**
 * Tarjeta seleccionable. Por dentro es un radio o una casilla nativos, así
 * que funciona con teclado (Tab y espacio; flechas en los radios) y con
 * lectores de pantalla sin código adicional.
 */
export function SelectableOption({ kind, name, value, label, checked, disabled, onSelect }: SelectableOptionProps) {
  const id = `${name}-${value}`;
  return (
    <div className={styles.opcion}>
      <input
        className={styles.control}
        type={kind}
        id={id}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
      />
      <label className={`${styles.tarjeta} ${kind === "checkbox" ? styles.multiple : ""}`} htmlFor={id}>
        <span className={styles.indicador} aria-hidden="true">
          {checked ? (
            <svg viewBox="0 0 16 16" width="12" height="12" focusable="false">
              <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
        <span>{label}</span>
      </label>
    </div>
  );
}
