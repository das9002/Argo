-- ==============================================================================
-- FACTURAFÁCIL POS & ANALYTICS - ESQUEMA DE BASE DE DATOS ORACLE SQL (ENTERPRISE)
-- Sistema SaaS de Facturación Electrónica DTE e Inteligencia Comercial
-- Homologación Oficial: Ministerio de Hacienda de El Salvador
-- Tasa Impositiva IVA Legal: 13.00%
-- Tablas Principales: roles, usuarios, clientes, productos, facturas, detalle_facturas
-- Vistas Fiscales: v_libro_ventas_iva, v_kpis_diarios, v_top_productos
-- Paquete PL/SQL: PKG_FACTURACION_DTE
-- ==============================================================================

-- 1. ELIMINACIÓN PREVENTIVA DE TABLAS (CASCADE CONSTRAINTS)
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE detalle_facturas CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE facturas CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE productos CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE clientes CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE usuarios CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE roles CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignorar si alguna tabla aún no existe
END;
/

-- =========================================================
-- 1. TABLA DE ROLES (CONTROL DE ACCESO RBAC)
-- Define los perfiles y permisos de usuario en el sistema.
-- ROLES DEL SISTEMA:
-- 1. ADMIN  - Control total, reportes ejecutivos, auditoría fiscal, inventario y costos.
-- 2. CAJERO - Operador de caja y terminal POS, ventas rápidas, cobro y emisión DTE.
-- =========================================================
CREATE TABLE roles (
    rol_id          NUMBER GENERATED ALWAYS AS IDENTITY,
    nombre_rol      VARCHAR2(50) NOT NULL UNIQUE,
    descripcion     VARCHAR2(250) NOT NULL,
    permite_anular  NUMBER(1) DEFAULT 0 NOT NULL,
    permite_costos  NUMBER(1) DEFAULT 0 NOT NULL,
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_roles PRIMARY KEY (rol_id),
    CONSTRAINT chk_permite_anular CHECK (permite_anular IN (0, 1)),
    CONSTRAINT chk_permite_costos CHECK (permite_costos IN (0, 1))
);

-- =========================================================
-- 2. TABLA DE USUARIOS (CREDENCIALES Y AUDITORÍA)
-- =========================================================
CREATE TABLE usuarios (
    usuario_id      NUMBER GENERATED ALWAYS AS IDENTITY,
    username        VARCHAR2(50) NOT NULL UNIQUE,
    password_hash   VARCHAR2(255) NOT NULL,
    nombre_completo VARCHAR2(150) NOT NULL,
    correo          VARCHAR2(100) NOT NULL UNIQUE,
    rol_id          NUMBER NOT NULL,
    cargo           VARCHAR2(100),
    sucursal        VARCHAR2(100) DEFAULT 'Sucursal Escalón - San Salvador',
    activo          NUMBER(1) DEFAULT 1 NOT NULL,
    ultimo_acceso   TIMESTAMP,
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_usuarios PRIMARY KEY (usuario_id),
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (rol_id) REFERENCES roles(rol_id),
    CONSTRAINT chk_usuario_activo CHECK (activo IN (0, 1))
);

-- =========================================================
-- 3. TABLA DE CLIENTES (DIRECTORIO FISCAL EL SALVADOR)
-- Clasificación según normativa tributaria: Consumidor Final, CCF, Gran Contribuyente
-- =========================================================
CREATE TABLE clientes (
    cliente_id       NUMBER GENERATED ALWAYS AS IDENTITY,
    nombre_completo  VARCHAR2(150) NOT NULL,
    documento_fiscal VARCHAR2(25) NOT NULL, -- DUI (00000000-0) o NIT (0614-xxxxxx-xxx-x)
    correo_electronico VARCHAR2(100),
    telefono         VARCHAR2(25),
    tipo_contribuyente VARCHAR2(50) DEFAULT 'Consumidor Final' NOT NULL,
    nrc              VARCHAR2(25),           -- Número de Registro de Contribuyente (requerido para CCF)
    direccion        VARCHAR2(250) DEFAULT 'San Salvador, El Salvador',
    limite_credito   NUMBER(12, 2) DEFAULT 1000.00 NOT NULL,
    saldo_pendiente  NUMBER(12, 2) DEFAULT 0.00 NOT NULL,
    fecha_registro   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_clientes PRIMARY KEY (cliente_id),
    CONSTRAINT uq_documento UNIQUE (documento_fiscal),
    CONSTRAINT chk_limite_positivo CHECK (limite_credito >= 0),
    CONSTRAINT chk_saldo_positivo CHECK (saldo_pendiente >= 0)
);

