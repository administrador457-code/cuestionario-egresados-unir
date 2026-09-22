import styles from "./FormError.module.css";

interface FormErrorProps {
  id: string;
  message?: string;
}

/** Mensaje de error de un campo. Se vincula al campo con aria-describedby={id}. */
export function FormError({ id, message }: FormErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className={styles.error}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 4.5v4.2M8 10.9v.1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span>{message}</span>
    </p>
  );
}
