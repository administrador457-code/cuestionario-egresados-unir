import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { DOCUMENT_TYPES, PROGRAMS, graduationYears } from "../config/formOptions";
import { firstInvalidField, validateProfile, validateProfileField } from "../lib/validation";
import { lookupM0 } from "../services/m0Service";
import type { M0Prefill, ProfileErrors, ProfileField, ProfileFormValues, SelectOption } from "../types/graduate";
import buttons from "../styles/buttons.module.css";
import { FormError } from "./FormError";
import styles from "./GraduateRegistrationForm.module.css";

interface GraduateRegistrationFormProps {
  values: ProfileFormValues;
  onChange: <F extends ProfileField>(field: F, value: ProfileFormValues[F]) => void;
  onContinue: () => void;
  /** Se llama cuando el documento se encuentra en la base M0; devuelve cuántos campos completó. */
  onPrefill: (prefill: M0Prefill) => number;
}

type LookupState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "found"; prefill: M0Prefill; filled: number }
  | { kind: "notFound" }
  | { kind: "error" };

const DOCUMENT_READY = /^[A-Za-z0-9-]{6,20}$/;
const LOOKUP_DELAY_MS = 600;

type FieldElement = HTMLInputElement | HTMLSelectElement;

const YEARS = graduationYears();