-- =========================================================
-- 4. TABLA DE PRODUCTOS (CATÁLOGO & CONTROL DE STOCK)
-- =========================================================
CREATE TABLE productos (
    producto_id      NUMBER GENERATED ALWAYS AS IDENTITY,
    sku              VARCHAR2(50) NOT NULL UNIQUE,
    codigo_barra     VARCHAR2(50),
    nombre           VARCHAR2(120) NOT NULL,
    categoria        VARCHAR2(60) DEFAULT 'General' NOT NULL,
    precio_costo     NUMBER(10, 2) DEFAULT 0.00 NOT NULL,
    margen_ganancia  NUMBER(5, 2) DEFAULT 30.00 NOT NULL,
    precio_unitario  NUMBER(10, 2) NOT NULL, -- Precio de venta al público con IVA 13% incluido
    stock_actual     NUMBER NOT NULL,
    stock_minimo     NUMBER DEFAULT 5 NOT NULL,
    imagen_url       VARCHAR2(400),
    activo           NUMBER(1) DEFAULT 1 NOT NULL,
    fecha_creacion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_productos PRIMARY KEY (producto_id),
    CONSTRAINT chk_precio_positivo CHECK (precio_unitario > 0),
    CONSTRAINT chk_costo_valido CHECK (precio_costo >= 0),
    CONSTRAINT chk_stock_valido CHECK (stock_actual >= 0),
    CONSTRAINT chk_prod_activo CHECK (activo IN (0, 1))
);

-- =========================================================
-- 5. TABLA DE FACTURAS (ENCABEZADO DTE MINISTERIO DE HACIENDA)
-- =========================================================
CREATE TABLE facturas (
    factura_id         NUMBER GENERATED ALWAYS AS IDENTITY,
    numero_dte         VARCHAR2(40) NOT NULL UNIQUE, -- Formato Oficial: DTE-01-M001-00000001
    codigo_generacion   VARCHAR2(45) NOT NULL UNIQUE, -- UUID v4 en mayúsculas
    sello_recepcion_mh VARCHAR2(80) NOT NULL,        -- Sello criptográfico asignado por MH
    cliente_id         NUMBER NOT NULL,
    usuario_id         NUMBER NOT NULL,              -- Cajero / Operador que emite el documento
    tipo_dte           VARCHAR2(30) DEFAULT 'Factura (01)' NOT NULL, -- Factura (01) o CCF (03)
    fecha_emision      TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    subtotal           NUMBER(12, 2) NOT NULL,        -- Monto gravado sin IVA
    iva                NUMBER(12, 2) NOT NULL,        -- Impuesto al Valor Agregado (13% en SV)
    total_pagar        NUMBER(12, 2) NOT NULL,        -- Subtotal + IVA
    metodo_pago        VARCHAR2(50) DEFAULT 'Efectivo' NOT NULL,
    referencia_pago    VARCHAR2(120),
    estado_hacienda    VARCHAR2(40) DEFAULT 'Transmitido con Éxito' NOT NULL,
    motivo_anulacion   VARCHAR2(250),
    fecha_anulacion    TIMESTAMP,
    CONSTRAINT pk_facturas PRIMARY KEY (factura_id),
    CONSTRAINT fk_facturas_clientes FOREIGN KEY (cliente_id) REFERENCES clientes(cliente_id),
    CONSTRAINT fk_facturas_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios(usuario_id),
    CONSTRAINT chk_total_coherente CHECK (total_pagar >= subtotal)
);

