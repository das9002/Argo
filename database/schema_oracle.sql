-- ==============================================================================
-- FACTURAFÁCIL POS & ANALYTICS - ESQUEMA DE BASE DE DATOS ORACLE SQL
-- Sistema SaaS de Facturación Electrónica DTE e Inteligencia Comercial (El Salvador)
-- Tasa Impositiva IVA: 13.00%
-- Tablas Maestras: roles, usuarios, clientes, productos, facturas, detalle_facturas
-- ==============================================================================

-- 1. ELIMINACIÓN PREVENTIVA DE TABLAS (CASCADE)
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE detalle_facturas CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE facturas CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE productos CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE clientes CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE usuarios CASCADE CONSTRAINTS';
    EXECUTE IMMEDIATE 'DROP TABLE roles CASCADE CONSTRAINTS';
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignorar si no existen aún
END;
/

-- =========================================================
-- 1. TABLA DE ROLES Y USUARIOS (AUTENTICACIÓN & CONTROL DE ACCESO)
-- =========================================================
CREATE TABLE roles (
    rol_id          NUMBER GENERATED ALWAYS AS IDENTITY,
    nombre_rol      VARCHAR2(50) NOT NULL UNIQUE,
    descripcion     VARCHAR2(150),
    CONSTRAINT pk_roles PRIMARY KEY (rol_id)
);

CREATE TABLE usuarios (
    usuario_id      NUMBER GENERATED ALWAYS AS IDENTITY,
    username        VARCHAR2(50) NOT NULL UNIQUE,
    password_hash   VARCHAR2(255) NOT NULL,
    nombre_completo VARCHAR2(150) NOT NULL,
    correo          VARCHAR2(100) NOT NULL UNIQUE,
    rol_id          NUMBER NOT NULL,
    activo          NUMBER(1) DEFAULT 1 NOT NULL,
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_usuarios PRIMARY KEY (usuario_id),
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (rol_id) REFERENCES roles(rol_id),
    CONSTRAINT chk_usuario_activo CHECK (activo IN (0, 1))
);

-- =========================================================
-- 2. TABLA DE CLIENTES
-- Guarda la información de las personas o empresas a las que se les vende.
-- =========================================================
CREATE TABLE clientes (
    cliente_id       NUMBER GENERATED ALWAYS AS IDENTITY,
    nombre_completo  VARCHAR2(150) NOT NULL,
    documento_fiscal VARCHAR2(20) NOT NULL, -- DUI o NIT en El Salvador
    correo_electronico VARCHAR2(100),
    telefono         VARCHAR2(20),
    tipo_contribuyente VARCHAR2(50) DEFAULT 'Consumidor Final',
    nrc              VARCHAR2(20),
    limite_credito   NUMBER(12, 2) DEFAULT 1000.00,
    saldo_pendiente  NUMBER(12, 2) DEFAULT 0.00,
    CONSTRAINT pk_clientes PRIMARY KEY (cliente_id),
    CONSTRAINT uq_documento UNIQUE (documento_fiscal)
);

-- =========================================================
-- 3. TABLA DE PRODUCTOS
-- Controla el inventario y los precios de los artículos disponibles.
-- =========================================================
CREATE TABLE productos (
    producto_id      NUMBER GENERATED ALWAYS AS IDENTITY,
    sku              VARCHAR2(40) UNIQUE,
    nombre           VARCHAR2(100) NOT NULL,
    categoria        VARCHAR2(60) DEFAULT 'General',
    precio_costo     NUMBER(10, 2) DEFAULT 0.00,
    precio_unitario  NUMBER(10, 2) NOT NULL, -- Soporta decimales (ej: 10.50) con IVA 13% incluido
    stock_actual     NUMBER NOT NULL,
    stock_minimo     NUMBER DEFAULT 5,
    imagen_url       VARCHAR2(350),
    CONSTRAINT pk_productos PRIMARY KEY (producto_id),
    CONSTRAINT chk_precio_positivo CHECK (precio_unitario > 0),
    CONSTRAINT chk_stock_positivo CHECK (stock_actual >= 0)
);

