-- ============================================================
-- EcuaRutas - Esquema inicial
-- PostgreSQL + PostGIS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- USUARIOS Y COOPERATIVAS
-- ============================================================

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL
);

CREATE TABLE cooperativas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    ruc VARCHAR(20) UNIQUE,
    descripcion TEXT,
    telefono VARCHAR(30),
    correo VARCHAR(150),
    direccion TEXT,
    logo_url VARCHAR(500),
    color_primario VARCHAR(20),
    color_secundario VARCHAR(20),
    redes_sociales JSONB NOT NULL DEFAULT '{}'::jsonb,
    informacion_soporte TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_cooperativas_nombre ON cooperativas (LOWER(nombre));

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    rol_id BIGINT NOT NULL REFERENCES roles(id),
    cooperativa_id BIGINT REFERENCES cooperativas(id),
    cedula VARCHAR(20),
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    password_hash TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_usuarios_correo ON usuarios (LOWER(correo));
CREATE UNIQUE INDEX uq_usuarios_cedula ON usuarios (cedula) WHERE cedula IS NOT NULL;

-- ============================================================
-- FLOTA
-- ============================================================

CREATE TABLE grupos_buses (
    id BIGSERIAL PRIMARY KEY,
    cooperativa_id BIGINT NOT NULL REFERENCES cooperativas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (cooperativa_id, nombre)
);

