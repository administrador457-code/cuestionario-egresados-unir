import styles from "./Toast.module.css";

interface ToastProps {
  message: string | null;
}

/**
 * Notificación discreta. La región existe siempre (aunque esté vacía) para
 * que los lectores de pantalla anuncien cada mensaje nuevo.
 */
export function Toast({ message }: ToastProps) {
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {message ? (
        <div className={styles.toast}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
