# Registro y caracterización de egresados UNIR (frontend)

Aplicación React + TypeScript (Vite) para que el egresado actualice sus datos y
responda 10 preguntas sobre su proyección profesional, una por pantalla.

Todavía no está conectada al backend: el envío es simulado (ver "Conectar la
API"). Vive en `web/` y no modifica el backend FastAPI ni el cuestionario que
ya está en línea (`frontend/`).

## Ejecutar (PowerShell)

Requiere Node.js 20 o superior.

```powershell
cd web
npm install
npm run dev          # http://localhost:5173
```

Otros comandos:

```powershell
npm run typecheck    # solo verificación de tipos
npm run build        # verifica tipos y genera web/dist
npm run preview      # sirve la versión compilada
```

Para ver el estado de error del envío abre `http://localhost:5173/?simularError=1`:
el primer envío falla y "Volver a intentar" funciona.

## Estructura

```
src/
  App.tsx                         flujo: etapas, guardado, envío, foco
  components/
    Header.tsx                    barra superior
    ProcessSteps.tsx              etapas (lateral en escritorio, horizontal en celular)
    GraduateRegistrationForm.tsx  "Actualiza tus datos" + validación
    SurveyProgress.tsx            "Pregunta X de 10" + barra
    SurveyQuestion.tsx            una pregunta (opciones o texto)
    SelectableOption.tsx          tarjeta seleccionable (radio nativo)
    CompletionSummary.tsx         pantalla final
    Toast.tsx                     aviso discreto (aria-live)
    FormError.tsx                 error bajo un campo
  config/
    surveyQuestions.ts            las 10 preguntas y sus opciones
    formOptions.ts                tipos de documento, países, programas, años
    app.ts                        enlace de "¿Necesitas ayuda?"
  lib/
    validation.ts                 reglas de validación
    draftStorage.ts               localStorage (clave unirGraduateDraft)
  services/
    registrationService.ts        envío simulado  <-- aquí se conecta la API
  types/graduate.ts               modelo de datos
  styles/                         tokens, estilos globales y botones
```

## Conectar la API

Solo hay que cambiar `submitGraduateRegistration` en
`src/services/registrationService.ts`. El comentario del archivo trae un
ejemplo con `fetch`. Los componentes no se tocan: solo esperan que la función
resuelva o lance un error.

Recibe un `GraduateRegistration` (`profile`, `survey`, `completedAt`,
`status`). En `survey` se guardan valores estables (por ejemplo
`comercial_marketing`), no los textos que ve el egresado.

El backend actual (`POST /api/respuestas`) espera el modelo anterior del
cuestionario. Antes de conectar hay que agregar en FastAPI un endpoint para
este modelo (p. ej. `POST /api/egresados`) y su tabla. Las respuestas de área
(`preferredPerformanceArea`), sector (`preferredEconomicSector`) y competencia
(`prioritySkill`) ya usan los mismos valores que el recomendador, así que se
pueden cruzar con el catálogo de programas sin traducción.

La lista de programas está fija en `config/formOptions.ts` con los ids del
catálogo. Cuando haya API, puede cargarse desde el backend.