CREATE TABLE tipos_asiento (
    id BIGSERIAL PRIMARY KEY,
    cooperativa_id BIGINT REFERENCES cooperativas(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    recargo_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (recargo_porcentaje >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE plantillas_bus (
    id BIGSERIAL PRIMARY KEY,
    cooperativa_id BIGINT REFERENCES cooperativas(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    pisos SMALLINT NOT NULL DEFAULT 1 CHECK (pisos BETWEEN 1 AND 2),
    tiene_banio BOOLEAN NOT NULL DEFAULT FALSE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE plantilla_asientos (
    id BIGSERIAL PRIMARY KEY,
    plantilla_id BIGINT NOT NULL REFERENCES plantillas_bus(id) ON DELETE CASCADE,
    tipo_asiento_id BIGINT NOT NULL REFERENCES tipos_asiento(id),
    numero VARCHAR(10) NOT NULL,
    piso SMALLINT NOT NULL DEFAULT 1,
    fila SMALLINT,
    columna SMALLINT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (plantilla_id, numero)
);

CREATE TABLE buses (
    id BIGSERIAL PRIMARY KEY,
    cooperativa_id BIGINT NOT NULL REFERENCES cooperativas(id),
    grupo_bus_id BIGINT REFERENCES grupos_buses(id),
    plantilla_id BIGINT REFERENCES plantillas_bus(id),
    numero_interno VARCHAR(30) NOT NULL,
    placa VARCHAR(20) NOT NULL UNIQUE,
    color VARCHAR(50),
    marca_chasis VARCHAR(100),
    marca_carroceria VARCHAR(100),
    modelo VARCHAR(100),
    anio SMALLINT,
    pisos SMALLINT NOT NULL DEFAULT 1 CHECK (pisos BETWEEN 1 AND 2),
    capacidad SMALLINT NOT NULL CHECK (capacidad > 0),
    tiene_banio BOOLEAN NOT NULL DEFAULT FALSE,
    foto_url VARCHAR(500),
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'MANTENIMIENTO', 'INACTIVO')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cooperativa_id, numero_interno)
);

CREATE TABLE asientos_bus (
    id BIGSERIAL PRIMARY KEY,
    bus_id BIGINT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    tipo_asiento_id BIGINT NOT NULL REFERENCES tipos_asiento(id),
    numero VARCHAR(10) NOT NULL,
    piso SMALLINT NOT NULL DEFAULT 1,
    fila SMALLINT,
    columna SMALLINT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (bus_id, numero)
);

-- ============================================================
-- LUGARES, RUTAS Y FRECUENCIAS
-- ============================================================

CREATE TABLE lugares (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    provincia VARCHAR(100),
    canton VARCHAR(100),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('CIUDAD', 'TERMINAL', 'PARADA')),
    ubicacion GEOGRAPHY(POINT, 4326),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_lugares_ubicacion ON lugares USING GIST (ubicacion);

CREATE TABLE rutas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    origen_lugar_id BIGINT NOT NULL REFERENCES lugares(id),
    destino_lugar_id BIGINT NOT NULL REFERENCES lugares(id),
    tipo_viaje VARCHAR(30) NOT NULL CHECK (tipo_viaje IN ('DIRECTO', 'CON_PARADAS')),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (origen_lugar_id <> destino_lugar_id)
);

CREATE TABLE ruta_paradas (
    id BIGSERIAL PRIMARY KEY,
    ruta_id BIGINT NOT NULL REFERENCES rutas(id) ON DELETE CASCADE,
    lugar_id BIGINT NOT NULL REFERENCES lugares(id),
    orden INTEGER NOT NULL CHECK (orden >= 0),
    km_acumulado NUMERIC(10,2),
    minutos_acumulados INTEGER,
    permite_ascenso BOOLEAN NOT NULL DEFAULT TRUE,
    permite_descenso BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (ruta_id, orden),
    UNIQUE (ruta_id, lugar_id)
);

CREATE TABLE resoluciones_ant (
    id BIGSERIAL PRIMARY KEY,
    cooperativa_id BIGINT NOT NULL REFERENCES cooperativas(id),
    numero_resolucion VARCHAR(100) NOT NULL,
    fecha_resolucion DATE,
    archivo_url VARCHAR(500),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (cooperativa_id, numero_resolucion)
);

CREATE TABLE frecuencias (
    id BIGSERIAL PRIMARY KEY,
    cooperativa_id BIGINT NOT NULL REFERENCES cooperativas(id),
    ruta_id BIGINT NOT NULL REFERENCES rutas(id),
    resolucion_ant_id BIGINT NOT NULL REFERENCES resoluciones_ant(id),
    codigo VARCHAR(50),
    hora_salida TIME NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (cooperativa_id, ruta_id, hora_salida)
);

CREATE TABLE tarifas_frecuencia (
    id BIGSERIAL PRIMARY KEY,
    frecuencia_id BIGINT NOT NULL REFERENCES frecuencias(id) ON DELETE CASCADE,
    origen_ruta_parada_id BIGINT NOT NULL REFERENCES ruta_paradas(id),
    destino_ruta_parada_id BIGINT NOT NULL REFERENCES ruta_paradas(id),
    precio_base NUMERIC(10,2) NOT NULL CHECK (precio_base >= 0),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (origen_ruta_parada_id <> destino_ruta_parada_id),
    UNIQUE (frecuencia_id, origen_ruta_parada_id, destino_ruta_parada_id)
);

-- ============================================================
-- HOJA DE RUTA Y VIAJES
-- ============================================================

CREATE TABLE hojas_ruta (
    id BIGSERIAL PRIMARY KEY,
    cooperativa_id BIGINT NOT NULL REFERENCES cooperativas(id),
    grupo_bus_id BIGINT NOT NULL REFERENCES grupos_buses(id),
    fecha DATE NOT NULL,
    modo_generacion VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
        CHECK (modo_generacion IN ('MANUAL', 'AUTOMATICA')),
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
        CHECK (estado IN ('BORRADOR', 'PUBLICADA', 'CERRADA')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (grupo_bus_id, fecha)
);

CREATE TABLE hoja_ruta_detalles (
    id BIGSERIAL PRIMARY KEY,
    hoja_ruta_id BIGINT NOT NULL REFERENCES hojas_ruta(id) ON DELETE CASCADE,
    bus_id BIGINT NOT NULL REFERENCES buses(id),
    frecuencia_id BIGINT REFERENCES frecuencias(id),
    tipo_asignacion VARCHAR(20) NOT NULL CHECK (tipo_asignacion IN ('SERVICIO', 'PARADA')),
    orden_dia INTEGER NOT NULL DEFAULT 1,
    hora_programada TIME,
    observacion TEXT,
    CHECK (
        (tipo_asignacion = 'SERVICIO' AND frecuencia_id IS NOT NULL)
        OR
        (tipo_asignacion = 'PARADA' AND frecuencia_id IS NULL)
    ),
    UNIQUE (hoja_ruta_id, bus_id, orden_dia)
);

CREATE TABLE viajes (
    id BIGSERIAL PRIMARY KEY,
    hoja_ruta_detalle_id BIGINT REFERENCES hoja_ruta_detalles(id),
    bus_id BIGINT NOT NULL REFERENCES buses(id),
    frecuencia_id BIGINT NOT NULL REFERENCES frecuencias(id),
    usuario_bus_id BIGINT REFERENCES usuarios(id),
    salida_programada TIMESTAMPTZ NOT NULL,
    iniciado_en TIMESTAMPTZ,
    finalizado_en TIMESTAMPTZ,
    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADO'
        CHECK (estado IN ('PROGRAMADO', 'ABIERTO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO')),
    UNIQUE (hoja_ruta_detalle_id)
);

CREATE INDEX idx_viajes_salida ON viajes (salida_programada);

-- ============================================================
-- PASAJEROS, VENTAS Y ASIENTOS PLANIFICADOS
-- ============================================================

CREATE TABLE pasajeros (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT UNIQUE REFERENCES usuarios(id),
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'CEDULA'
        CHECK (tipo_documento IN ('CEDULA', 'PASAPORTE', 'OTRO')),
    documento VARCHAR(30) NOT NULL UNIQUE,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    correo VARCHAR(150),
    telefono VARCHAR(30),
    fecha_nacimiento DATE,
    discapacidad BOOLEAN NOT NULL DEFAULT FALSE,
    carnet_conadis VARCHAR(50),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ventas (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    viaje_id BIGINT NOT NULL REFERENCES viajes(id),
    usuario_cliente_id BIGINT REFERENCES usuarios(id),
    usuario_vendedor_id BIGINT REFERENCES usuarios(id),
    canal VARCHAR(20) NOT NULL CHECK (canal IN ('APP', 'OFICINA', 'BUS')),
    estado VARCHAR(30) NOT NULL DEFAULT 'RESERVADA'
        CHECK (estado IN (
            'RESERVADA', 'PENDIENTE_PAGO', 'EN_VALIDACION',
            'PAGADA', 'RECHAZADA', 'CANCELADA', 'EXPIRADA'
        )),
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    descuento_total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (descuento_total >= 0),
    total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    expira_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE venta_asientos (
    id BIGSERIAL PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    viaje_id BIGINT NOT NULL REFERENCES viajes(id),
    pasajero_id BIGINT NOT NULL REFERENCES pasajeros(id),
    asiento_bus_id BIGINT NOT NULL REFERENCES asientos_bus(id),
    origen_ruta_parada_id BIGINT NOT NULL REFERENCES ruta_paradas(id),
    destino_ruta_parada_id BIGINT NOT NULL REFERENCES ruta_paradas(id),
    orden_origen INTEGER NOT NULL,
    orden_destino INTEGER NOT NULL,
    tramo_planificado INT4RANGE GENERATED ALWAYS AS (
        int4range(orden_origen, orden_destino, '[)')
    ) STORED,
    precio_base NUMERIC(10,2) NOT NULL DEFAULT 0,
    recargo_asiento NUMERIC(10,2) NOT NULL DEFAULT 0,
    tipo_descuento VARCHAR(30) NOT NULL DEFAULT 'NINGUNO'
        CHECK (tipo_descuento IN ('NINGUNO', 'MENOR_EDAD', 'TERCERA_EDAD', 'DISCAPACIDAD')),
    porcentaje_descuento NUMERIC(5,2) NOT NULL DEFAULT 0,
    valor_descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
    precio_final NUMERIC(10,2) NOT NULL CHECK (precio_final >= 0),
    estado_asiento VARCHAR(30) NOT NULL DEFAULT 'RETENIDO'
        CHECK (estado_asiento IN ('RETENIDO', 'CONFIRMADO', 'UTILIZADO', 'CANCELADO', 'EXPIRADO')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (orden_destino > orden_origen)
);

ALTER TABLE venta_asientos
ADD CONSTRAINT ex_asiento_tramo_planificado
EXCLUDE USING GIST (
    viaje_id WITH =,
    asiento_bus_id WITH =,
    tramo_planificado WITH &&
)
WHERE (estado_asiento IN ('RETENIDO', 'CONFIRMADO', 'UTILIZADO'));

-- ============================================================
-- OCUPACIÓN REAL DEL ASIENTO DURANTE EL VIAJE
-- ============================================================

CREATE TABLE ocupaciones_asiento (
    id BIGSERIAL PRIMARY KEY,
    venta_asiento_id BIGINT NOT NULL REFERENCES venta_asientos(id),
    viaje_id BIGINT NOT NULL REFERENCES viajes(id),
    asiento_bus_id BIGINT NOT NULL REFERENCES asientos_bus(id),
    pasajero_id BIGINT NOT NULL REFERENCES pasajeros(id),
    parada_abordaje_id BIGINT NOT NULL REFERENCES ruta_paradas(id),
    parada_liberacion_id BIGINT REFERENCES ruta_paradas(id),
    usuario_bus_abordaje_id BIGINT NOT NULL REFERENCES usuarios(id),
    usuario_bus_liberacion_id BIGINT REFERENCES usuarios(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'ABORDADO'
        CHECK (estado IN ('ABORDADO', 'LIBERADO', 'NO_PRESENTADO', 'CANCELADO')),
    abordado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    liberado_en TIMESTAMPTZ,
    observacion TEXT
);

CREATE UNIQUE INDEX uq_ocupacion_activa_asiento
ON ocupaciones_asiento (viaje_id, asiento_bus_id)
WHERE estado = 'ABORDADO';

-- Completa y valida automáticamente el tramo planificado.
CREATE OR REPLACE FUNCTION preparar_venta_asiento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_viaje_venta BIGINT;
    v_bus_viaje BIGINT;
    v_bus_asiento BIGINT;
    v_ruta_viaje BIGINT;
    v_ruta_origen BIGINT;
    v_ruta_destino BIGINT;
    v_orden_origen INTEGER;
    v_orden_destino INTEGER;
BEGIN
    SELECT viaje_id INTO v_viaje_venta
    FROM ventas WHERE id = NEW.venta_id;

    IF v_viaje_venta IS NULL OR v_viaje_venta <> NEW.viaje_id THEN
        RAISE EXCEPTION 'El viaje del detalle no coincide con la venta';
    END IF;

    SELECT v.bus_id, f.ruta_id
    INTO v_bus_viaje, v_ruta_viaje
    FROM viajes v
    JOIN frecuencias f ON f.id = v.frecuencia_id
    WHERE v.id = NEW.viaje_id;

    SELECT bus_id INTO v_bus_asiento
    FROM asientos_bus
    WHERE id = NEW.asiento_bus_id AND activo = TRUE;

    IF v_bus_asiento IS NULL OR v_bus_asiento <> v_bus_viaje THEN
        RAISE EXCEPTION 'El asiento no pertenece al bus del viaje o está inactivo';
    END IF;

    SELECT ruta_id, orden INTO v_ruta_origen, v_orden_origen
    FROM ruta_paradas WHERE id = NEW.origen_ruta_parada_id;

    SELECT ruta_id, orden INTO v_ruta_destino, v_orden_destino
    FROM ruta_paradas WHERE id = NEW.destino_ruta_parada_id;

    IF v_ruta_origen <> v_ruta_viaje OR v_ruta_destino <> v_ruta_viaje THEN
        RAISE EXCEPTION 'Origen o destino no pertenecen a la ruta del viaje';
    END IF;

    IF v_orden_destino <= v_orden_origen THEN
        RAISE EXCEPTION 'El destino debe estar después del origen';
    END IF;

    -- Durante el viaje, si el pasajero sigue abordado, el asiento no puede
    -- venderse nuevamente hasta que el personal BUS lo libere explícitamente.
    IF EXISTS (
        SELECT 1
        FROM ocupaciones_asiento oa
        WHERE oa.viaje_id = NEW.viaje_id
          AND oa.asiento_bus_id = NEW.asiento_bus_id
          AND oa.estado = 'ABORDADO'
    ) THEN
        RAISE EXCEPTION 'El asiento sigue ocupado y no ha sido liberado por el personal del bus';
    END IF;

    NEW.orden_origen := v_orden_origen;
    NEW.orden_destino := v_orden_destino;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_preparar_venta_asiento
BEFORE INSERT OR UPDATE
ON venta_asientos
FOR EACH ROW
EXECUTE FUNCTION preparar_venta_asiento();

-- Solo el usuario BUS asignado al viaje puede registrar abordaje.
CREATE OR REPLACE FUNCTION abordar_pasajero(
    p_venta_asiento_id BIGINT,
    p_usuario_bus_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_viaje_id BIGINT;
    v_asiento_id BIGINT;
    v_pasajero_id BIGINT;
    v_origen_id BIGINT;
    v_usuario_asignado BIGINT;
    v_rol VARCHAR(30);
    v_ocupacion_id BIGINT;
BEGIN
    SELECT va.viaje_id, va.asiento_bus_id, va.pasajero_id, va.origen_ruta_parada_id
    INTO v_viaje_id, v_asiento_id, v_pasajero_id, v_origen_id
    FROM venta_asientos va
    WHERE va.id = p_venta_asiento_id
      AND va.estado_asiento IN ('CONFIRMADO', 'UTILIZADO');

    IF v_viaje_id IS NULL THEN
        RAISE EXCEPTION 'Boleto/asiento no válido para abordar';
    END IF;

    SELECT usuario_bus_id INTO v_usuario_asignado
    FROM viajes WHERE id = v_viaje_id;

    SELECT r.codigo INTO v_rol
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = p_usuario_bus_id;

    IF v_rol <> 'BUS' OR v_usuario_asignado IS DISTINCT FROM p_usuario_bus_id THEN
        RAISE EXCEPTION 'Solo el personal BUS asignado al viaje puede registrar el abordaje';
    END IF;

    INSERT INTO ocupaciones_asiento (
        venta_asiento_id, viaje_id, asiento_bus_id, pasajero_id,
        parada_abordaje_id, usuario_bus_abordaje_id
    )
    VALUES (
        p_venta_asiento_id, v_viaje_id, v_asiento_id, v_pasajero_id,
        v_origen_id, p_usuario_bus_id
    )
    RETURNING id INTO v_ocupacion_id;

    UPDATE venta_asientos
    SET estado_asiento = 'UTILIZADO'
    WHERE id = p_venta_asiento_id;

    RETURN v_ocupacion_id;
END;
$$;

-- El mismo usuario BUS asignado al viaje libera el asiento cuando el pasajero baja.
CREATE OR REPLACE FUNCTION liberar_asiento(
    p_ocupacion_id BIGINT,
    p_usuario_bus_id BIGINT,
    p_parada_liberacion_id BIGINT,
    p_observacion TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_viaje_id BIGINT;
    v_usuario_asignado BIGINT;
    v_rol VARCHAR(30);
    v_ruta_viaje BIGINT;
    v_ruta_parada BIGINT;
BEGIN
    SELECT viaje_id INTO v_viaje_id
    FROM ocupaciones_asiento
    WHERE id = p_ocupacion_id AND estado = 'ABORDADO';

    IF v_viaje_id IS NULL THEN
        RAISE EXCEPTION 'La ocupación no existe o ya fue liberada';
    END IF;

    SELECT v.usuario_bus_id, f.ruta_id
    INTO v_usuario_asignado, v_ruta_viaje
    FROM viajes v
    JOIN frecuencias f ON f.id = v.frecuencia_id
    WHERE v.id = v_viaje_id;

    SELECT r.codigo INTO v_rol
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = p_usuario_bus_id;

    IF v_rol <> 'BUS' OR v_usuario_asignado IS DISTINCT FROM p_usuario_bus_id THEN
        RAISE EXCEPTION 'Solo el personal BUS asignado al viaje puede liberar el asiento';
    END IF;

    SELECT ruta_id INTO v_ruta_parada
    FROM ruta_paradas WHERE id = p_parada_liberacion_id;

    IF v_ruta_parada IS DISTINCT FROM v_ruta_viaje THEN
        RAISE EXCEPTION 'La parada de liberación no pertenece a la ruta del viaje';
    END IF;

    UPDATE ocupaciones_asiento
    SET estado = 'LIBERADO',
        parada_liberacion_id = p_parada_liberacion_id,
        usuario_bus_liberacion_id = p_usuario_bus_id,
        liberado_en = NOW(),
        observacion = p_observacion
    WHERE id = p_ocupacion_id;
END;
$$;

-- ============================================================
-- EXTENSIÓN DEL BOLETO / COBRO DE DIFERENCIA
-- ============================================================

CREATE TABLE extensiones_boleto (
    id BIGSERIAL PRIMARY KEY,
    venta_asiento_id BIGINT NOT NULL REFERENCES venta_asientos(id),
    destino_anterior_id BIGINT NOT NULL REFERENCES ruta_paradas(id),
    destino_nuevo_id BIGINT NOT NULL REFERENCES ruta_paradas(id),
    monto_adicional NUMERIC(10,2) NOT NULL CHECK (monto_adicional >= 0),
    metodo_pago VARCHAR(30) NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO')),
    usuario_bus_id BIGINT NOT NULL REFERENCES usuarios(id),
    observacion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION extender_boleto(
    p_venta_asiento_id BIGINT,
    p_usuario_bus_id BIGINT,
    p_destino_nuevo_id BIGINT,
    p_monto_adicional NUMERIC(10,2),
    p_metodo_pago VARCHAR(30),
    p_observacion TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_viaje_id BIGINT;
    v_destino_anterior BIGINT;
    v_orden_actual INTEGER;
    v_orden_nuevo INTEGER;
    v_usuario_asignado BIGINT;
    v_rol VARCHAR(30);
BEGIN
    SELECT viaje_id, destino_ruta_parada_id, orden_destino
    INTO v_viaje_id, v_destino_anterior, v_orden_actual
    FROM venta_asientos
    WHERE id = p_venta_asiento_id;

    IF v_viaje_id IS NULL THEN
        RAISE EXCEPTION 'El boleto no existe';
    END IF;

    SELECT usuario_bus_id INTO v_usuario_asignado
    FROM viajes WHERE id = v_viaje_id;

    SELECT r.codigo INTO v_rol
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = p_usuario_bus_id;

    IF v_rol <> 'BUS' OR v_usuario_asignado IS DISTINCT FROM p_usuario_bus_id THEN
        RAISE EXCEPTION 'Solo el personal BUS asignado puede extender el boleto';
    END IF;

    SELECT orden INTO v_orden_nuevo
    FROM ruta_paradas WHERE id = p_destino_nuevo_id;

    IF v_orden_nuevo IS NULL OR v_orden_nuevo <= v_orden_actual THEN
        RAISE EXCEPTION 'El nuevo destino debe estar después del destino actual';
    END IF;

    INSERT INTO extensiones_boleto (
        venta_asiento_id, destino_anterior_id, destino_nuevo_id,
        monto_adicional, metodo_pago, usuario_bus_id, observacion
    ) VALUES (
        p_venta_asiento_id, v_destino_anterior, p_destino_nuevo_id,
        p_monto_adicional, p_metodo_pago, p_usuario_bus_id, p_observacion
    );

    -- Si existe otra reserva planificada que se solapa, la restricción EXCLUDE
    -- impedirá la extensión para ese mismo asiento.
    UPDATE venta_asientos
    SET destino_ruta_parada_id = p_destino_nuevo_id,
        orden_destino = v_orden_nuevo,
        precio_final = precio_final + p_monto_adicional
    WHERE id = p_venta_asiento_id;
END;
$$;

-- ============================================================
-- PAGOS, BOLETOS Y VALIDACIÓN
-- ============================================================

CREATE TABLE pagos (
    id BIGSERIAL PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES ventas(id),
    metodo VARCHAR(30) NOT NULL CHECK (metodo IN ('EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO')),
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    comprobante_url VARCHAR(500),
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO')),
    usuario_validador_id BIGINT REFERENCES usuarios(id),
    observacion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validado_en TIMESTAMPTZ
);

CREATE TABLE boletos (
    id BIGSERIAL PRIMARY KEY,
    venta_asiento_id BIGINT NOT NULL UNIQUE REFERENCES venta_asientos(id),
    codigo_boleto VARCHAR(60) NOT NULL UNIQUE,
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    archivo_url VARCHAR(500),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
        CHECK (estado IN ('ACTIVO', 'USADO', 'ANULADO')),
    generado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE validaciones_boletos (
    id BIGSERIAL PRIMARY KEY,
    boleto_id BIGINT NOT NULL REFERENCES boletos(id),
    viaje_id BIGINT NOT NULL REFERENCES viajes(id),
    usuario_bus_id BIGINT NOT NULL REFERENCES usuarios(id),
    resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('VALIDADO', 'RECHAZADO')),
    observacion TEXT,
    validado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICACIONES Y GPS
-- ============================================================

CREATE TABLE notificaciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id),
    venta_id BIGINT REFERENCES ventas(id),
    correo_destino VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'ENVIADA', 'ERROR')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enviado_en TIMESTAMPTZ
);

CREATE TABLE posiciones_bus (
    id BIGSERIAL PRIMARY KEY,
    viaje_id BIGINT NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
    bus_id BIGINT NOT NULL REFERENCES buses(id),
    ubicacion GEOGRAPHY(POINT, 4326) NOT NULL,
    velocidad_kmh NUMERIC(6,2),
    precision_metros NUMERIC(8,2),
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posiciones_bus_ubicacion ON posiciones_bus USING GIST (ubicacion);
CREATE INDEX idx_posiciones_bus_viaje_fecha ON posiciones_bus (viaje_id, registrado_en DESC);
CREATE INDEX idx_frecuencias_cooperativa ON frecuencias (cooperativa_id, activa);
CREATE INDEX idx_rutas_origen_destino ON rutas (origen_lugar_id, destino_lugar_id);
CREATE INDEX idx_ventas_viaje_estado ON ventas (viaje_id, estado);
CREATE INDEX idx_venta_asientos_viaje ON venta_asientos (viaje_id);
CREATE INDEX idx_pagos_venta ON pagos (venta_id);
CREATE INDEX idx_notificaciones_estado ON notificaciones (estado);

-- ============================================================
-- DATOS BASE
-- ============================================================

INSERT INTO roles (codigo, nombre) VALUES
    ('ADMIN', 'Administrador'),
    ('COOPERATIVA', 'Usuario de cooperativa'),
    ('OFICINISTA', 'Oficinista'),
    ('CLIENTE', 'Usuario final'),
    ('BUS', 'Personal del bus');

INSERT INTO tipos_asiento (cooperativa_id, nombre, recargo_porcentaje) VALUES
    (NULL, 'NORMAL', 0),
    (NULL, 'VIP', 15),
    (NULL, 'PREFERENCIAL', 0);
