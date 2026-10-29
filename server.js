const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Base de Datos en Memoria del Servidor (Simulación relacional con Persistencia en Disco / API REST)
const DB_FILE = path.join(__dirname, 'database', 'server_db.json');

const INITIAL_DB = {
  roles: [
    { id: 1, nombre_rol: 'ADMIN', descripcion: 'Administrador general del sistema con acceso total' },
    { id: 2, nombre_rol: 'CAJERO', descripcion: 'Operador de terminal POS para emisión de ventas y DTE' }
  ],
  usuarios: [
    {
      id: 1,
      username: 'admin',
      password: '123', // En producción sería bcrypt hash
      nombre_completo: 'Diego Siliezar',
      correo: 'diego.admin@facturafacil.sv',
      rol: 'ADMIN',
      rol_id: 1,
      activo: true
    },
    {
      id: 2,
      username: 'cajero',
      password: '123',
      nombre_completo: 'Carlos Mendoza',
      correo: 'carlos.mendoza@facturafacil.sv',
      rol: 'CAJERO',
      rol_id: 2,
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
      direccion: "Colonia Escalón, San Salvador"
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
      direccion: "Santa Tecla, La Libertad"
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
      nombre: "Laptop Dell Inspiron 15",
      categoria: "Computación",
      precio_costo: 500.00,
      margen_ganancia: 30,
      precio_venta: 650.00,
      stock: 15,
      stock_minimo: 3,
      imagen_url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 2,
      sku: "MOU-LOGI-W",
      nombre: "Mouse Inalámbrico Logitech",
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
      nombre: "Monitor ASUS 24 Pulgadas FHD",
      categoria: "Monitores",
      precio_costo: 130.00,
      margen_ganancia: 42.3,
      precio_venta: 185.00,
      stock: 20,
      stock_minimo: 5,
      imagen_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80"
    },
    {
      id: 4,
      sku: "TEC-MEC-RGB",
      nombre: "Teclado Mecánico RGB",
      categoria: "Accesorios",
      precio_costo: 28.00,
      margen_ganancia: 60.7,
      precio_venta: 45.00,
      stock: 30,
      stock_minimo: 8,
      imagen_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80"
    }
  ],
  facturas: [
    {
      id: 1,
      numero_dte: "DTE-01-M001-00000001",
      codigo_generacion_uuid: "D4C2B7E1-891A-4C4D-B552-9A3FE18C0142",
      sello_recepcion_mh: "2024E677F6702BB04481A01B73FE001428",
      fecha_hora: new Date().toISOString(),
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
      numero_dte: "DTE-01-M001-00000002",
      codigo_generacion_uuid: "9B1F223A-C450-4F21-95E0-880F12AA5591",
      sello_recepcion_mh: "2024B119C9031EA19208B12C88FF119201",
      fecha_hora: new Date().toISOString(),
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
  sessions: {}
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Error al cargar la base de datos del servidor:", e);
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
    console.error("Error al guardar en disco la base de datos:", e);
  }
}

let serverDb = loadDatabase();

// Helper para respuestas JSON
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

// Handler de cuerpo de la petición (BODY)
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Manejo de CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  const parsedUrl = req.url.split('?')[0];

  // API ROUTER (/api/...)
  if (parsedUrl.startsWith('/api/')) {
    try {
      // 1. AUTH API
      if (parsedUrl === '/api/auth/login' && req.method === 'POST') {
        const { username, password } = await parseRequestBody(req);
        const user = serverDb.usuarios.find(u => u.username.toLowerCase() === (username || '').toLowerCase() && u.password === password);

        if (!user) {
          return sendJSON(res, 401, { success: false, error: 'Usuario o contraseña incorrectos.' });
        }

        const token = `token_${user.username}_${Date.now()}`;
        serverDb.sessions[token] = {
          user_id: user.id,
          username: user.username,
          rol: user.rol,
          created_at: new Date().toISOString()
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
            rol_id: user.rol_id
          }
        });
      }

      if (parsedUrl === '/api/auth/me' && req.method === 'GET') {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        const session = serverDb.sessions[token];

        if (!session) {
          return sendJSON(res, 401, { success: false, error: 'Sesión no válida o expirada.' });
        }

        const user = serverDb.usuarios.find(u => u.id === session.user_id);
        if (!user) {
          return sendJSON(res, 404, { success: false, error: 'Usuario no encontrado.' });
        }

        return sendJSON(res, 200, {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            nombre_completo: user.nombre_completo,
            correo: user.correo,
            rol: user.rol,
            rol_id: user.rol_id
          }
        });
      }

      if (parsedUrl === '/api/auth/logout' && req.method === 'POST') {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        if (token && serverDb.sessions[token]) {
          delete serverDb.sessions[token];
          saveDatabase(serverDb);
        }
        return sendJSON(res, 200, { success: true, message: 'Sesión cerrada correctamente.' });
      }

      // 2. PRODUCTOS API
      if (parsedUrl === '/api/productos' && req.method === 'GET') {
        return sendJSON(res, 200, { success: true, data: serverDb.productos });
      }

      if (parsedUrl === '/api/productos' && req.method === 'POST') {
        const prodData = await parseRequestBody(req);
        const newId = (serverDb.productos.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1;
        const nuevo = {
          id: newId,
          sku: prodData.sku || `SKU-${Date.now().toString().slice(-6)}`,
          nombre: prodData.nombre || 'Producto Nuevo',
          categoria: prodData.categoria || 'General',
          precio_costo: parseFloat(prodData.precio_costo) || 0,
          margen_ganancia: parseFloat(prodData.margen_ganancia) || 25,
          precio_venta: parseFloat(prodData.precio_venta) || 10.00,
          stock: parseInt(prodData.stock) || 0,
          stock_minimo: parseInt(prodData.stock_minimo) || 5,
          imagen_url: prodData.imagen_url || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80'
        };
        serverDb.productos.unshift(nuevo);
        saveDatabase(serverDb);
        return sendJSON(res, 201, { success: true, data: nuevo });
      }

      // 3. CLIENTES API
      if (parsedUrl === '/api/clientes' && req.method === 'GET') {
        return sendJSON(res, 200, { success: true, data: serverDb.clientes });
      }

      if (parsedUrl === '/api/clientes' && req.method === 'POST') {
        const clientData = await parseRequestBody(req);
        const newId = (serverDb.clientes.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1;
        const nuevo = {
          id: newId,
          nombre: clientData.nombre || clientData.nombre_completo || 'Nuevo Cliente',
          dui_nit: clientData.dui_nit || clientData.documento_fiscal || '00000000-0',
          email: clientData.email || clientData.correo_electronico || '',
          telefono: clientData.telefono || '',
          tipo_contribuyente: clientData.tipo_contribuyente || 'Consumidor Final',
          nrc: clientData.nrc || '',
          limite_credito: parseFloat(clientData.limite_credito) || 1000.00,
          saldo_pendiente: 0.00,
          direccion: clientData.direccion || 'San Salvador, El Salvador'
        };
        serverDb.clientes.unshift(nuevo);
        saveDatabase(serverDb);
        return sendJSON(res, 201, { success: true, data: nuevo });
      }

      // 4. FACTURAS API (VENTAS POS)
      if (parsedUrl === '/api/facturas' && req.method === 'GET') {
        return sendJSON(res, 200, { success: true, data: serverDb.facturas });
      }

      if (parsedUrl === '/api/facturas' && req.method === 'POST') {
        const body = await parseRequestBody(req);
        const { clienteId, items, metodoPago, referenciaPago, tipoDte, cajero } = body;

        if (!items || items.length === 0) {
          return sendJSON(res, 400, { success: false, error: 'Debe incluir productos en el detalle de la factura.' });
        }

        // Verificar stock y descontar
        let totalBruto = 0;
        const detalleProcesado = [];

        for (const item of items) {
          const prod = serverDb.productos.find(p => p.id === parseInt(item.productoId));
          if (!prod) {
            return sendJSON(res, 400, { success: false, error: `Producto ID ${item.productoId} no encontrado.` });
          }
          if (prod.stock < item.cantidad) {
            return sendJSON(res, 400, { success: false, error: `Stock insuficiente para ${prod.nombre}. Stock actual: ${prod.stock}` });
          }

          const precioVenta = prod.precio_venta;
          const totalLinea = precioVenta * item.cantidad;
          totalBruto += totalLinea;

          const subtotalLinea = totalLinea / 1.13;
          const ivaLinea = totalLinea - subtotalLinea;

          detalleProcesado.push({
            producto_id: prod.id,
            nombre: prod.nombre,
            cantidad: item.cantidad,
            precio_unitario_historico: precioVenta,
            subtotal: parseFloat(subtotalLinea.toFixed(2)),
            iva_linea: parseFloat(ivaLinea.toFixed(2))
          });

          // Descontar inventario
          prod.stock -= item.cantidad;
        }

        const subtotalGeneral = totalBruto / 1.13;
        const ivaGeneral = totalBruto - subtotalGeneral;

        const cliente = serverDb.clientes.find(c => c.id === parseInt(clienteId)) || serverDb.clientes[3];
        const newFacturaId = (serverDb.facturas.reduce((max, f) => Math.max(max, f.id), 0) || 0) + 1;
        const folioStr = String(4928 + newFacturaId).padStart(8, '0');

        const nuevaFactura = {
          id: newFacturaId,
          numero_dte: `DTE-01-M001-${folioStr}`,
          codigo_generacion_uuid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
          }),
          sello_recepcion_mh: `${new Date().getFullYear()}SV${Math.random().toString(16).slice(2, 30).toUpperCase()}`,
          fecha_hora: new Date().toISOString(),
          cliente_id: cliente.id,
          cliente_nombre: cliente.nombre,
          cliente_doc: cliente.dui_nit,
          tipo_dte: tipoDte || 'Factura (01)',
          subtotal: parseFloat(subtotalGeneral.toFixed(2)),
          iva: parseFloat(ivaGeneral.toFixed(2)),
          total: parseFloat(totalBruto.toFixed(2)),
          metodo_pago: metodoPago || 'Efectivo',
          referencia_pago: referenciaPago || '',
          estado_mh: "Transmitido con Éxito",
          cajero_responsable: cajero || "Carlos Mendoza"
        };

        // Insertar en detalle
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

      // 5. KPIS Y ANALÍTICA API
      if (parsedUrl === '/api/kpis' && req.method === 'GET') {
        const totalVentas = serverDb.facturas.reduce((acc, f) => acc + f.total, 0);
        const totalIva = serverDb.facturas.reduce((acc, f) => acc + f.iva, 0);
        const transacciones = serverDb.facturas.length;
        const ticketMedio = transacciones > 0 ? (totalVentas / transacciones) : 0;
        const stockCritico = serverDb.productos.filter(p => p.stock <= p.stock_minimo);

        return sendJSON(res, 200, {
          success: true,
          data: {
            totalVentas,
            totalIva,
            transacciones,
            ticketMedio,
            stockCriticoCount: stockCritico.length,
            totalProductos: serverDb.productos.length,
            totalClientes: serverDb.clientes.length
          }
        });
      }

      // 6. USUARIOS API
      if (parsedUrl === '/api/usuarios' && req.method === 'GET') {
        const safeUsers = serverDb.usuarios.map(u => ({
          id: u.id,
          username: u.username,
          nombre_completo: u.nombre_completo,
          correo: u.correo,
          rol: u.rol,
          activo: u.activo
        }));
        return sendJSON(res, 200, { success: true, data: safeUsers });
      }

      return sendJSON(res, 404, { success: false, error: 'Endpoint API no encontrado.' });

    } catch (e) {
      console.error("Error procesando solicitud API:", e);
      return sendJSON(res, 500, { success: false, error: e.message });
    }
  }

  // ATENCIÓN DE ARCHIVOS ESTÁTICOS
  let reqPath = parsedUrl;
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 No Encontrado - FacturaFácil POS');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Servidor FacturaFácil POS & Analytics Activo`);
  console.log(`📡 URL Principal: http://localhost:${PORT}`);
  console.log(`🔑 Login Demo: Admin (admin / 123) | Cajero (cajero / 123)`);
  console.log(`=======================================================`);
});
