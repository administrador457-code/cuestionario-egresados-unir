import { useEffect, useRef, useState, type ReactElement, type Ref } from "react";
import {
  CAREER_GOALS,
  ECONOMIC_SECTORS,
  EDUCATION_EXCLUSIVE,
  EDUCATION_TYPES,
  MAX_AREAS,
  MAX_SECTORS,
  MAX_SKILLS,
  ONBOARDING_STEPS,
  PERFORMANCE_AREAS,
  TARGET_ROLE_MAX,
} from "../config/onboardingOptions";
import { suggestAreas } from "../services/catalogService";
import type { OnboardingAnswers } from "../types/graduate";
import { OptionGroup } from "./OptionGroup";
import { RoleCombobox } from "./RoleCombobox";
import { SkillPicker } from "./SkillPicker";
import styles from "./OnboardingStep.module.css";

interface OnboardingStepProps {
  step: number;
  answers: OnboardingAnswers;
  onChange: (patch: Partial<OnboardingAnswers>) => void;
  /** Enter en el campo de cargo avanza, igual que "Siguiente". */
  onEnter: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}

export function OnboardingStep({ step, answers, onChange, onEnter, headingRef }: OnboardingStepProps) {
  const title = ONBOARDING_STEPS[step].title;
  const heading = (
    <h2 ref={headingRef} tabIndex={-1} className={styles.titulo}>
      <span className={styles.numero}>{step + 1}.</span> {title}
    </h2>
  );

  if (step === 0) {
    return (
      <div className={styles.pantalla}>
        {heading}
        <div className={styles.pregunta}>
          <label htmlFor="campo-cargo" className={styles.enunciado}>
            ¿Cuál es el cargo o rol profesional al que aspiras?
          </label>
          <p id="ayuda-cargo" className={styles.ayuda}>
            Escríbelo con tus palabras o elige uno de los cargos que hoy aparecen en las vacantes.
          </p>
          <RoleCombobox
            value={answers.targetRole}
            maxLength={TARGET_ROLE_MAX}
            onChange={(targetRole) => onChange({ targetRole })}
            onEnter={onEnter}
          />
        </div>
        <OptionGroup
          kind="single"
          name="careerGoal"
          legend="¿Cuál es tu principal objetivo profesional?"
          options={CAREER_GOALS}
          value={answers.careerGoal}
          onChange={(careerGoal) => onChange({ careerGoal })}
        />
      </div>
    );
  }

  if (step === 1) return <WhereStep heading={heading} answers={answers} onChange={onChange} />;

  if (step === 2) {
    return (
      <div className={styles.pantalla}>
        {heading}
        <div className={styles.pregunta}>
          <p className={styles.enunciado}>¿Qué habilidades y herramientas dominas actualmente?</p>
          <p className={styles.ayuda}>
            Agrega las que usas con confianza. Las comparamos con lo que piden las vacantes de tu cargo objetivo para
            mostrarte tus fortalezas y lo que te falta.
          </p>
          <SkillPicker
            value={answers.currentSkills}
            max={MAX_SKILLS}
            onChange={(currentSkills) => onChange({ currentSkills })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pantalla}>
      {heading}
      <OptionGroup
        kind="multiple"
        name="educationTypes"
        legend="¿Qué tipo de formación te interesa?"
        help="Puedes marcar varias. Si no sabes qué te conviene, elige “No estoy seguro” y te lo sugerimos según tu objetivo."
        options={EDUCATION_TYPES}
        value={answers.educationTypes}
        exclusiveValues={EDUCATION_EXCLUSIVE}
        onChange={(educationTypes) => onChange({ educationTypes })}
      />
    </div>
  );
}

/** Pantalla 2: si aún no eligió áreas, se precargan las que sugiere su cargo. */
function WhereStep({
  heading,
  answers,
  onChange,
}: {
  heading: ReactElement;
  answers: OnboardingAnswers;
  onChange: (patch: Partial<OnboardingAnswers>) => void;
}) {
  const [suggestedFor, setSuggestedFor] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current || answers.performanceAreas.length > 0 || answers.targetRole.trim().length < 2) return;
    asked.current = true;
    const controller = new AbortController();
    suggestAreas(answers.targetRole, controller.signal)
      .then((areas) => {
        if (areas.length) {
          onChange({ performanceAreas: areas.slice(0, MAX_AREAS) });
          setSuggestedFor(answers.targetRole.trim());
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [answers.performanceAreas.length, answers.targetRole, onChange]);

  return (
    <div className={styles.pantalla}>
      {heading}
      <OptionGroup
        kind="multiple"
        name="performanceAreas"
        legend="¿En qué áreas profesionales te gustaría desarrollarte?"
        help={`Elige hasta ${MAX_AREAS}.`}
        options={PERFORMANCE_AREAS}
        value={answers.performanceAreas}
        maxSelections={MAX_AREAS}
        onChange={(performanceAreas) => onChange({ performanceAreas })}
      />
      {suggestedFor ? (
        <p className={styles.sugerencia} role="status">
          Marcamos estas áreas según el cargo “{suggestedFor}”. Ajústalas si quieres.
        </p>
      ) : null}
      <OptionGroup
        kind="multiple"
        name="economicSectors"
        legend="¿En qué sectores te gustaría trabajar?"
        help={`Elige hasta ${MAX_SECTORS}.`}
        options={ECONOMIC_SECTORS}
        value={answers.economicSectors}
        maxSelections={MAX_SECTORS}
        onChange={(economicSectors) => onChange({ economicSectors })}
      />
    </div>
  );
}
