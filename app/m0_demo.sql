-- Dos egresados FICTICIOS para probar la precarga desde M0.
-- Documentos 9990000001 y 9990000002: no corresponden a personas reales.
INSERT INTO m0_egresados (
    tipo_documento, numero_documento, nombres, apellidos, correo, telefono, pais, ciudad,
    programa_id, titulo_obtenido, fecha_inicio_estudios, fecha_titulo,
    empleado_antes, empleado_actual, cargo_actual, fecha_inicio_empleo, jornada, tipo_empleo,
    empresa, empresa_ciudad, titulacion_permitio, salario_previo, salario_actual,
    motivos_desempleo, trabajo_esperado, fecha_encuesta, es_demo
) VALUES
(
    'CC', '9990000001', 'Laura Camila', 'Méndez Ortiz', 'laura.mendez.demo@ejemplo.co', '+57 300 111 2233',
    'Colombia', 'Montería',
    4, 'Especialización en Inteligencia de Negocio', '2023-02-01', '2024-08-15',
    TRUE, TRUE, 'Analista de datos', '2022-05-02', 'completa', 'privado',
    'Comercializadora Demo S.A.S.', 'Montería', 'B', '2_3', '3_4',
    '{}', NULL, '2024-08-20', TRUE
),
(
    'CC', '9990000002', 'Andrés Felipe', 'Rojas Vélez', 'andres.rojas.demo@ejemplo.co', '+57 310 444 5566',
    'Colombia', 'Barranquilla',
    7, 'Especialización en Dirección Comercial y Ventas', '2022-08-01', '2024-02-10',
    TRUE, FALSE, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, '3_4', NULL,
    '{buscando_empleo}', 'Gerente comercial', '2024-02-15', TRUE
)
ON CONFLICT (tipo_documento, numero_documento) DO NOTHING;
