# Cuestionario de ingreso · Egresados UNIR

Proyecto independiente. Cuando un egresado se registra, responde 10 preguntas
sobre su empleabilidad y formación. Las respuestas se guardan en una base de
datos propia y, con ellas, se le recomiendan programas UNIR con las razones de
cada sugerencia.

No modifica la app de desarrollo profesional ni la plataforma de pertinencia:

- Tiene **su propia base de datos** (`DATABASE_URL`).
- El catálogo de programas se **copia** desde la plataforma de pertinencia con
  un script que abre esa base en **modo solo lectura** y solo ejecuta `SELECT`.

## Las 10 preguntas

| # | Pregunta | Tipo |
|---|---|---|
| 1 | ¿Cuál es tu situación laboral actual? | Única |
| 2 | ¿Cuál es tu máximo nivel de formación terminado? | Única |
| 3 | ¿De qué programa de UNIR egresaste? | Lista con buscador (desde el catálogo) |
| 4 | ¿Cuál es el cargo al que aspiras? | Texto libre |
| 5 | ¿En qué áreas de desempeño te visualizas? | Múltiple (hasta 3) |
| 6 | ¿En qué sector económico te gustaría trabajar? | Múltiple (hasta 2) |
| 7 | ¿Qué tipo de formación te interesa seguir? | Única |
| 8 | ¿Qué habilidades quieres fortalecer para llegar a ese cargo? | Múltiple (hasta 5) |
| 9 | ¿En cuánto tiempo quieres alcanzar esa meta? | Única |
| 10 | ¿Cuántas horas a la semana podrías dedicar a estudiar? | Única |

Las preguntas y sus opciones están en `app/preguntas.py`. Si cambias el
`valor` de alguna opción, sube `VERSION_CUESTIONARIO`.

## Cómo se recomienda

`app/recomendador.py` calcula un puntaje de 0 a 100 por programa:

| Componente | Peso |
|---|---|
| Área de desempeño | 35 |
| Cargo aspirado y habilidades a fortalecer | 30 |
| Tipo y nivel de formación | 20 |
| Sector económico | 10 |
| Plazo y dedicación | 5 |

Reglas: se excluye el programa del que egresó; si pidió especialización o
maestría y el catálogo tiene de ese tipo, solo se consideran esos; y un
programa sin afinidad real (área + cargo/habilidades + sector < 15) no se
recomienda. Cada recomendación guarda sus razones en texto.

## Estructura

```
app/
  main.py            API FastAPI y servidor del frontend
  preguntas.py       las 10 preguntas y catálogos
  recomendador.py    puntaje y razones
  db.py              acceso a la base propia
  schema.sql         tablas: programas_unir, egresados, perfil_egresado, recomendaciones
scripts/
  sincronizar_programas.py   copia de solo lectura del catálogo de programas
  programas_demo.json        10 programas FICTICIOS solo para pruebas locales
frontend/
  index.html, config.js
tests/
```

## API

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/health` | Estado |
| GET | `/api/preguntas` | Las 10 preguntas con opciones |
| POST | `/api/respuestas` | Guarda registro + respuestas y devuelve recomendaciones y un `token` |
| GET | `/api/egresados/{token}/recomendaciones` | Recomendaciones guardadas |

El `token` es un UUID aleatorio: las URL de resultados no exponen el id ni el
correo del egresado.

## Correrlo en local (PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt -r requirements-dev.txt

$env:DATABASE_URL = "postgresql://usuario:clave@localhost:5432/cuestionario"

# Catálogo: desde la plataforma (solo lectura) ...
$env:PROGRAMAS_DATABASE_URL = "postgresql://...base de pertinencia..."
python scripts/sincronizar_programas.py --revisar   # solo muestra lo que leería
python scripts/sincronizar_programas.py

# ... o con los programas ficticios de prueba
python scripts/sincronizar_programas.py --desde-json scripts/programas_demo.json

python -m uvicorn app.main:app --reload --port 8020
```

Abre http://127.0.0.1:8020

Pruebas: `python -m pytest -q` (con `$env:TEST_DATABASE_URL` apuntando a una
base vacía de pruebas también se prueba la API).

## Despliegue en Railway

1. **Postgres nuevo** para el cuestionario (no reutilizar ninguna base existente).
2. **Servicio web** desde este repo. `railway.json` ya define el arranque y el
   healthcheck. Variables: `DATABASE_URL` (referencia al Postgres nuevo).
3. **Servicio cron de sincronización** desde el mismo repo, con comando
   `python scripts/sincronizar_programas.py` y horario diario (p. ej. `0 6 * * *`).
   Variables: `DATABASE_URL` y `PROGRAMAS_DATABASE_URL`.

`PROGRAMAS_DATABASE_URL` va **solo** en el servicio cron, no en el web. El
script fuerza `default_transaction_read_only=on`, pero la credencial en sí
sigue teniendo los permisos que tenga en la plataforma; lo ideal a futuro es
un usuario de solo lectura creado por quien administra esa base.

El frontend lo sirve el mismo servicio web. Si algún día se publica aparte
(por ejemplo en Vercel), edita `frontend/config.js` con la URL del backend y
define `CORS_ORIGINS` en el servicio web.
