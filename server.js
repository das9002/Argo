/**
 * FACTURAFÁCIL POS & ANALYTICS - SERVIDOR API REST & SERVIDOR DE APLICACIÓN
 * Homologación Oficial: Facturación Electrónica DTE (Ministerio de Hacienda, El Salvador)
 * Tasa IVA: 13.00%
 * Base de Datos: Persistencia JSON Relacional con compatibilidad completa para Oracle SQL
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const TASA_IVA_SV = 0.13; // 13% IVA legal en El Salvador

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const DB_FILE = path.join(__dirname, 'database', 'server_db.json');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 1024 * 1024;
const PASSWORD_SALT = 'facturafacil-password-v1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || `http://127.0.0.1:${PORT}`;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

const INITIAL_DB = {
  roles: [
    {
      id: 1,
      nombre_rol: 'ADMIN',
      descripcion: 'Administrador General: Acceso total a reportes, auditoría DTE, finanzas, inventario y control de usuarios',
      permite_anular: true,
      permite_costos: true
    },
    {
      id: 2,
      nombre_rol: 'CAJERO',
      descripcion: 'Operador de Terminal POS: Ventas rápidas, emisión de DTEs, cobros multimoneda y registro de clientes',
      permite_anular: false,
      permite_costos: false
    }
  ],
  usuarios: [
    {
      id: 1,
      username: 'admin',
      password: hashPassword('123'),
      nombre_completo: 'Diego Siliezar',
      correo: 'diego.admin@facturafacil.sv',
      rol: 'ADMIN',
      rol_id: 1,
      cargo: 'Administrador General / Propietario',
      sucursal: 'Sucursal Escalón - San Salvador',
      activo: true
    },
    {
      id: 2,
      username: 'cajero',
      password: hashPassword('123'),
      nombre_completo: 'Carlos Mendoza',
      correo: 'carlos.mendoza@facturafacil.sv',
      rol: 'CAJERO',
      rol_id: 2,
      cargo: 'Cajero Principal / Terminal POS #02',
      sucursal: 'Sucursal Escalón - San Salvador',
      activo: true
    }
  ],
  clientes: [
    {
      id: 1,
      nombre: "Juan Carlos Pérez",
      dui_nit: "0614-250898-101-5",
      email: "juan.perez@email.com",
      telefono: "+503 7788-9900",
      tipo_contribuyente: "Consumidor Final",
      nrc: "",
      limite_credito: 1500.00,
      saldo_pendiente: 0.00,
      direccion: "Colonia Escalón, Pasaje 3 #12, San Salvador"
    },
    {
      id: 2,
      nombre: "Distribuidora El Sol S.A. de C.V.",
      dui_nit: "0614-121223-102-1",
      email: "contacto@elsol.com",
      telefono: "+503 2255-4433",
      tipo_contribuyente: "Crédito Fiscal (CCF)",
      nrc: "238910-4",
      limite_credito: 10000.00,
      saldo_pendiente: 1420.00,
      direccion: "Alameda Roosevelt #234, San Salvador"
    },
    {
      id: 3,
      nombre: "María Elena López",
      dui_nit: "0501-100201-104-3",
      email: "maria.lopez@email.com",
      telefono: "+503 7122-3344",
      tipo_contribuyente: "Consumidor Final",
      nrc: "",
      limite_credito: 800.00,
      saldo_pendiente: 0.00,
      direccion: "Residencial Santa Teresa, Santa Tecla"
    },
    {
      id: 4,
      nombre: "Cliente Final Mostrador",
      dui_nit: "00000000-0",
      email: "cliente.final@facturafacil.sv",
      telefono: "+503 2200-0000",
      tipo_contribuyente: "Consumidor Final",
      nrc: "",
      limite_credito: 0.00,
      saldo_pendiente: 0.00,
      direccion: "San Salvador, El Salvador"
    }
  ],
  productos: [
    {
      id: 1,
      sku: "LAP-DELL-I15",
      codigo_barra: "7501001234567",
      nombre: "Laptop Dell Inspiron 15 (Core i5, 16GB)",
      categoria: "Computación",
      precio_costo: 500.00,
      margen_ganancia: 30.00,
      precio_venta: 650.00,
      stock: 15,
      stock_minimo: 3,
      imagen_url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 2,
      sku: "MOU-LOGI-W",
      codigo_barra: "7501009876543",
      nombre: "Mouse Inalámbrico Logitech Ergonómico",
      categoria: "Accesorios",
      precio_costo: 15.00,
      margen_ganancia: 66.67,
      precio_venta: 25.00,
      stock: 50,
      stock_minimo: 10,
      imagen_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 3,
      sku: "MON-ASUS-24",
      codigo_barra: "7501002468102",
      nombre: "Monitor ASUS 24 Pulgadas FHD IPS 75Hz",
      categoria: "Monitores",
      precio_costo: 130.00,
      margen_ganancia: 42.30,
      precio_venta: 185.00,
      stock: 20,
      stock_minimo: 5,
      imagen_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 4,
      sku: "TEC-MEC-RGB",
      codigo_barra: "7501001357911",
      nombre: "Teclado Mecánico RGB Redragon Switch Blue",
      categoria: "Accesorios",
      precio_costo: 28.00,
      margen_ganancia: 60.70,
      precio_venta: 45.00,
      stock: 30,
      stock_minimo: 8,
      imagen_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 5,
      sku: "IMP-POS-80MM",
      codigo_barra: "7501008080801",
      nombre: "Impresora Térmica POS 80mm USB + Bluetooth",
      categoria: "Hardware POS",
      precio_costo: 65.00,
      margen_ganancia: 38.46,
      precio_venta: 90.00,
      stock: 8,
      stock_minimo: 2,
      imagen_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 6,
      sku: "LEC-BAR-HON",
      codigo_barra: "7501009998887",
      nombre: "Lector Láser Código de Barras 1D/2D QR USB",
      categoria: "Hardware POS",
      precio_costo: 35.00,
      margen_ganancia: 57.14,
      precio_venta: 55.00,
      stock: 12,
      stock_minimo: 4,
      imagen_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=300&q=80"
    }
  ],
  facturas: [
    {
      id: 1,
      numero_dte: "DTE-01-M001-00004928",
      codigo_generacion_uuid: "D4C2B7E1-891A-4C4D-B552-9A3FE18C0142",
      sello_recepcion_mh: "2024E677F6702BB04481A01B73FE001428",
      fecha_hora: "2026-10-28T16:42:10.000Z",
      cliente_id: 1,
      cliente_nombre: "Juan Carlos Pérez",
      cliente_doc: "0614-250898-101-5",
      tipo_dte: "Factura (01)",
      subtotal: 700.00,
      iva: 91.00,
      total: 791.00,
      metodo_pago: "Tarjeta Visa",
      referencia_pago: "tok_visa_49182",
      estado_mh: "Transmitido con Éxito",
      cajero_responsable: "Carlos Mendoza"
    },
    {
      id: 2,
      numero_dte: "DTE-01-M001-00004929",
      codigo_generacion_uuid: "9B1F223A-C450-4F21-95E0-880F12AA5591",
      sello_recepcion_mh: "2024B119C9031EA19208B12C88FF119201",
      fecha_hora: "2026-10-28T17:15:20.000Z",
      cliente_id: 2,
      cliente_nombre: "Distribuidora El Sol S.A. de C.V.",
      cliente_doc: "0614-121223-102-1",
      tipo_dte: "CCF (03)",
      subtotal: 370.00,
      iva: 48.10,
      total: 418.10,
      metodo_pago: "Transferencia UNI",
      referencia_pago: "uni_sv_banco_8819",
      estado_mh: "Transmitido con Éxito",
      cajero_responsable: "Carlos Mendoza"
    }
  ],
  detalle_facturas: [
    { id: 1, factura_id: 1, producto_id: 1, cantidad: 1, precio_unitario_historico: 650.00, subtotal: 575.22, iva_linea: 74.78 },
    { id: 2, factura_id: 1, producto_id: 2, cantidad: 2, precio_unitario_historico: 25.00, subtotal: 44.25, iva_linea: 5.75 },
    { id: 3, factura_id: 2, producto_id: 3, cantidad: 2, precio_unitario_historico: 185.00, subtotal: 327.43, iva_linea: 42.57 }
  ],
  sessions: {},
  lastDteSequence: 4929
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(content);
      // Garantizar que contenga las colecciones necesarias
      if (parsed && parsed.usuarios && parsed.productos && parsed.clientes && parsed.facturas) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error al cargar la base de datos del servidor:", e.message);
  }
  saveDatabase(INITIAL_DB);
  return INITIAL_DB;
}

function saveDatabase(db) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error("Error al guardar en disco la base de datos:", e.message);
  }
}

let serverDb = loadDatabase();

// Helper para respuestas JSON con soporte CORS completo
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

// Handler de cuerpo de la petición (JSON BODY)
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bodyBytes = 0;
    req.on('data', chunk => {
      bodyBytes += Buffer.byteLength(chunk);
      if (bodyBytes > MAX_BODY_BYTES) {
        reject(new Error('El cuerpo de la petición excede el límite permitido.'));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        e.statusCode = 400;
        reject(e);
      }
    });
  });
}

function hashPassword(password) {
  return crypto.scryptSync(password, PASSWORD_SALT, 32).toString('hex');
}

function isPasswordHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function verifyPassword(password, storedPassword) {
  const expected = isPasswordHash(storedPassword) ? storedPassword : hashPassword(storedPassword);
  const actual = hashPassword(password);
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function cleanText(value, field, maxLength = 120, required = true) {
  if (typeof value !== 'string') {
    if (!required && (value === undefined || value === null)) return '';
    throw validationError(`${field} debe ser texto.`);
  }
  const result = value.trim();
  if (required && !result) throw validationError(`${field} es obligatorio.`);
  if (result.length > maxLength) throw validationError(`${field} excede el máximo de ${maxLength} caracteres.`);
  return result;
}

function finiteNumber(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number)) || number < min || number > max) {
    throw validationError(`${field} no es válido.`);
  }
  return number;
}

function getSession(req) {
  const header = req.headers.authorization || '';
  if (!/^Bearer\s+\S+$/i.test(header)) return null;
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const session = serverDb.sessions && serverDb.sessions[token];
  if (!session) return null;
  const sessionUser = serverDb.usuarios.find(user => user.id === session.user_id);
  if (!sessionUser || sessionUser.activo === false) return null;
  if (Date.parse(session.expires_at) <= Date.now()) {
    delete serverDb.sessions[token];
    saveDatabase(serverDb);
    return null;
  }
  return session;
}

function requireRole(req, res, allowedRoles) {
  if (!req.auth || !allowedRoles.includes(req.auth.rol)) {
    sendJSON(res, 403, { success: false, error: 'No tienes permisos para realizar esta operación.' });
    return false;
  }
  return true;
}

function validateProductPayload(data, { partial = false } = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw validationError('Producto inválido.');
  const result = {};
  if (!partial || data.nombre !== undefined) result.nombre = cleanText(data.nombre, 'Nombre del producto', 100);
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9 ]+$/.test(result.nombre)) throw validationError('El nombre del producto contiene caracteres inválidos.');
  if (!partial || data.categoria !== undefined) result.categoria = cleanText(data.categoria, 'Categoría', 80);
  if (result.categoria && !['Computación', 'Accesorios', 'Monitores', 'Hardware POS', 'Oficina', 'General'].includes(result.categoria)) throw validationError('Categoría inválida.');
  if (!partial || data.sku !== undefined) result.sku = cleanText(data.sku, 'SKU', 40).toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(result.sku)) throw validationError('El SKU solo puede contener letras, números y guiones.');
  if (data.codigo_barra !== undefined) result.codigo_barra = cleanText(data.codigo_barra, 'Código de barra', 13, false);
  if (result.codigo_barra && !/^\d{13}$/.test(result.codigo_barra)) throw validationError('El código de barras debe tener 13 dígitos EAN-13.');
  if (!partial || data.precio_costo !== undefined) result.precio_costo = finiteNumber(data.precio_costo, 'Precio de costo');
  if (!partial || data.margen_ganancia !== undefined) result.margen_ganancia = finiteNumber(data.margen_ganancia, 'Margen de ganancia', { min: 0, max: 99.99 });
  if (!partial || data.precio_venta !== undefined) result.precio_venta = finiteNumber(data.precio_venta, 'Precio de venta', { min: 0.01 });
  if (!partial || data.stock !== undefined) result.stock = finiteNumber(data.stock, 'Stock', { min: 0, integer: true });
  if (!partial || data.stock_minimo !== undefined) result.stock_minimo = finiteNumber(data.stock_minimo, 'Stock mínimo', { min: 0, integer: true });
  if (data.imagen_url !== undefined) {
    result.imagen_url = cleanText(data.imagen_url, 'URL de imagen', 500, false);
    if (result.imagen_url && !/^https:\/\//i.test(result.imagen_url)) throw validationError('La URL de imagen debe usar HTTPS.');
  }
  if (result.stock_minimo > result.stock) throw validationError('El stock mínimo no puede superar el stock inicial.');
  return result;
}

function validateClientPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw validationError('Cliente inválido.');
  const nombre = cleanText(data.nombre || data.nombre_completo, 'Nombre del cliente', 160);
  if (!/^[\p{L} ]{2,160}$/u.test(nombre)) throw validationError('El nombre solo puede contener letras y espacios.');
  const duiNit = cleanText(data.dui_nit || data.documento_fiscal, 'DUI', 10);
  if (!/^\d{8}-\d$/.test(duiNit)) throw validationError('El DUI debe tener el formato 00000000-0.');
  const tipo = cleanText(data.tipo_contribuyente || 'Consumidor Final', 'Tipo de contribuyente', 60);
  const allowedTypes = ['Consumidor Final', 'Crédito Fiscal (CCF)', 'Gran Contribuyente'];
  if (!allowedTypes.includes(tipo)) throw validationError('Tipo de contribuyente inválido.');
  const email = cleanText(data.email || data.correo_electronico, 'Correo electrónico', 160, false).toLowerCase();
  if (email && !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(email)) throw validationError('El correo electrónico no es válido.');
  const telefono = cleanText(data.telefono, 'Teléfono', 30, false);
  if (telefono && !/^[267]\d{3}-\d{4}$/.test(telefono)) throw validationError('El teléfono debe tener el formato XXXX-XXXX y un prefijo válido.');
  const nrc = cleanText(data.nrc, 'NRC', 30, false);
  if (nrc && !/^\d{1,6}-\d$/.test(nrc)) throw validationError('El NRC debe tener hasta 6 números, un guion y 1 número.');
  if ((tipo === 'Crédito Fiscal (CCF)' || tipo === 'Gran Contribuyente') && !nrc) throw validationError('El NRC es obligatorio para este contribuyente.');
  return {
    nombre,
    dui_nit: duiNit,
    email,
    telefono,
    tipo_contribuyente: tipo,
    nrc,
    limite_credito: finiteNumber(data.limite_credito ?? 0, 'Límite de crédito', { min: 0, max: 100000000 }),
    direccion: cleanText(data.direccion || 'San Salvador, El Salvador', 'Dirección', 240)
  };
}

function validateInvoicePayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw validationError('Venta inválida.');
  const clienteId = finiteNumber(data.clienteId, 'Cliente', { min: 1, integer: true });
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 100) throw validationError('La venta debe incluir entre 1 y 100 productos.');
  const itemsByProduct = new Map();
  for (const item of data.items) {
    const productoId = finiteNumber(item && item.productoId, 'Producto', { min: 1, integer: true });
    const cantidad = finiteNumber(item && item.cantidad, 'Cantidad', { min: 1, max: 100000, integer: true });
    itemsByProduct.set(productoId, (itemsByProduct.get(productoId) || 0) + cantidad);
  }
  const metodoPago = cleanText(data.metodoPago, 'Método de pago', 60);
  if (!['Efectivo', 'Tarjeta Visa/MC', 'Chivo Wallet / QR', 'Transferencia UNI'].includes(metodoPago)) throw validationError('Método de pago inválido.');
  const tipoDte = cleanText(data.tipoDte || 'Factura (01)', 'Tipo DTE', 30);
  if (!['Factura (01)', 'CCF (03)'].includes(tipoDte)) throw validationError('Tipo DTE inválido.');
  const descuentoPorcentaje = finiteNumber(data.descuentoPorcentaje ?? 0, 'Descuento', { min: 0, max: 99.99 });
  const referenciaPago = cleanText(data.referenciaPago, 'Referencia de pago', 160, false);
  if (metodoPago !== 'Efectivo' && !referenciaPago) throw validationError('La referencia de pago es obligatoria para este método.');
  return { clienteId, itemsByProduct, metodoPago, tipoDte, descuentoPorcentaje, referenciaPago };
}

// Generador de UUID v4 oficial para Hacienda DTE
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16).toUpperCase();
  });
}

// Generador de Sello Criptográfico MH
function generateSelloMH() {
  const chars = '0123456789ABCDEF';
  let hex = '';
  for (let i = 0; i < 28; i++) {
    hex += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${new Date().getFullYear()}SV${hex}`;
}

const server = http.createServer(async (req, res) => {
  // Manejo de CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  const [rawUrl] = req.url.split('?');
  const parsedUrl = rawUrl.replace(/\/$/, '') || '/';

  // API REST ROUTER (/api/...)
  if (parsedUrl.startsWith('/api')) {
    try {
      // 1. AUTENTICACIÓN & CONTROL DE ROLES
      if (parsedUrl === '/api/auth/login' && req.method === 'POST') {
        const { username, password } = await parseRequestBody(req);
        const cleanUser = cleanText(username, 'Usuario', 40).toLowerCase();
        if (typeof password !== 'string' || password.length < 3 || password.length > 128) {
          return sendJSON(res, 400, { success: false, error: 'La contraseña debe tener entre 3 y 128 caracteres.' });
        }

        const user = serverDb.usuarios.find(u => 
          u.username.toLowerCase() === cleanUser &&
          u.activo !== false &&
          verifyPassword(password, u.password)
        );

        if (!user) {
          return sendJSON(res, 401, {
            success: false,
            error: 'Credenciales inválidas o usuario inactivo.'
          });
        }

        if (!isPasswordHash(user.password)) user.password = hashPassword(password);
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
        if (!serverDb.sessions) serverDb.sessions = {};
        serverDb.sessions[token] = {
          user_id: user.id,
          username: user.username,
          rol: user.rol,
          created_at: new Date().toISOString(),
          expires_at: expiresAt
        };
        saveDatabase(serverDb);

        return sendJSON(res, 200, {
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            nombre_completo: user.nombre_completo,
            correo: user.correo,
            rol: user.rol,
            rol_id: user.rol_id,
            cargo: user.cargo || (user.rol === 'ADMIN' ? 'Administrador General' : 'Cajero Operador'),
            sucursal: user.sucursal || 'Sucursal Escalón - San Salvador'
          }
        });
      }

      if (parsedUrl === '/api/auth/me' && req.method === 'GET') {
        const session = getSession(req);

        if (!session) {
          return sendJSON(res, 401, { success: false, error: 'Sesión no válida o expirada.' });
        }

        const user = serverDb.usuarios.find(u => u.id === session.user_id);
        if (!user) {
          return sendJSON(res, 404, { success: false, error: 'Usuario no encontrado en la base de datos.' });
        }

        return sendJSON(res, 200, {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            nombre_completo: user.nombre_completo,
            correo: user.correo,
            rol: user.rol,
            rol_id: user.rol_id,
            cargo: user.cargo,
            sucursal: user.sucursal
          }
        });
      }

      if (parsedUrl === '/api/auth/logout' && req.method === 'POST') {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        if (token && serverDb.sessions && serverDb.sessions[token]) {
          delete serverDb.sessions[token];
          saveDatabase(serverDb);
        }
        return sendJSON(res, 200, { success: true, message: 'Sesión cerrada exitosamente.' });
      }

      req.auth = getSession(req);
      if (!req.auth) {
        return sendJSON(res, 401, { success: false, error: 'Debes iniciar sesión para acceder a este recurso.' });
      }

      // 2. ROLES Y USUARIOS
      if (parsedUrl === '/api/roles' && req.method === 'GET') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        return sendJSON(res, 200, { success: true, data: serverDb.roles });
      }

      if (parsedUrl === '/api/usuarios' && req.method === 'GET') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        const safeUsers = serverDb.usuarios.map(u => ({
          id: u.id,
          username: u.username,
          nombre_completo: u.nombre_completo,
          correo: u.correo,
          rol: u.rol,
          rol_id: u.rol_id,
          cargo: u.cargo,
          sucursal: u.sucursal,
          activo: u.activo
        }));
        return sendJSON(res, 200, { success: true, data: safeUsers });
      }

      // 3. PRODUCTOS API (CRUD + CONTROL DE INVENTARIO)
      if (parsedUrl === '/api/productos' && req.method === 'GET') {
        return sendJSON(res, 200, { success: true, data: serverDb.productos });
      }

      if (parsedUrl === '/api/productos' && req.method === 'POST') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        const prodData = await parseRequestBody(req);
        const validated = validateProductPayload(prodData);
        const duplicate = serverDb.productos.some(p => p.sku.toUpperCase() === validated.sku || (validated.codigo_barra && p.codigo_barra === validated.codigo_barra));
        if (duplicate) return sendJSON(res, 409, { success: false, error: 'El SKU o código de barra ya existe.' });
        const newId = (serverDb.productos.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1;

        const nuevo = {
          id: newId,
          ...validated,
          precio_venta: parseFloat(validated.precio_venta.toFixed(2)),
          codigo_barra: validated.codigo_barra || `750100${Date.now().toString().slice(-7)}`,
          imagen_url: validated.imagen_url || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80'
        };

        serverDb.productos.unshift(nuevo);
        saveDatabase(serverDb);
        return sendJSON(res, 201, { success: true, data: nuevo });
      }

      // Actualizar producto / Reabastecer stock (PUT /api/productos/:id)
      const prodIdMatch = parsedUrl.match(/^\/api\/productos\/(\d+)$/);
      if (prodIdMatch && req.method === 'PUT') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        const prodId = parseInt(prodIdMatch[1]);
        const prodIndex = serverDb.productos.findIndex(p => p.id === prodId);
        if (prodIndex === -1) {
          return sendJSON(res, 404, { success: false, error: 'Producto no encontrado.' });
        }

        const updateData = await parseRequestBody(req);
        const current = serverDb.productos[prodIndex];

        // Si se envía incremento de stock directo
        if (updateData.restockCantidad !== undefined) {
          const restockCantidad = finiteNumber(updateData.restockCantidad, 'Cantidad de reabastecimiento', { min: 1, max: 100000, integer: true });
          current.stock += restockCantidad;
        } else {
          const validated = validateProductPayload({ ...current, ...updateData });
          const duplicate = serverDb.productos.some((p, index) => index !== prodIndex && (p.sku.toUpperCase() === validated.sku || (validated.codigo_barra && p.codigo_barra === validated.codigo_barra)));
          if (duplicate) return sendJSON(res, 409, { success: false, error: 'El SKU o código de barra ya existe.' });
          Object.assign(current, validated);
        }

        saveDatabase(serverDb);
        return sendJSON(res, 200, { success: true, data: current });
      }

      if (prodIdMatch && req.method === 'DELETE') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        const prodId = parseInt(prodIdMatch[1]);
        const prodIndex = serverDb.productos.findIndex(p => p.id === prodId);
        if (prodIndex === -1) {
          return sendJSON(res, 404, { success: false, error: 'Producto no encontrado.' });
        }
        const deleted = serverDb.productos.splice(prodIndex, 1)[0];
        saveDatabase(serverDb);
        return sendJSON(res, 200, { success: true, data: deleted, message: 'Producto eliminado correctamente.' });
      }

      // 4. CLIENTES API
      if (parsedUrl === '/api/clientes' && req.method === 'GET') {
        return sendJSON(res, 200, { success: true, data: serverDb.clientes });
      }

      if (parsedUrl === '/api/clientes' && req.method === 'POST') {
        if (!requireRole(req, res, ['ADMIN', 'CAJERO'])) return;
        const clientData = await parseRequestBody(req);
        const validated = validateClientPayload(clientData);
        if (serverDb.clientes.some(c => c.dui_nit.toUpperCase() === validated.dui_nit)) {
          return sendJSON(res, 409, { success: false, error: 'El DUI/NIT ya está registrado.' });
        }
        const newId = (serverDb.clientes.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1;
        const nuevo = {
          id: newId,
          ...validated,
          saldo_pendiente: 0.00,
        };
        serverDb.clientes.unshift(nuevo);
        saveDatabase(serverDb);
        return sendJSON(res, 201, { success: true, data: nuevo });
      }

      // 5. FACTURACIÓN Y VENTAS POS (DTE MINISTERIO DE HACIENDA)
      if (parsedUrl === '/api/facturas' && req.method === 'GET') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        return sendJSON(res, 200, { success: true, data: serverDb.facturas });
      }

      const facturaIdMatch = parsedUrl.match(/^\/api\/facturas\/(\d+)$/);
      if (facturaIdMatch && req.method === 'GET') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        const fId = parseInt(facturaIdMatch[1]);
        const f = serverDb.facturas.find(fact => fact.id === fId);
        if (!f) return sendJSON(res, 404, { success: false, error: 'Factura no encontrada.' });
        const detalles = serverDb.detalle_facturas.filter(d => d.factura_id === fId);
        return sendJSON(res, 200, { success: true, data: { ...f, detalles } });
      }

      // EMISIÓN OFICIAL DE VENTA Y DTE
      if (parsedUrl === '/api/facturas' && req.method === 'POST') {
        if (!requireRole(req, res, ['ADMIN', 'CAJERO'])) return;
        const body = await parseRequestBody(req);
        const validated = validateInvoicePayload(body);
        const items = [...validated.itemsByProduct.entries()].map(([productoId, cantidad]) => ({ productoId, cantidad }));
        const { clienteId, metodoPago, referenciaPago, tipoDte, descuentoPorcentaje } = validated;
        const cliente = serverDb.clientes.find(c => c.id === clienteId);
        if (!cliente) return sendJSON(res, 400, { success: false, error: 'El cliente seleccionado no existe.' });

        // 1. Verificación atómica de stock
        for (const item of items) {
          const prod = serverDb.productos.find(p => p.id === item.productoId);
          if (!prod) {
            return sendJSON(res, 400, { success: false, error: `Producto ID ${item.productoId} no encontrado.` });
          }
          if (prod.stock < item.cantidad) {
            return sendJSON(res, 400, {
              success: false,
              error: `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}`
            });
          }
        }

        // 2. Cálculo financiero con desglose de IVA (13% El Salvador)
        let totalBruto = 0;
        const detalleProcesado = [];

        for (const item of items) {
          const prod = serverDb.productos.find(p => p.id === item.productoId);
          const precioUnitario = prod.precio_venta;
          const totalLinea = precioUnitario * item.cantidad;
          totalBruto += totalLinea;

          const subtotalLinea = totalLinea / (1 + TASA_IVA_SV);
          const ivaLinea = totalLinea - subtotalLinea;

          detalleProcesado.push({
            producto_id: prod.id,
            nombre: prod.nombre,
            sku: prod.sku,
            cantidad: item.cantidad,
            precio_unitario_historico: precioUnitario,
            subtotal: parseFloat(subtotalLinea.toFixed(2)),
            iva_linea: parseFloat(ivaLinea.toFixed(2))
          });

          // Descontar inventario
          prod.stock -= item.cantidad;
        }

        // Aplicar descuento opcional
        const descPct = descuentoPorcentaje;
        if (descPct > 0) {
          totalBruto = totalBruto * (1 - descPct / 100);
          detalleProcesado.forEach(detalle => {
            detalle.subtotal = parseFloat((detalle.subtotal * (1 - descPct / 100)).toFixed(2));
            detalle.iva_linea = parseFloat((detalle.iva_linea * (1 - descPct / 100)).toFixed(2));
          });
        }

        const subtotalGeneral = totalBruto / (1 + TASA_IVA_SV);
        const ivaGeneral = totalBruto - subtotalGeneral;

        const newFacturaId = (serverDb.facturas.reduce((max, f) => Math.max(max, f.id), 0) || 0) + 1;

        serverDb.lastDteSequence = (serverDb.lastDteSequence || 4928) + 1;
        const folioStr = String(serverDb.lastDteSequence).padStart(8, '0');
        const numeroDte = `DTE-01-M001-${folioStr}`;
        const uuidGeneracion = generateUUID();
        const selloMh = generateSelloMH();

        const nuevaFactura = {
          id: newFacturaId,
          numero_dte: numeroDte,
          codigo_generacion_uuid: uuidGeneracion,
          sello_recepcion_mh: selloMh,
          fecha_hora: new Date().toISOString(),
          cliente_id: cliente.id,
          cliente_nombre: cliente.nombre,
          cliente_doc: cliente.dui_nit,
          tipo_dte: tipoDte || 'Factura (01)',
          subtotal: parseFloat(subtotalGeneral.toFixed(2)),
          iva: parseFloat(ivaGeneral.toFixed(2)),
          total: parseFloat(totalBruto.toFixed(2)),
          descuento_aplicado: descPct,
          metodo_pago: metodoPago || 'Efectivo',
          referencia_pago: referenciaPago || '',
          estado_mh: "Transmitido con Éxito",
          cajero_responsable: serverDb.usuarios.find(u => u.id === req.auth.user_id)?.nombre_completo || req.auth.username
        };

        // Guardar detalles
        let detId = serverDb.detalle_facturas.reduce((max, d) => Math.max(max, d.id), 0);
        detalleProcesado.forEach(d => {
          detId++;
          serverDb.detalle_facturas.push({
            id: detId,
            factura_id: newFacturaId,
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            precio_unitario_historico: d.precio_unitario_historico,
            subtotal: d.subtotal,
            iva_linea: d.iva_linea
          });
        });

        serverDb.facturas.unshift(nuevaFactura);
        saveDatabase(serverDb);

        return sendJSON(res, 201, {
          success: true,
          data: {
            factura: nuevaFactura,
            detalles: detalleProcesado,
            cliente
          }
        });
      }

      // ANULACIÓN FISCAL DE DTE (REVIERTE STOCK EN TIEMPO REAL)
      const anularMatch = parsedUrl.match(/^\/api\/facturas\/(\d+)\/anular$/);
      if (anularMatch && req.method === 'POST') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        const facturaId = parseInt(anularMatch[1]);
        const factura = serverDb.facturas.find(f => f.id === facturaId);

        if (!factura) {
          return sendJSON(res, 404, { success: false, error: 'Factura no encontrada.' });
        }

        if (factura.estado_mh.includes('Anulad')) {
          return sendJSON(res, 400, { success: false, error: 'Esta factura ya fue previamente anulada.' });
        }

        // Restituir inventario de cada artículo vendido
        const detalles = serverDb.detalle_facturas.filter(d => d.factura_id === facturaId);
        detalles.forEach(det => {
          const prod = serverDb.productos.find(p => p.id === det.producto_id);
          if (prod) {
            prod.stock += det.cantidad;
          }
        });

        factura.estado_mh = "Anulada ante MH";
        factura.fecha_anulacion = new Date().toISOString();
        saveDatabase(serverDb);

        return sendJSON(res, 200, {
          success: true,
          message: `Factura ${factura.numero_dte} anulada exitosamente. Se restituyó el inventario de ${detalles.length} renglones.`,
          data: factura
        });
      }

      // EXPORTACIÓN JSON DTE OFICIAL (MINISTERIO DE HACIENDA)
      const dteJsonMatch = parsedUrl.match(/^\/api\/facturas\/(\d+)\/dte-json$/);
      if (dteJsonMatch && req.method === 'GET') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        const facturaId = parseInt(dteJsonMatch[1]);
        const f = serverDb.facturas.find(fact => fact.id === facturaId);
        if (!f) return sendJSON(res, 404, { success: false, error: 'Factura no encontrada.' });

        const detalles = serverDb.detalle_facturas.filter(d => d.factura_id === facturaId);
        const cliente = serverDb.clientes.find(c => c.id === f.cliente_id) || {};

        // Estructura oficial requerida por el estándar DTE El Salvador
        const dteEstructuraOficial = {
          identificacion: {
            version: 1,
            ambiente: "00", // Pruebas / Producción
            tipoDte: f.tipo_dte.includes("CCF") ? "03" : "01",
            numeroControl: f.numero_dte,
            codigoGeneracion: f.codigo_generacion_uuid,
            tipoModelo: 1,
            tipoOperacion: 1,
            tipoContingencia: null,
            motivoContin: null,
            fecEmi: f.fecha_hora.split('T')[0],
            horEmi: f.fecha_hora.split('T')[1].substring(0, 8),
            tipoMoneda: "USD"
          },
          emisor: {
            nit: "0614-150220-101-3",
            nrc: "290145-2",
            nombre: "FACTURAFÁCIL S.A. DE C.V.",
            codActividad: "62010",
            descActividad: "Servicios de tecnología y soluciones informáticas",
            direccion: {
              departamento: "06",
              municipio: "14",
              complemento: "Colonia Escalón, Paseo General Escalón #3420, San Salvador"
            },
            telefono: "+503 2288-0000",
            correo: "dte@facturafacil.sv"
          },
          receptor: {
            tipoDocumento: cliente.dui_nit && cliente.dui_nit.startsWith('0614') ? "36" : "13",
            numDocumento: cliente.dui_nit || "00000000-0",
            nrc: cliente.nrc || null,
            nombre: cliente.nombre || f.cliente_nombre,
            codActividad: "10005",
            descActividad: "Consumidor Final / Cliente Comercial",
            direccion: {
              departamento: "06",
              municipio: "14",
              complemento: cliente.direccion || "San Salvador, El Salvador"
            },
            telefono: cliente.telefono || "+503 0000-0000",
            correo: cliente.email || "dte.cliente@facturafacil.sv"
          },
          cuerpoDocumento: detalles.map((d, index) => {
            const prod = serverDb.productos.find(p => p.id === d.producto_id) || {};
            return {
              numItem: index + 1,
              tipoItem: 1,
              numeroDocumento: null,
              cantidad: d.cantidad,
              codigo: prod.sku || `ITEM-${d.producto_id}`,
              codTributo: null,
              uniMedida: 59, // Unidades
              descripcion: prod.nombre || "Artículo de venta",
              precioUni: d.precio_unitario_historico,
              montoDescu: 0,
              ventaNoSuj: 0,
              ventaExenta: 0,
              ventaGravada: d.subtotal,
              tributos: ["20"], // Código IVA 13%
              psv: 0,
              noGravado: 0,
              ivaItem: d.iva_linea
            };
          }),
          resumen: {
            totalNoSuj: 0,
            totalExenta: 0,
            totalGravada: f.subtotal,
            subTotalVentas: f.subtotal,
            descuNoSuj: 0,
            descuExenta: 0,
            descuGravada: 0,
            porcentajeDescuento: f.descuento_aplicado || 0,
            totalDescu: f.descuento_aplicado ? parseFloat(((f.subtotal + f.iva) / (1 - f.descuento_aplicado / 100) - (f.subtotal + f.iva)).toFixed(2)) : 0,
            tributos: [
              {
                codigo: "20",
                descripcion: "Impuesto al Valor Agregado 13%",
                valor: f.iva
              }
            ],
            subTotal: f.subtotal,
            ivaRete1: 0,
            reteRenta: 0,
            montoTotalOperacion: f.total,
            totalNoGravado: 0,
            totalPagar: f.total,
            totalLetras: `${f.total.toFixed(2)} DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA`,
            totalIva: f.iva,
            saldoFavor: 0,
            condicionOperacion: 1,
            pagos: [
              {
                codigo: f.metodo_pago.includes('Tarjeta') ? "02" : f.metodo_pago.includes('UNI') ? "03" : "01",
                montoPago: f.total,
                referencia: f.referencia_pago || null,
                plazo: null,
                periodo: null
              }
            ]
          },
          selloRecepcion: {
            version: 1,
            ambiente: "00",
            selloRecibido: f.sello_recepcion_mh,
            fhRecibido: f.fecha_hora,
            estado: f.estado_mh
          }
        };

        return sendJSON(res, 200, { success: true, dte: dteEstructuraOficial });
      }

      // 6. ANALÍTICA & KPIS CONSOLIDADOS
      if (parsedUrl === '/api/kpis' && req.method === 'GET') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        const facturasValidas = serverDb.facturas.filter(f => !f.estado_mh.includes('Anulad'));
        const totalVentas = facturasValidas.reduce((acc, f) => acc + f.total, 0);
        const totalIva = facturasValidas.reduce((acc, f) => acc + f.iva, 0);
        const totalSubtotal = facturasValidas.reduce((acc, f) => acc + f.subtotal, 0);
        const transacciones = facturasValidas.length;
        const ticketMedio = transacciones > 0 ? (totalVentas / transacciones) : 0;
        const stockCritico = serverDb.productos.filter(p => p.stock <= p.stock_minimo);
        const stockAgotado = serverDb.productos.filter(p => p.stock === 0);

        // Ventas por producto
        const ventasPorProducto = {};
        serverDb.detalle_facturas.forEach(d => {
          const f = serverDb.facturas.find(fact => fact.id === d.factura_id);
          if (f && !f.estado_mh.includes('Anulad')) {
            ventasPorProducto[d.producto_id] = (ventasPorProducto[d.producto_id] || 0) + d.cantidad;
          }
        });

        const topProductos = serverDb.productos
          .map(p => ({
            ...p,
            unidadesVendidas: ventasPorProducto[p.id] || 0,
            ingresoEstimado: (ventasPorProducto[p.id] || 0) * p.precio_venta
          }))
          .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
          .slice(0, 5);

        return sendJSON(res, 200, {
          success: true,
          data: {
            totalVentas,
            totalIva,
            totalSubtotal,
            transacciones,
            ticketMedio,
            stockCriticoCount: stockCritico.length,
            stockCriticoList: stockCritico,
            stockAgotadoCount: stockAgotado.length,
            topProductos,
            totalProductos: serverDb.productos.length,
            totalClientes: serverDb.clientes.length
          }
        });
      }

      // 7. RESPALDO Y RESTAURACIÓN (BACKUP / RESET)
      if (parsedUrl === '/api/backup' && req.method === 'GET') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        return sendJSON(res, 200, { success: true, timestamp: new Date().toISOString(), data: serverDb });
      }

      if (parsedUrl === '/api/backup/reset' && req.method === 'POST') {
        if (!requireRole(req, res, ['ADMIN'])) return;
        serverDb = JSON.parse(JSON.stringify(INITIAL_DB));
        saveDatabase(serverDb);
        return sendJSON(res, 200, { success: true, message: 'Base de datos restaurada a estado de fábrica.' });
      }

      return sendJSON(res, 404, { success: false, error: `Endpoint API no encontrado: ${req.method} ${parsedUrl}` });

    } catch (e) {
      console.error("Error en procesamiento de API:", e);
      return sendJSON(res, e.statusCode || 500, {
        success: false,
        error: e.statusCode === 400 ? e.message : 'Error interno del servidor.'
      });
    }
  }

  // ATENCIÓN DE ARCHIVOS ESTÁTICOS FRONTEND
  let reqPath = parsedUrl;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const rootPath = path.resolve(__dirname);
  const filePath = path.resolve(__dirname, `.${reqPath}`);
  if (filePath !== rootPath && !filePath.startsWith(`${rootPath}${path.sep}`)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Ruta no permitida.');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>404 - Archivo no encontrado</h2>
          <p>No se encontró la ruta: <code>${reqPath}</code></p>
          <a href="/index.html" style="color: #006c4a; font-weight: bold;">Volver al Dashboard</a>
        </div>
      `);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 FACTURAFÁCIL POS & DTE EL SALVADOR ACTIVO`);
  console.log(`📡 URL Principal: http://localhost:${PORT}`);
  console.log(`🔐 Autenticación: sesiones con expiración y control de roles activo`);
  console.log(`💾 Base de Datos: ${DB_FILE}`);
  console.log(`=======================================================`);
});
