import logoHorizontal from "../assets/logos/unir-fundacion-horizontal.svg";
import { HELP_URL } from "../config/app";
import styles from "./Header.module.css";

/** Barra superior institucional, con la misma composición de la plataforma de pertinencia. */
export function Header() {
  return (
    <header className={styles.encabezado}>
      <div className={styles.interior}>
        <img
          className={styles.logo}
          src={logoHorizontal}
          alt="UNIR – Fundación Universitaria Internacional de La Rioja"
          width={300}
          height={41}
        />
        <div className={styles.titulo}>
          <span>UNIR Colombia</span>
          <strong>Registro de egresados</strong>
        </div>
        <a className={styles.ayuda} href={HELP_URL} target="_blank" rel="noopener noreferrer">
          ¿Necesitas ayuda?
        </a>
      </div>
    </header>
  );
}