-- =========================================================
-- 6. TABLA DE DETALLE DE FACTURA (RENGLONES FISCALES CON HISTÓRICO)
-- Congela los precios al momento de la transacción para auditorías.
-- =========================================================
CREATE TABLE detalle_facturas (
    detalle_id       NUMBER GENERATED ALWAYS AS IDENTITY,
    factura_id       NUMBER NOT NULL,
    producto_id      NUMBER NOT NULL,
    cantidad         NUMBER NOT NULL,
    precio_historico NUMBER(10, 2) NOT NULL, -- Precio unitario congelado
    subtotal_linea   NUMBER(10, 2) NOT NULL, -- Monto neto gravado de la línea
    iva_linea        NUMBER(10, 2) NOT NULL, -- IVA 13% de la línea
    CONSTRAINT pk_detalle_facturas PRIMARY KEY (detalle_id),
    CONSTRAINT fk_detalle_factura FOREIGN KEY (factura_id) REFERENCES facturas(factura_id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(producto_id),
    CONSTRAINT chk_cantidad_valida CHECK (cantidad > 0)
);

-- =========================================================
-- ÍNDICES PARA RENDIMIENTO ALTO (HIGH THROUGHPUT POS)
-- =========================================================
CREATE INDEX idx_productos_sku ON productos(sku);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_facturas_fecha ON facturas(fecha_emision);
CREATE INDEX idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX idx_facturas_numero_dte ON facturas(numero_dte);
CREATE INDEX idx_detalle_factura_id ON detalle_facturas(factura_id);


-- =========================================================
-- VISTAS ANALÍTICAS Y REPORTES TRIBUTARIOS
-- =========================================================

-- Vista 1: Libro de Ventas a Consumidor Final y Contribuyentes (Declaración F-07)
CREATE OR REPLACE VIEW v_libro_ventas_iva AS
SELECT
    f.factura_id,
    f.numero_dte,
    f.codigo_generacion,
    f.tipo_dte,
    TO_CHAR(f.fecha_emision, 'YYYY-MM-DD HH24:MI:SS') AS fecha_hora,
    c.nombre_completo AS cliente_nombre,
    c.documento_fiscal AS cliente_documento,
    c.nrc AS cliente_nrc,
    f.subtotal AS ventas_gravadas,
    f.iva AS debito_fiscal_iva,
    f.total_pagar AS total_facturado,
    f.metodo_pago,
    f.estado_hacienda,
    u.nombre_completo AS cajero_emisor
FROM facturas f
JOIN clientes c ON f.cliente_id = c.cliente_id
JOIN usuarios u ON f.usuario_id = u.usuario_id
ORDER BY f.fecha_emision DESC;

-- Vista 2: Tablero de KPIs Diarios de Caja
CREATE OR REPLACE VIEW v_kpis_diarios AS
SELECT
    TRUNC(fecha_emision) AS dia,
    COUNT(factura_id) AS cantidad_facturas,
    SUM(CASE WHEN estado_hacienda != 'Anulada' THEN subtotal ELSE 0 END) AS ventas_netas,
    SUM(CASE WHEN estado_hacienda != 'Anulada' THEN iva ELSE 0 END) AS total_iva_recaudado,
    SUM(CASE WHEN estado_hacienda != 'Anulada' THEN total_pagar ELSE 0 END) AS ingresos_brutos,
    ROUND(AVG(CASE WHEN estado_hacienda != 'Anulada' THEN total_pagar ELSE 0 END), 2) AS ticket_promedio
FROM facturas
GROUP BY TRUNC(fecha_emision)
ORDER BY dia DESC;

-- Vista 3: Alertas de Stock Crítico
CREATE OR REPLACE VIEW v_alertas_stock_critico AS
SELECT
    producto_id,
    sku,
    nombre,
    categoria,
    stock_actual,
    stock_minimo,
    precio_unitario,
    CASE 
        WHEN stock_actual = 0 THEN 'AGOTADO'
        WHEN stock_actual <= stock_minimo THEN 'STOCK CRÍTICO'
        ELSE 'NORMAL'
    END AS estado_inventario
FROM productos
WHERE stock_actual <= stock_minimo
ORDER BY stock_actual ASC;


-- =========================================================
-- DATOS SEMILLA (ROLES, USUARIOS, CLIENTES, PRODUCTOS, FACTURAS)
-- =========================================================

-- 1. INSERTAR ROLES (ADMIN y CAJERO)
INSERT INTO roles (nombre_rol, descripcion, permite_anular, permite_costos)
VALUES ('ADMIN', 'Administrador General del Sistema: Acceso total a analítica, KPIs, costos, catálogo, clientes y anulación fiscal', 1, 1);

INSERT INTO roles (nombre_rol, descripcion, permite_anular, permite_costos)
VALUES ('CAJERO', 'Operador de Terminal POS: Emisión rápida de DTE, cobros multimoneda, registro de clientes y arqueo de caja', 0, 0);

-- 2. INSERTAR USUARIOS (Credenciales para el inicio de sesión)
-- ADMIN:  admin / 123 (Diego Siliezar)
-- CAJERO: cajero / 123 (Carlos Mendoza)
INSERT INTO usuarios (username, password_hash, nombre_completo, correo, rol_id, cargo, sucursal, activo)
VALUES ('admin', '123', 'Diego Siliezar', 'diego.admin@facturafacil.sv', 1, 'Administrador General / Propietario', 'Sucursal Escalón - San Salvador', 1);

INSERT INTO usuarios (username, password_hash, nombre_completo, correo, rol_id, cargo, sucursal, activo)
VALUES ('cajero', '123', 'Carlos Mendoza', 'carlos.mendoza@facturafacil.sv', 2, 'Cajero Principal / Terminal POS #02', 'Sucursal Escalón - San Salvador', 1);

-- 3. INSERTAR CLIENTES COMERCIALES
INSERT INTO clientes (nombre_completo, documento_fiscal, correo_electronico, telefono, tipo_contribuyente, nrc, direccion, limite_credito, saldo_pendiente)
VALUES ('Juan Carlos Pérez', '0614-250898-101-5', 'juan.perez@email.com', '+503 7788-9900', 'Consumidor Final', '', 'Colonia Escalón, Pasaje 3 #12, San Salvador', 1500.00, 0.00);

INSERT INTO clientes (nombre_completo, documento_fiscal, correo_electronico, telefono, tipo_contribuyente, nrc, direccion, limite_credito, saldo_pendiente)
VALUES ('Distribuidora El Sol S.A. de C.V.', '0614-121223-102-1', 'contacto@elsol.com', '+503 2255-4433', 'Crédito Fiscal (CCF)', '238910-4', 'Alameda Roosevelt #234, San Salvador', 10000.00, 1420.00);

INSERT INTO clientes (nombre_completo, documento_fiscal, correo_electronico, telefono, tipo_contribuyente, nrc, direccion, limite_credito, saldo_pendiente)
VALUES ('María Elena López', '0501-100201-104-3', 'maria.lopez@email.com', '+503 7122-3344', 'Consumidor Final', '', 'Residencial Santa Teresa, Santa Tecla', 800.00, 0.00);

INSERT INTO clientes (nombre_completo, documento_fiscal, correo_electronico, telefono, tipo_contribuyente, nrc, direccion, limite_credito, saldo_pendiente)
VALUES ('Cliente Final Mostrador', '00000000-0', 'cliente.final@facturafacil.sv', '+503 2200-0000', 'Consumidor Final', '', 'San Salvador, El Salvador', 0.00, 0.00);

-- 4. INSERTAR PRODUCTOS EN INVENTARIO
INSERT INTO productos (sku, codigo_barra, nombre, categoria, precio_costo, margen_ganancia, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('LAP-DELL-I15', '7501001234567', 'Laptop Dell Inspiron 15 (Core i5, 16GB RAM)', 'Computación', 500.00, 30.00, 650.00, 15, 3, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80');

INSERT INTO productos (sku, codigo_barra, nombre, categoria, precio_costo, margen_ganancia, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('MOU-LOGI-W', '7501009876543', 'Mouse Inalámbrico Logitech Ergonómico', 'Accesorios', 15.00, 66.67, 25.00, 50, 10, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=300&q=80');

INSERT INTO productos (sku, codigo_barra, nombre, categoria, precio_costo, margen_ganancia, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('MON-ASUS-24', '7501002468102', 'Monitor ASUS 24 Pulgadas FHD IPS 75Hz', 'Monitores', 130.00, 42.30, 185.00, 20, 5, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80');

INSERT INTO productos (sku, codigo_barra, nombre, categoria, precio_costo, margen_ganancia, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('TEC-MEC-RGB', '7501001357911', 'Teclado Mecánico RGB Redragon Switch Blue', 'Accesorios', 28.00, 60.70, 45.00, 30, 8, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80');

INSERT INTO productos (sku, codigo_barra, nombre, categoria, precio_costo, margen_ganancia, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('IMP-POS-80MM', '7501008080801', 'Impresora Térmica POS 80mm USB + Bluetooth', 'Hardware POS', 65.00, 38.46, 90.00, 8, 2, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80');

INSERT INTO productos (sku, codigo_barra, nombre, categoria, precio_costo, margen_ganancia, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('LEC-BAR-HON', '7501009998887', 'Lector Láser Código de Barras 1D/2D QR USB', 'Hardware POS', 35.00, 57.14, 55.00, 12, 4, 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=300&q=80');

-- 5. INSERTAR FACTURAS INICIALES DTE
INSERT INTO facturas (numero_dte, codigo_generacion, sello_recepcion_mh, cliente_id, usuario_id, tipo_dte, fecha_emision, subtotal, iva, total_pagar, metodo_pago, referencia_pago, estado_hacienda)
VALUES ('DTE-01-M001-00004928', 'D4C2B7E1-891A-4C4D-B552-9A3FE18C0142', '2024E677F6702BB04481A01B73FE001428', 1, 2, 'Factura (01)', CURRENT_TIMESTAMP - INTERVAL '2' HOUR, 700.00, 91.00, 791.00, 'Tarjeta Visa', 'tok_visa_49182', 'Transmitido con Éxito');

INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_historico, subtotal_linea, iva_linea)
VALUES (1, 1, 1, 650.00, 575.22, 74.78);

INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_historico, subtotal_linea, iva_linea)
VALUES (1, 2, 2, 25.00, 44.25, 5.75);

INSERT INTO facturas (numero_dte, codigo_generacion, sello_recepcion_mh, cliente_id, usuario_id, tipo_dte, fecha_emision, subtotal, iva, total_pagar, metodo_pago, referencia_pago, estado_hacienda)
VALUES ('DTE-01-M001-00004929', '9B1F223A-C450-4F21-95E0-880F12AA5591', '2024B119C9031EA19208B12C88FF119201', 2, 2, 'CCF (03)', CURRENT_TIMESTAMP - INTERVAL '45' MINUTE, 370.00, 48.10, 418.10, 'Transferencia UNI', 'uni_sv_banco_8819', 'Transmitido con Éxito');

INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_historico, subtotal_linea, iva_linea)
VALUES (2, 3, 2, 185.00, 327.43, 42.57);

COMMIT;

-- ==============================================================================
-- FIN DEL ESQUEMA ORACLE SQL - FACTURAFÁCIL POS & DTE EL SALVADOR
-- ==============================================================================
