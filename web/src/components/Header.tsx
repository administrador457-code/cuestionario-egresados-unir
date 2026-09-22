import { HELP_URL } from "../config/app";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.encabezado}>
      <div className={styles.marca}>
        <span className={styles.sigla} aria-hidden="true">
          UNIR
        </span>
        {/* En celular el nombre se oculta a la vista, pero lo siguen leyendo los lectores de pantalla */}
        <span className={styles.nombre}>Universidad Internacional de La Rioja</span>
      </div>
      <a className={styles.ayuda} href={HELP_URL} target="_blank" rel="noopener noreferrer">
        ¿Necesitas ayuda?
      </a>
    </header>
  );
}