export function GraduateRegistrationForm({ values, onChange, onContinue, onPrefill }: GraduateRegistrationFormProps) {
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [lookup, setLookup] = useState<LookupState>({ kind: "idle" });
  const fieldRefs = useRef<Partial<Record<ProfileField, FieldElement | null>>>({});
  const lastLookup = useRef<string>("");

  // Al escribir tipo y número de documento, se busca al egresado en M0 y se
  // precargan sus datos. Espera a que deje de escribir para no consultar en cada tecla.
  useEffect(() => {
    const number = values.documentNumber.trim();
    const key = `${values.documentType}:${number.toUpperCase()}`;
    if (!values.documentType || !DOCUMENT_READY.test(number)) {
      lastLookup.current = "";
      setLookup({ kind: "idle" });
      return;
    }
    if (key === lastLookup.current) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookup({ kind: "searching" });
      try {
        const prefill = await lookupM0(values.documentType, number, controller.signal);
        lastLookup.current = key;
        if (!prefill) {
          setLookup({ kind: "notFound" });
          return;
        }
        const filled = onPrefill(prefill);
        setErrors({});
        setLookup({ kind: "found", prefill, filled });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("No se pudo consultar M0:", error);
        setLookup({ kind: "error" });
      }
    }, LOOKUP_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [values.documentType, values.documentNumber, onPrefill]);

  function update<F extends ProfileField>(field: F, value: ProfileFormValues[F]) {
    onChange(field, value);
    // Si el campo tenía error, se revalida para que el mensaje desaparezca al corregirlo.
    if (errors[field]) {
      const next = { ...values, [field]: value } as ProfileFormValues;
      setErrors((current) => ({ ...current, [field]: validateProfileField(field, next) }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateProfile(values);
    setErrors(found);
    const first = firstInvalidField(found);
    if (first) {
      fieldRefs.current[first]?.focus();
      return;
    }
    onContinue();
  }

  const register = (field: ProfileField) => (element: FieldElement | null) => {
    fieldRefs.current[field] = element;
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form className={styles.formulario} onSubmit={handleSubmit} noValidate aria-describedby="nota-obligatorios">
      <p id="nota-obligatorios" className={styles.nota}>
        Todos los campos son obligatorios. Empieza por tu documento: si ya estás en los registros de UNIR,
        completamos el resto por ti.
      </p>

      {errorCount > 0 ? (
        <p className={styles.resumenErrores} role="alert">
          {errorCount === 1 ? "Hay 1 campo por corregir." : `Hay ${errorCount} campos por corregir.`}
        </p>
      ) : null}

      <div className={styles.rejilla}>
        <SelectField
          field="documentType" label="Tipo de documento" options={DOCUMENT_TYPES}
          value={values.documentType} error={errors.documentType} selectRef={register("documentType")}
          onValue={(v) => update("documentType", v)}
        />
        <TextField
          field="documentNumber" label="Número de documento" inputMode="text" autoComplete="off"
          value={values.documentNumber} error={errors.documentNumber} inputRef={register("documentNumber")}
          onValue={(v) => update("documentNumber", v)}
        />
        <LookupNotice state={lookup} />
        <TextField
          field="firstName" label="Nombres" autoComplete="given-name"
          value={values.firstName} error={errors.firstName} inputRef={register("firstName")}
          onValue={(v) => update("firstName", v)}
        />
        <TextField
          field="lastName" label="Apellidos" autoComplete="family-name"
          value={values.lastName} error={errors.lastName} inputRef={register("lastName")}
          onValue={(v) => update("lastName", v)}
        />
        <TextField
          field="email" label="Correo electrónico" type="email" autoComplete="email" inputMode="email" wide
          value={values.email} error={errors.email} inputRef={register("email")}
          onValue={(v) => update("email", v)}
        />
        <SelectField
          field="program" label="Programa cursado en UNIR" options={PROGRAMS} wide
          value={values.program} error={errors.program} selectRef={register("program")}
          onValue={(v) => update("program", v)}
        />
        <SelectField
          field="graduationYear" label="Año de graduación" options={YEARS}
          value={values.graduationYear} error={errors.graduationYear} selectRef={register("graduationYear")}
          onValue={(v) => update("graduationYear", v)}
        />
      </div>

      <div className={styles.consentimiento}>
        <div className={styles.casilla}>
          <input
            ref={register("privacyConsent")}
            id="campo-privacyConsent"
            type="checkbox"
            checked={values.privacyConsent}
            aria-required="true"
            aria-invalid={errors.privacyConsent ? true : undefined}
            aria-describedby={errors.privacyConsent ? "error-privacyConsent" : undefined}
            onChange={(event) => update("privacyConsent", event.target.checked)}
          />
          <label htmlFor="campo-privacyConsent">
            Autorizo el tratamiento de mis datos personales para fines académicos, institucionales y de contacto,
            conforme a la política de privacidad de UNIR.
          </label>
        </div>
        <FormError id="error-privacyConsent" message={errors.privacyConsent} />
      </div>

      <div className={styles.acciones}>
        <button type="submit" className={buttons.primario}>
          Continuar
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ aviso M0 */

function LookupNotice({ state }: { state: LookupState }) {
  let content: ReactNode = null;
  if (state.kind === "searching") {
    content = <p className={styles.avisoBuscando}>Buscando tus datos en UNIR…</p>;
  } else if (state.kind === "found") {
    const { prefill, filled } = state;
    const firstName = prefill.profile.firstName.split(" ")[0];
    const date = prefill.context.surveyDate ? formatDate(prefill.context.surveyDate) : null;
    content = (
      <div className={styles.avisoEncontrado}>
        <p className={styles.avisoTitulo}>
          ¡Hola, {firstName}! Encontramos tus datos de UNIR
          {prefill.demo ? <span className={styles.etiquetaDemo}>Datos de demostración</span> : null}
        </p>
        <p>
          {filled > 0
            ? `Completamos ${filled} ${filled === 1 ? "campo" : "campos"} con tu registro de egresado${date ? ` (encuesta del ${date})` : ""}. Revísalos y corrige lo que haya cambiado.`
            : "Tus datos ya coinciden con tu registro de egresado. Revísalos por si algo cambió."}
        </p>
        {prefill.context.currentRole ? (
          <p>
            En ese registro trabajabas como <strong>{prefill.context.currentRole}</strong>
            {prefill.context.company ? ` en ${prefill.context.company.replace(/\.$/, "")}` : ""}.
          </p>
        ) : null}
      </div>
    );
  } else if (state.kind === "notFound") {
    content = (
      <p className={styles.avisoNeutro}>No encontramos registros con ese documento. Completa tus datos a continuación.</p>
    );
  } else if (state.kind === "error") {
    content = (
      <p className={styles.avisoNeutro}>
        No pudimos consultar tus datos de UNIR en este momento. Puedes completarlos a mano.
      </p>
    );
  }
  return (
    <div className={styles.aviso} role="status" aria-live="polite">
      {content}
    </div>
  );
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/* ------------------------------------------------------------------ campos */

interface FieldShellProps {
  field: ProfileField;
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
}

function FieldShell({ field, label, error, hint, wide, children }: FieldShellProps) {
  const describedBy = [hint ? `ayuda-${field}` : null, error ? `error-${field}` : null].filter(Boolean).join(" ");
  return (
    <div className={`${styles.campo} ${wide ? styles.ancho : ""}`}>
      <label className={styles.etiqueta} htmlFor={`campo-${field}`}>
        {label}
      </label>
      {children(describedBy || undefined)}
      {hint ? (
        <p id={`ayuda-${field}`} className={styles.pista}>
          {hint}
        </p>
      ) : null}
      <FormError id={`error-${field}`} message={error} />
    </div>
  );
}

interface TextFieldProps {
  field: ProfileField;
  label: string;
  wide?: boolean;
  value: string;
  error?: string;
  hint?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  inputRef: (element: HTMLInputElement | null) => void;
  onValue: (value: string) => void;
}

function TextField({ field, label, wide, value, error, hint, type = "text", autoComplete, inputMode, inputRef, onValue }: TextFieldProps) {
  return (
    <FieldShell field={field} label={label} error={error} hint={hint} wide={wide}>
      {(describedBy) => (
        <input
          ref={inputRef}
          id={`campo-${field}`}
          className={styles.control}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={120}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onValue(event.target.value)}
        />
      )}
    </FieldShell>
  );
}

interface SelectFieldProps {
  field: ProfileField;
  label: string;
  value: string;
  options: SelectOption[];
  error?: string;
  wide?: boolean;
  autoComplete?: string;
  selectRef: (element: HTMLSelectElement | null) => void;
  onValue: (value: string) => void;
}

function SelectField({ field, label, value, options, error, wide, autoComplete, selectRef, onValue }: SelectFieldProps) {
  return (
    <FieldShell field={field} label={label} error={error} wide={wide}>
      {(describedBy) => (
        <select
          ref={selectRef}
          id={`campo-${field}`}
          className={`${styles.control} ${styles.lista}`}
          value={value}
          autoComplete={autoComplete}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onValue(event.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
