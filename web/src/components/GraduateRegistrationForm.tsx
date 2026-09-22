import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { COUNTRIES, DOCUMENT_TYPES, PROGRAMS, graduationYears } from "../config/formOptions";
import { firstInvalidField, validateProfile, validateProfileField } from "../lib/validation";
import type { ProfileErrors, ProfileField, ProfileFormValues, SelectOption } from "../types/graduate";
import buttons from "../styles/buttons.module.css";
import { FormError } from "./FormError";
import styles from "./GraduateRegistrationForm.module.css";

interface GraduateRegistrationFormProps {
  values: ProfileFormValues;
  onChange: <F extends ProfileField>(field: F, value: ProfileFormValues[F]) => void;
  onContinue: () => void;
}

type FieldElement = HTMLInputElement | HTMLSelectElement;

const YEARS = graduationYears();

export function GraduateRegistrationForm({ values, onChange, onContinue }: GraduateRegistrationFormProps) {
  const [errors, setErrors] = useState<ProfileErrors>({});
  const fieldRefs = useRef<Partial<Record<ProfileField, FieldElement | null>>>({});

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
        Todos los campos son obligatorios.
      </p>

      {errorCount > 0 ? (
        <p className={styles.resumenErrores} role="alert">
          {errorCount === 1 ? "Hay 1 campo por corregir." : `Hay ${errorCount} campos por corregir.`}
        </p>
      ) : null}

      <div className={styles.rejilla}>
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
        <TextField
          field="email" label="Correo electrónico" type="email" autoComplete="email" inputMode="email"
          value={values.email} error={errors.email} inputRef={register("email")}
          onValue={(v) => update("email", v)}
        />
        <TextField
          field="phone" label="Teléfono móvil" type="tel" autoComplete="tel" inputMode="tel"
          hint="Incluye el indicativo si vives fuera de Colombia."
          value={values.phone} error={errors.phone} inputRef={register("phone")}
          onValue={(v) => update("phone", v)}
        />
        <SelectField
          field="country" label="País de residencia" options={COUNTRIES} autoComplete="country-name"
          value={values.country} error={errors.country} selectRef={register("country")}
          onValue={(v) => update("country", v)}
        />
        <TextField
          field="city" label="Ciudad de residencia" autoComplete="address-level2"
          value={values.city} error={errors.city} inputRef={register("city")}
          onValue={(v) => update("city", v)}
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
  value: string;
  error?: string;
  hint?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  inputRef: (element: HTMLInputElement | null) => void;
  onValue: (value: string) => void;
}

function TextField({ field, label, value, error, hint, type = "text", autoComplete, inputMode, inputRef, onValue }: TextFieldProps) {
  return (
    <FieldShell field={field} label={label} error={error} hint={hint}>
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
