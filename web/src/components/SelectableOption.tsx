import styles from "./SelectableOption.module.css";

interface SelectableOptionProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onSelect: (value: string) => void;
}

/**
 * Tarjeta seleccionable. Por dentro es un radio button nativo, así que
 * funciona con teclado (Tab para entrar al grupo, flechas para moverse,
 * espacio para marcar) y con lectores de pantalla sin código adicional.
 */
export function SelectableOption({ name, value, label, checked, onSelect }: SelectableOptionProps) {
  const id = `${name}-${value}`;
  return (
    <div className={styles.opcion}>
      <input
        className={styles.radio}
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
      />
      <label className={styles.tarjeta} htmlFor={id}>
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
