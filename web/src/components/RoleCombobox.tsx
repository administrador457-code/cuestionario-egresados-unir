import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { searchRoles } from "../services/catalogService";
import type { RoleSuggestion } from "../types/graduate";
import styles from "./Combobox.module.css";

interface RoleComboboxProps {
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  onEnter: () => void;
}

/**
 * Campo de cargo con sugerencias tomadas de las vacantes vigentes (patrón
 * combobox de ARIA). Se puede escribir un cargo que no esté en la lista.
 */
export function RoleCombobox({ value, maxLength, onChange, onEnter }: RoleComboboxProps) {
  const id = useId();
  const listId = `${id}-lista`;
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchRoles(query, controller.signal);
        setSuggestions(found);
        setOpen(found.length > 0);
        setActive(-1);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function choose(suggestion: RoleSuggestion) {
    skipNextSearch.current = true;
    onChange(suggestion.name.slice(0, maxLength));
    setOpen(false);
    setActive(-1);
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && active >= 0) choose(suggestions[active]);
      else onEnter();
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className={styles.contenedor}>
      <input
        id="campo-cargo"
        className={styles.campo}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby="ayuda-cargo contador-cargo"
        autoComplete="off"
        maxLength={maxLength}
        placeholder="Ej. Líder de analítica, director de proyectos, especialista en seguridad…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKey}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length && setOpen(true)}
      />
      <ul id={listId} role="listbox" aria-label="Cargos sugeridos" className={styles.lista} hidden={!open}>
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.name}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            className={`${styles.opcion} ${index === active ? styles.activa : ""}`}
            onMouseDown={(event) => {
              event.preventDefault();
              choose(suggestion);
            }}
          >
            <span>{suggestion.name}</span>
            <span className={styles.demanda}>
              {suggestion.demand} {suggestion.demand === 1 ? "vacante" : "vacantes"}
            </span>
          </li>
        ))}
      </ul>
      <p id="contador-cargo" className={styles.contador}>
        {value.length} de {maxLength} caracteres
      </p>
    </div>
  );
}
