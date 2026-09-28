-- Esquema de la base de datos PROPIA del cuestionario de egresados.
-- Se aplica sobre DATABASE_URL (nunca sobre la base de la plataforma de
-- pertinencia ni sobre la de la app de desarrollo). Es idempotente.

-- Copia de solo lectura del catalogo de programas UNIR. La llena
-- scripts/sincronizar_programas.py leyendo la tabla `especializaciones`.
CREATE TABLE IF NOT EXISTS programas_unir (
    id              INTEGER PRIMARY KEY,          -- especializaciones.id en el origen
    nombre          TEXT NOT NULL,
    descripcion     TEXT,
    facultad        TEXT,
    nivel           TEXT,
    modalidad       TEXT,
    rol             TEXT,
    campo_laboral   TEXT,
    source_url      TEXT,
    skills          TEXT[] NOT NULL DEFAULT '{}',  -- skills + competencias + herramientas
    dominios        TEXT[] NOT NULL DEFAULT '{}',
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    sincronizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS egresados (
    id                        BIGSERIAL PRIMARY KEY,
    token                     UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),  -- id publico para la URL
    nombre                    TEXT NOT NULL,
    email                     TEXT NOT NULL UNIQUE,
    acepta_tratamiento_datos  BOOLEAN NOT NULL,
    aceptado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_en                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una fila por egresado con las 10 respuestas. Si vuelve a responder, se
-- actualiza (y queda la version del cuestionario con la que respondio).
CREATE TABLE IF NOT EXISTS perfil_egresado (
    egresado_id             BIGINT PRIMARY KEY REFERENCES egresados(id) ON DELETE CASCADE,
    version_cuestionario    INTEGER NOT NULL,
    situacion_laboral       TEXT NOT NULL,
    nivel_formacion         TEXT NOT NULL,
    programa_egreso_id      INTEGER,               -- NULL si su programa no esta en la lista
    cargo_aspirado          TEXT NOT NULL,
    areas_interes           TEXT[] NOT NULL,
    sectores_interes        TEXT[] NOT NULL,
    tipo_formacion          TEXT NOT NULL,
    habilidades_fortalecer  TEXT[] NOT NULL,
    horizonte_meta          TEXT NOT NULL,
    horas_semanales         TEXT NOT NULL,
    respondido_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recomendaciones (
    id               BIGSERIAL PRIMARY KEY,
    egresado_id      BIGINT NOT NULL REFERENCES egresados(id) ON DELETE CASCADE,
    posicion         INTEGER NOT NULL,
    programa_id      INTEGER NOT NULL,
    programa_nombre  TEXT NOT NULL,
    puntaje          NUMERIC(5, 1) NOT NULL,
    desglose         JSONB NOT NULL DEFAULT '{}'::jsonb,
    razones          JSONB NOT NULL DEFAULT '[]'::jsonb,
    generado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recomendaciones_egresado ON recomendaciones (egresado_id, posicion);
CREATE INDEX IF NOT EXISTS idx_perfil_areas ON perfil_egresado USING GIN (areas_interes);
CREATE INDEX IF NOT EXISTS idx_perfil_tipo_formacion ON perfil_egresado (tipo_formacion);

-- ---------------------------------------------------------------------------
-- Registro y caracterizacion (frontend React de web/). Tablas separadas del
-- cuestionario anterior: ese sigue funcionando igual.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_egresados (
    id                          BIGSERIAL PRIMARY KEY,
    token                       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    version_registro            INTEGER NOT NULL,
    -- perfil
    nombres                     TEXT NOT NULL,
    apellidos                   TEXT NOT NULL,
    tipo_documento              TEXT NOT NULL,
    numero_documento            TEXT NOT NULL,
    email                       TEXT NOT NULL,
    telefono                    TEXT NOT NULL,
    pais                        TEXT NOT NULL,
    ciudad                      TEXT NOT NULL,
    programa_cursado_id         INTEGER,            -- NULL si eligio "otro programa"
    anio_graduacion             INTEGER NOT NULL,
    acepta_tratamiento_datos    BOOLEAN NOT NULL,
    aceptado_en                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- las 10 respuestas (TEXT[] = selección múltiple)
    situacion_laboral           TEXT[] NOT NULL,
    cargo_aspirado              TEXT NOT NULL,
    tipos_formacion             TEXT[] NOT NULL,
    areas_desempeno             TEXT[] NOT NULL,
    sectores_economicos         TEXT[] NOT NULL,
    anios_experiencia           TEXT NOT NULL,
    competencias_prioritarias   TEXT[] NOT NULL,
    modalidades_preferidas      TEXT[] NOT NULL,
    barreras                    TEXT[] NOT NULL,
    servicios_preferidos        TEXT[] NOT NULL,
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- una persona = un documento; si vuelve a registrarse, se actualiza
    UNIQUE (tipo_documento, numero_documento)
);

CREATE TABLE IF NOT EXISTS recomendaciones_registro (
    id               BIGSERIAL PRIMARY KEY,
    registro_id      BIGINT NOT NULL REFERENCES registros_egresados(id) ON DELETE CASCADE,
    posicion         INTEGER NOT NULL,
    programa_id      INTEGER NOT NULL,
    programa_nombre  TEXT NOT NULL,
    puntaje          NUMERIC(5, 1) NOT NULL,
    desglose         JSONB NOT NULL DEFAULT '{}'::jsonb,
    razones          JSONB NOT NULL DEFAULT '[]'::jsonb,
    generado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recomendaciones_registro ON recomendaciones_registro (registro_id, posicion);
CREATE INDEX IF NOT EXISTS idx_registros_areas ON registros_egresados USING GIN (areas_desempeno);
CREATE INDEX IF NOT EXISTS idx_registros_email ON registros_egresados (email);

-- ---------------------------------------------------------------------------
-- M0: base institucional de la encuesta Momento 0 (lo que UNIR ya sabe del
-- egresado). Mientras no se conecte la base real, aquí viven registros DEMO
-- (es_demo = TRUE) que carga app/m0_demo.sql cuando M0_DEMO=true.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m0_egresados (
    tipo_documento          TEXT NOT NULL,
    numero_documento        TEXT NOT NULL,
    nombres                 TEXT NOT NULL,
    apellidos               TEXT NOT NULL,
    correo                  TEXT,
    telefono                TEXT,
    pais                    TEXT,
    ciudad                  TEXT,
    programa_id             INTEGER,              -- id del catálogo programas_unir
    titulo_obtenido         TEXT,
    fecha_inicio_estudios   DATE,
    fecha_titulo            DATE,
    empleado_antes          BOOLEAN,
    empleado_actual         BOOLEAN,
    cargo_actual            TEXT,
    fecha_inicio_empleo     DATE,
    jornada                 TEXT,                 -- completa | parcial
    tipo_empleo             TEXT,                 -- cuenta_propia | privado | publico
    empresa                 TEXT,
    empresa_ciudad          TEXT,
    titulacion_permitio     TEXT,                 -- A | B | C (pregunta de M0)
    salario_previo          TEXT,                 -- rango en SMMLV
    salario_actual          TEXT,
    motivos_desempleo       TEXT[] NOT NULL DEFAULT '{}',
    trabajo_esperado        TEXT,
    fecha_encuesta          DATE,
    es_demo                 BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (tipo_documento, numero_documento)
);

-- ---------------------------------------------------------------------------
-- Catálogo de mercado (lo recalcula scripts/sincronizar_programas.py a partir
-- de las vacantes vigentes de la plataforma de pertinencia, en solo lectura).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS habilidades (
    clave         TEXT PRIMARY KEY,          -- normalizada (app/habilidades.py)
    nombre        TEXT NOT NULL,             -- cómo se muestra
    categoria     TEXT,
    vacantes      INTEGER NOT NULL DEFAULT 0,  -- vacantes vigentes que la piden
    en_programas  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS cargos_mercado (
    clave     TEXT PRIMARY KEY,
    nombre    TEXT NOT NULL,
    vacantes  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_habilidades_vacantes ON habilidades (vacantes DESC);
CREATE INDEX IF NOT EXISTS idx_cargos_vacantes ON cargos_mercado (vacantes DESC);

-- Onboarding (4 pantallas): lo que el egresado quiere lograr ahora.
-- Lo que UNIR ya sabe de él está en M0 (m0_egresados).
CREATE TABLE IF NOT EXISTS perfiles_onboarding (
    id                     BIGSERIAL PRIMARY KEY,
    token                  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    version                INTEGER NOT NULL,
    tipo_documento         TEXT NOT NULL,
    numero_documento       TEXT NOT NULL,
    nombres                TEXT NOT NULL,
    apellidos              TEXT NOT NULL,
    email                  TEXT NOT NULL,
    programa_cursado_id    INTEGER,
    anio_graduacion        INTEGER NOT NULL,
    acepta_tratamiento_datos BOOLEAN NOT NULL,
    aceptado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
    precargado_de_m0       BOOLEAN NOT NULL DEFAULT FALSE,
    cargo_objetivo         TEXT NOT NULL,
    objetivo_profesional   TEXT NOT NULL,
    areas                  TEXT[] NOT NULL,
    sectores               TEXT[] NOT NULL,
    habilidades_actuales   TEXT[] NOT NULL,    -- claves de la tabla habilidades
    tipos_formacion        TEXT[] NOT NULL,
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tipo_documento, numero_documento)
);

CREATE TABLE IF NOT EXISTS recomendaciones_onboarding (
    id               BIGSERIAL PRIMARY KEY,
    perfil_id        BIGINT NOT NULL REFERENCES perfiles_onboarding(id) ON DELETE CASCADE,
    posicion         INTEGER NOT NULL,
    programa_id      INTEGER NOT NULL,
    programa_nombre  TEXT NOT NULL,
    puntaje          NUMERIC(5, 1) NOT NULL,
    desglose         JSONB NOT NULL DEFAULT '{}'::jsonb,
    razones          JSONB NOT NULL DEFAULT '[]'::jsonb,
    generado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recomendaciones_onboarding ON recomendaciones_onboarding (perfil_id, posicion);
CREATE INDEX IF NOT EXISTS idx_onboarding_habilidades ON perfiles_onboarding USING GIN (habilidades_actuales);
