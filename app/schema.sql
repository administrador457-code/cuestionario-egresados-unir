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
    -- las 10 respuestas
    situacion_laboral           TEXT NOT NULL,
    cargo_aspirado              TEXT NOT NULL,
    tipo_formacion              TEXT NOT NULL,
    area_desempeno              TEXT NOT NULL,
    sector_economico            TEXT NOT NULL,
    anios_experiencia           TEXT NOT NULL,
    competencia_prioritaria     TEXT NOT NULL,
    modalidad_preferida         TEXT NOT NULL,
    barrera_principal           TEXT NOT NULL,
    servicio_preferido          TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_registros_area ON registros_egresados (area_desempeno);
CREATE INDEX IF NOT EXISTS idx_registros_email ON registros_egresados (email);
