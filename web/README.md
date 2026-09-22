# Registro y caracterización de egresados UNIR (frontend)

Aplicación React + TypeScript (Vite) para que el egresado actualice sus datos y
responda 10 preguntas sobre su proyección profesional, una por pantalla.

Envía los registros al backend FastAPI de este mismo repo (ver "Conexión con
la API"). Vive en `web/` y se publica en Vercel:
https://registro-egresados-unir.vercel.app

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
    app.ts                        URL del backend y enlace de "¿Necesitas ayuda?"
  lib/
    validation.ts                 reglas de validación
    draftStorage.ts               localStorage (clave unirGraduateDraft)
  services/
    registrationService.ts        envío a la API (POST /api/registros)
  types/graduate.ts               modelo de datos
  styles/                         tokens, estilos globales y botones
```

## Conexión con la API

El envío ya es real. `submitGraduateRegistration` en
`src/services/registrationService.ts` hace `POST {API_URL}/api/registros` al
backend FastAPI de Railway. El backend guarda el registro en la tabla
`registros_egresados`, calcula las recomendaciones de programas UNIR y las
devuelve; la pantalla final las muestra.

La URL del backend está en `src/config/app.ts`. Por defecto es
`https://cuestionario-web-production.up.railway.app` y se puede cambiar sin
tocar código con la variable `VITE_API_URL` (en Vercel, o en `web/.env.local`
para desarrollo).

El backend solo acepta peticiones del navegador desde los dominios listados en
su variable `CORS_ORIGINS` (Railway, servicio `cuestionario-web`). Si publicas
el frontend en otro dominio, agrégalo ahí.

Para probar el estado de error sin cortar la red, abre la app con
`?simularError=1`: el primer envío falla y "Volver a intentar" funciona.

Si cambias o agregas un `value` en `config/surveyQuestions.ts`, actualiza
también los catálogos de `app/registro.py` en el backend; si no, el backend
rechazará el registro con error 422.

La lista de programas está fija en `config/formOptions.ts` con los ids del
catálogo sincronizado. Si el catálogo cambia, actualízala.
