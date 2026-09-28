import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { searchSkills } from "../services/catalogService";
import type { SkillRef, SkillSuggestion } from "../types/graduate";
import styles from "./Combobox.module.css";

interface SkillPickerProps {
  value: SkillRef[];
  max: number;
  onChange: (value: SkillRef[]) => void;
}

type CatalogState = "loading" | "ready" | "empty" | "error";

/**
 * Habilidades y herramientas que domina el egresado, elegidas del catálogo
 * normalizado (el mismo de vacantes y programas). Sin escribir, muestra las
 * más pedidas por las vacantes vigentes para agregarlas con un toque.
 */
export function SkillPicker({ value, max, onChange }: SkillPickerProps) {
  const id = useId();
  const listId = `${id}-lista`;
  const [query, setQuery] = useState("");
  const [popular, setPopular] = useState<SkillSuggestion[]>([]);
  const [results, setResults] = useState<SkillSuggestion[]>([]);
  const [catalog, setCatalog] = useState<CatalogState>("loading");
  const [active, setActive] = useState(-1);
  const selectedKeys = new Set(value.map((skill) => skill.key));
  const full = value.length >= max;

  useEffect(() => {
    const controller = new AbortController();
    searchSkills("", controller.signal, 14)
      .then((found) => {
        setPopular(found);
        setCatalog(found.length ? "ready" : "empty");
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalog("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const text = query.trim();
    if (!text) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setResults(await searchSkills(text, controller.signal, 8));
        setActive(-1);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visibleResults = results.filter((skill) => !selectedKeys.has(skill.key));
  const open = query.trim().length > 0;

  function add(skill: SkillRef) {
    if (full || selectedKeys.has(skill.key)) return;
    onChange([...value, { key: skill.key, name: skill.name }]);
    setQuery("");
    setActive(-1);
  }

  function remove(key: string) {
    onChange(value.filter((skill) => skill.key !== key));
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && visibleResults.length) {
      event.preventDefault();
      setActive((i) => (i + 1) % visibleResults.length);
    } else if (event.key === "ArrowUp" && visibleResults.length) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? visibleResults.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = active >= 0 ? visibleResults[active] : visibleResults[0];
      if (chosen) add(chosen);
    } else if (event.key === "Escape") {
      setQuery("");
    } else if (event.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1].key);
    }
  }

  return (
    <div className={styles.selector}>
      {value.length > 0 ? (
        <ul className={styles.elegidas} aria-label="Habilidades que agregaste">
          {value.map((skill) => (
            <li key={skill.key} className={styles.chip}>
              <span>{skill.name}</span>
              <button type="button" className={styles.quitar} onClick={() => remove(skill.key)} aria-label={`Quitar ${skill.name}`}>
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className={styles.estado} aria-live="polite">
        {full
          ? `Agregaste ${value.length} de ${max}. Quita una para agregar otra.`
          : `${value.length} de ${max} agregadas.`}
      </p>

      <div className={styles.contenedor}>
        <label htmlFor={`${id}-buscar`} className={styles.etiqueta}>
          Buscar habilidad o herramienta
        </label>
        <input
          id={`${id}-buscar`}
          className={styles.campo}
          type="text"
          role="combobox"
          aria-expanded={open && visibleResults.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={full ? "Llegaste al máximo" : "Ej. Power BI, SQL, negociación, pedagogía…"}
          disabled={full || catalog === "error"}
          value={query}
          maxLength={60}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKey}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label="Habilidades sugeridas"
          className={styles.lista}
          hidden={!open || visibleResults.length === 0}
        >
          {visibleResults.map((skill, index) => (
            <li
              key={skill.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={`${styles.opcion} ${index === active ? styles.activa : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                add(skill);
              }}
            >
              <span>{skill.name}</span>
              {skill.demand > 0 ? (
                <span className={styles.demanda}>
                  {skill.demand} {skill.demand === 1 ? "vacante" : "vacantes"}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {open && results.length > 0 && visibleResults.length === 0 ? (
          <p className={styles.nota}>Ya agregaste las habilidades que coinciden.</p>
        ) : null}
        {open && results.length === 0 ? (
          <p className={styles.nota}>No encontramos esa habilidad en el catálogo. Prueba con otro nombre.</p>
        ) : null}
      </div>

      {catalog === "error" ? (
        <p className={styles.nota} role="alert">
          No pudimos cargar el catálogo de habilidades. Revisa tu conexión y recarga la página.
        </p>
      ) : null}
      {catalog === "empty" ? (
        <p className={styles.nota}>El catálogo de habilidades todavía se está preparando. Inténtalo más tarde.</p>
      ) : null}

      {catalog === "ready" ? (
        <div className={styles.populares}>
          <p className={styles.etiqueta} id={`${id}-populares`}>
            Las más pedidas en las vacantes vigentes
          </p>
          <ul className={styles.sugeridas} aria-labelledby={`${id}-populares`}>
            {popular
              .filter((skill) => !selectedKeys.has(skill.key))
              .map((skill) => (
                <li key={skill.key}>
                  <button type="button" className={styles.sugerida} disabled={full} onClick={() => add(skill)}>
                    <span aria-hidden="true">+</span> {skill.name}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