-- =========================================================
-- 4. TABLA DE FACTURAS (Encabezado)
-- Registra los datos generales de una venta (Quién compró, cuándo y cuánto sumó todo).
-- =========================================================
CREATE TABLE facturas (
    factura_id       NUMBER GENERATED ALWAYS AS IDENTITY,
    numero_dte       VARCHAR2(35) UNIQUE,
    codigo_generacion VARCHAR2(40) UNIQUE,
    sello_recepcion_mh VARCHAR2(80),
    cliente_id       NUMBER NOT NULL,
    usuario_id       NUMBER,
    tipo_dte         VARCHAR2(25) DEFAULT 'Factura (01)' NOT NULL,
    fecha_emision    DATE DEFAULT SYSDATE NOT NULL,
    subtotal         NUMBER(10, 2) NOT NULL,
    iva              NUMBER(10, 2) NOT NULL, -- En ES es el 13%
    total_pagar      NUMBER(10, 2) NOT NULL,
    metodo_pago      VARCHAR2(50) DEFAULT 'Efectivo',
    referencia_pago  VARCHAR2(100),
    estado_hacienda  VARCHAR2(30) DEFAULT 'Transmitido con Éxito',
    CONSTRAINT pk_facturas PRIMARY KEY (factura_id),
    CONSTRAINT fk_facturas_clientes FOREIGN KEY (cliente_id)
        REFERENCES clientes(cliente_id),
    CONSTRAINT fk_facturas_usuarios FOREIGN KEY (usuario_id)
        REFERENCES usuarios(usuario_id)
);

-- =========================================================
-- 5. TABLA DE DETALLE DE FACTURA
-- Desglosa los productos específicos que lleva cada factura.
-- Resuelve la relación de muchos a muchos entre Facturas y Productos.
-- =========================================================
CREATE TABLE detalle_facturas (
    detalle_id       NUMBER GENERATED ALWAYS AS IDENTITY,
    factura_id       NUMBER NOT NULL,
    producto_id      NUMBER NOT NULL,
    cantidad         NUMBER NOT NULL,
    precio_historico NUMBER(10, 2) NOT NULL, -- Guarda el precio del momento exacto de la venta
    subtotal_linea   NUMBER(10, 2),
    iva_linea        NUMBER(10, 2),
    CONSTRAINT pk_detalle_facturas PRIMARY KEY (detalle_id),
    CONSTRAINT fk_detalle_factura FOREIGN KEY (factura_id)
        REFERENCES facturas(factura_id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
        REFERENCES productos(producto_id),
    CONSTRAINT chk_cantidad_valida CHECK (cantidad > 0)
);


-- =========================================================
-- INSERTS SEMILLA
-- =========================================================

-- 1. INSERTAR ROLES (ADMIN y CAJERO)
INSERT INTO roles (nombre_rol, descripcion)
VALUES ('ADMIN', 'Administrador con acceso total a reportes, inventario, clientes y gestión de usuarios');

INSERT INTO roles (nombre_rol, descripcion)
VALUES ('CAJERO', 'Operador de caja para terminal POS, ventas rápidas y emisión de DTE');


-- 2. INSERTAR USUARIOS INICIALES (Contraseña por defecto: admin123 / cajero123)
INSERT INTO usuarios (username, password_hash, nombre_completo, correo, rol_id, activo)
VALUES ('admin', 'admin123', 'Diego Siliezar (ADMIN)', 'diego.admin@facturafacil.sv', 1, 1);

INSERT INTO usuarios (username, password_hash, nombre_completo, correo, rol_id, activo)
VALUES ('cajero', 'cajero123', 'Carlos Mendoza (Cajero)', 'carlos.mendoza@facturafacil.sv', 2, 1);


-- 3. INSERTAR DATOS EN CLIENTES
INSERT INTO clientes (nombre_completo, documento_fiscal, correo_electronico, telefono, tipo_contribuyente, nrc, limite_credito, saldo_pendiente)
VALUES ('Juan Carlos Pérez', '0614-250898-101-5', 'juan.perez@email.com', '7788-9900', 'Consumidor Final', '', 1500.00, 0.00);

INSERT INTO clientes (nombre_completo, documento_fiscal, correo_electronico, telefono, tipo_contribuyente, nrc, limite_credito, saldo_pendiente)
VALUES ('Distribuidora El Sol S.A. de C.V.', '0614-121223-102-1', 'contacto@elsol.com', '2255-4433', 'Crédito Fiscal (CCF)', '238910-4', 10000.00, 1420.00);

INSERT INTO clientes (nombre_completo, documento_fiscal, correo_electronico, telefono, tipo_contribuyente, nrc, limite_credito, saldo_pendiente)
VALUES ('María Elena López', '0501-100201-104-3', 'maria.lopez@email.com', '7122-3344', 'Consumidor Final', '', 800.00, 0.00);

INSERT INTO clientes (nombre_completo, documento_fiscal, correo_electronico, telefono, tipo_contribuyente, nrc, limite_credito, saldo_pendiente)
VALUES ('Cliente Final Mostrador', '00000000-0', 'cliente.final@facturafacil.sv', '2200-0000', 'Consumidor Final', '', 0.00, 0.00);


-- 4. INSERTAR DATOS EN PRODUCTOS (Precios e inventario base)
INSERT INTO productos (sku, nombre, categoria, precio_costo, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('LAP-DELL-I15', 'Laptop Dell Inspiron 15', 'Computación', 500.00, 650.00, 15, 3, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80');

INSERT INTO productos (sku, nombre, categoria, precio_costo, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('MOU-LOGI-W', 'Mouse Inalámbrico Logitech', 'Accesorios', 15.00, 25.00, 50, 10, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=300&q=80');

INSERT INTO productos (sku, nombre, categoria, precio_costo, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('MON-ASUS-24', 'Monitor ASUS 24 Pulgadas FHD', 'Monitores', 130.00, 185.00, 20, 5, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80');

INSERT INTO productos (sku, nombre, categoria, precio_costo, precio_unitario, stock_actual, stock_minimo, imagen_url)
VALUES ('TEC-MEC-RGB', 'Teclado Mecánico RGB', 'Accesorios', 28.00, 45.00, 30, 8, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80');


-- 5. SIMULAR FACTURAS Y DETALLES
INSERT INTO facturas (numero_dte, codigo_generacion, sello_recepcion_mh, cliente_id, usuario_id, tipo_dte, fecha_emision, subtotal, iva, total_pagar, metodo_pago, referencia_pago, estado_hacienda)
VALUES ('DTE-01-M001-00000001', 'D4C2B7E1-891A-4C4D-B552-9A3FE18C0142', '2024E677F6702BB04481A01B73FE001428', 1, 2, 'Factura (01)', SYSDATE, 700.00, 91.00, 791.00, 'Tarjeta Visa', 'tok_visa_49182', 'Transmitido con Éxito');

INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_historico, subtotal_linea, iva_linea)
VALUES (1, 1, 1, 650.00, 575.22, 74.78); -- 1 Laptop

INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_historico, subtotal_linea, iva_linea)
VALUES (1, 2, 2, 25.00, 44.25, 5.75);  -- 2 Mouses


INSERT INTO facturas (numero_dte, codigo_generacion, sello_recepcion_mh, cliente_id, usuario_id, tipo_dte, fecha_emision, subtotal, iva, total_pagar, metodo_pago, referencia_pago, estado_hacienda)
VALUES ('DTE-01-M001-00000002', '9B1F223A-C450-4F21-95E0-880F12AA5591', '2024B119C9031EA19208B12C88FF119201', 2, 2, 'CCF (03)', SYSDATE, 370.00, 48.10, 418.10, 'Transferencia UNI', 'uni_sv_banco_8819', 'Transmitido con Éxito');

INSERT INTO detalle_facturas (factura_id, producto_id, cantidad, precio_historico, subtotal_linea, iva_linea)
VALUES (2, 3, 2, 185.00, 327.43, 42.57); -- 2 Monitores

-- Confirmar cambios
COMMIT;


-- =========================================================
-- CONSULTAS DE RESUMEN EJECUTIVO / AUDITORÍA FISCAL
-- =========================================================
-- Resumen del Día (Cierre de Caja)
SELECT
    COUNT(factura_id) AS total_facturas_emitidas,
    SUM(subtotal) AS ventas_netas,
    SUM(iva) AS total_iva_recaudado,
    SUM(total_pagar) AS ingresos_totales
FROM facturas
WHERE TRUNC(fecha_emision) = TRUNC(SYSDATE);

-- Artículos Más Vendidos
SELECT
    p.nombre,
    SUM(df.cantidad) AS unidades_vendidas,
    SUM(df.cantidad * df.precio_historico) AS total_generado
FROM detalle_facturas df
JOIN productos p ON df.producto_id = p.producto_id
GROUP BY p.nombre
ORDER BY unidades_vendidas DESC;
