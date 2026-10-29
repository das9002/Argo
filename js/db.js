/**
 * FACTURAFÁCIL POS & ANALYTICS - MOTOR DE BASE DE DATOS Y LÓGICA DE NEGOCIO
 * Arquitectura Dual Híbrida:
 * 1. Conexión directa y reactiva con Backend API REST (server.js en /api/...)
 * 2. Persistencia local offline en localStorage con sincronización entre pestañas
 *
 * Control de Acceso Basado en Roles (RBAC):
 * - ADMIN: Acceso total a reportes, analítica, KPIs, costos, márgenes, inventario, auditoría y anulación DTE.
 * - CAJERO: Operador de terminal POS (Ventas rápidas, escaneo, emisión DTE, cobro multimoneda).
 */

const STORAGE_KEY = 'factura_facil_db_v2';
const AUTH_KEY = 'factura_facil_auth_token';
const USER_KEY = 'factura_facil_active_user';
const TASA_IVA_SV = 0.13; // 13% IVA Legal El Salvador

// Usuarios Semilla Demo
const DEFAULT_USERS = [
  {
    id: 1,
    username: 'admin',
    password: '123',
    nombre_completo: 'Diego Siliezar',
    correo: 'diego.admin@facturafacil.sv',
    rol: 'ADMIN',
    rol_id: 1,
    cargo: 'Administrador General / Propietario',
    sucursal: 'Sucursal Escalón - San Salvador'
  },
  {
    id: 2,
    username: 'cajero',
    password: '123',
    nombre_completo: 'Carlos Mendoza',
    correo: 'carlos.mendoza@facturafacil.sv',
    rol: 'CAJERO',
    rol_id: 2,
    cargo: 'Cajero Principal / Terminal POS #02',
    sucursal: 'Sucursal Escalón - San Salvador'
  }
];

const DEFAULT_CLIENTES = [
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
];

const DEFAULT_PRODUCTOS = [
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
];

const DEFAULT_FACTURAS = [
  {
    id: 1,
    numero_dte: "DTE-01-M001-00004928",
    codigo_generacion_uuid: "D4C2B7E1-891A-4C4D-B552-9A3FE18C0142",
    sello_recepcion_mh: "2024E677F6702BB04481A01B73FE001428",
    fecha_hora: new Date(Date.now() - 3600000 * 2).toISOString(),
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
    fecha_hora: new Date(Date.now() - 1800000).toISOString(),
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
];

const DEFAULT_DETALLE_FACTURAS = [
  { id: 1, factura_id: 1, producto_id: 1, cantidad: 1, precio_unitario_historico: 650.00, subtotal: 575.22, iva_linea: 74.78 },
  { id: 2, factura_id: 1, producto_id: 2, cantidad: 2, precio_unitario_historico: 25.00, subtotal: 44.25, iva_linea: 5.75 },
  { id: 3, factura_id: 2, producto_id: 3, cantidad: 2, precio_unitario_historico: 185.00, subtotal: 327.43, iva_linea: 42.57 }
];

class FacturaFacilDB {
  constructor() {
    this.apiAvailable = false;
    this.apiUrl = window.location.protocol.startsWith('http') ? '' : 'http://localhost:3000';
    this.data = this.loadDatabase();
    this.currentUser = this.loadActiveUser();

    // Intentar sincronizar con el backend de inmediato si estamos en ambiente web
    this.initApiSync();
  }

  loadDatabase() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.productos && parsed.productos.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Aviso: usando base de datos por defecto:", e);
    }

    const initial = {
      usuarios: DEFAULT_USERS,
      clientes: DEFAULT_CLIENTES,
      productos: DEFAULT_PRODUCTOS,
      facturas: DEFAULT_FACTURAS,
      detalle_facturas: DEFAULT_DETALLE_FACTURAS,
      lastDteSequence: 4929
    };
    this.saveDatabase(initial, false);
    return initial;
  }

  saveDatabase(dataToSave = null, emitEvent = true) {
    const d = dataToSave || this.data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      if (emitEvent) {
        window.dispatchEvent(new CustomEvent('facturafacil_sync', { detail: { timestamp: Date.now() } }));
      }
    } catch (e) {
      console.error("Error al persistir base de datos:", e);
    }
  }

  apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem(AUTH_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(url, { ...options, headers });
  }

  // --- SINCRONIZACIÓN CON BACKEND (server.js API REST) ---
  async initApiSync() {
    if (!localStorage.getItem(AUTH_KEY)) return;
    try {
      const res = await this.apiFetch(`${this.apiUrl}/api/kpis`, { method: 'GET' });
      if (res.ok) {
        this.apiAvailable = true;
        // Cargar datos frescos del backend
        await this.syncFromBackend();
      }
    } catch (e) {
      this.apiAvailable = false;
    }
  }

  async syncFromBackend() {
    try {
      const [prodsRes, clientsRes, invoicesRes] = await Promise.all([
        this.apiFetch(`${this.apiUrl}/api/productos`),
        this.apiFetch(`${this.apiUrl}/api/clientes`),
        this.apiFetch(`${this.apiUrl}/api/facturas`)
      ]);

      if (prodsRes.ok && clientsRes.ok && invoicesRes.ok) {
        const prods = await prodsRes.json();
        const clients = await clientsRes.json();
        const invoices = await invoicesRes.json();

        if (prods.data) this.data.productos = prods.data;
        if (clients.data) this.data.clientes = clients.data;
        if (invoices.data) this.data.facturas = invoices.data;

        this.saveDatabase(this.data, true);
      }
    } catch (e) {
      console.warn("Aviso: no se pudo sincronizar con backend remoto, operando localmente:", e.message);
    }
  }

  // --- AUTENTICACIÓN Y ROLES (RBAC) ---
  loadActiveUser() {
    try {
      const u = localStorage.getItem(USER_KEY);
      if (u) return JSON.parse(u);
    } catch (e) {}
    return null;
  }

  async login(username, password) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = password || '';

    if (!/^[a-z0-9._-]{3,40}$/.test(cleanUser) || cleanPass.length < 3 || cleanPass.length > 128) {
      return { success: false, error: 'Usuario o contraseña con formato inválido.' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      const result = await response.json();
      if (!response.ok || !result.success) return { success: false, error: result.error || 'No se pudo iniciar sesión.' };
      this.apiAvailable = true;
      this.currentUser = result.user;
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      localStorage.setItem(AUTH_KEY, result.token);
      await this.syncFromBackend();
      window.dispatchEvent(new CustomEvent('facturafacil_auth_change', { detail: { user: result.user } }));
      return result;
    } catch (error) {
      if (window.location.protocol.startsWith('http')) {
        return { success: false, error: 'No se pudo conectar con el servidor de autenticación.' };
      }
    }

    const user = (this.data.usuarios || DEFAULT_USERS).find(
      u => u.username.toLowerCase() === cleanUser &&
           u.password === cleanPass && u.activo !== false
    );

    if (!user) {
      return { success: false, error: 'Usuario o contraseña incorrectos. Usa admin/123 o cajero/123.' };
    }

    this.currentUser = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(AUTH_KEY);

    window.dispatchEvent(new CustomEvent('facturafacil_auth_change', { detail: { user } }));
    return { success: true, user };
  }

  logout() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_KEY);
    this.currentUser = null;
    if (this.apiAvailable) {
      this.apiFetch(`${this.apiUrl}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('facturafacil_auth_change', { detail: { user: null } }));
    return true;
  }

  getCurrentUser() {
    if (this.currentUser === undefined || this.currentUser === null) {
      this.currentUser = this.loadActiveUser();
    }
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.getCurrentUser();
  }

  getRole() {
    const user = this.getCurrentUser();
    return (user && user.rol) ? user.rol : null;
  }

  isAdmin() {
    return this.getRole() === 'ADMIN';
  }

  isCajero() {
    return this.getRole() === 'CAJERO';
  }

  // --- PRODUCTOS & INVENTARIO ---
  getProductos() {
    return this.data.productos || [];
  }

  getProductoById(id) {
    return this.getProductos().find(p => p.id === parseInt(id));
  }

  addProducto(prod) {
    const newId = (this.data.productos.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1;
    const costo = parseFloat(prod.precio_costo) || 0;
    const margen = parseFloat(prod.margen_ganancia) || 30;
    const precioBase = costo * (1 + margen / 100);
    const precioVenta = prod.precio_venta ? parseFloat(prod.precio_venta) : precioBase * (1 + TASA_IVA_SV);

    const nuevo = {
      id: newId,
      sku: prod.sku ? prod.sku.trim().toUpperCase() : `SKU-${Date.now().toString().slice(-6)}`,
      codigo_barra: prod.codigo_barra || `750100${Date.now().toString().slice(-7)}`,
      nombre: prod.nombre || 'Producto Nuevo',
      categoria: prod.categoria || 'General',
      precio_costo: costo,
      margen_ganancia: margen,
      precio_venta: parseFloat(precioVenta.toFixed(2)),
      stock: parseInt(prod.stock) || 0,
      stock_minimo: parseInt(prod.stock_minimo) || 5,
      imagen_url: prod.imagen_url || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80'
    };

    this.data.productos.unshift(nuevo);
    this.saveDatabase();

    // Sincronizar con API si está disponible
    if (this.apiAvailable) {
      this.apiFetch(`${this.apiUrl}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo)
      }).catch(() => {});
    }

    return nuevo;
  }

  restockProducto(productoId, cantidad) {
    const prod = this.getProductoById(productoId);
    if (!prod) return false;
    prod.stock += cantidad;
    this.saveDatabase();

    if (this.apiAvailable) {
      this.apiFetch(`${this.apiUrl}/api/productos/${productoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restockCantidad: cantidad })
      }).catch(() => {});
    }

    return prod;
  }

  updateStock(productoId, cantidadADescontar) {
    const prod = this.getProductoById(productoId);
    if (!prod) return false;
    prod.stock = Math.max(0, prod.stock - cantidadADescontar);
    this.saveDatabase();
    return prod;
  }

  // --- CLIENTES ---
  getClientes() {
    return this.data.clientes || [];
  }

  getClienteById(id) {
    return this.getClientes().find(c => c.id === parseInt(id));
  }

  addCliente(cliente) {
    const newId = (this.data.clientes.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1;
    const nuevo = {
      id: newId,
      dui_nit: cliente.dui_nit || cliente.documento_fiscal || '00000000-0',
      nombre: cliente.nombre || cliente.nombre_completo || 'Nuevo Cliente',
      telefono: cliente.telefono || '',
      email: cliente.email || cliente.correo_electronico || '',
      direccion: cliente.direccion || 'San Salvador, El Salvador',
      tipo_contribuyente: cliente.tipo_contribuyente || 'Consumidor Final',
      nrc: cliente.nrc || '',
      limite_credito: parseFloat(cliente.limite_credito) || 1000.00,
      saldo_pendiente: 0.00
    };

    this.data.clientes.unshift(nuevo);
    this.saveDatabase();

    if (this.apiAvailable) {
      this.apiFetch(`${this.apiUrl}/api/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo)
      }).catch(() => {});
    }

    return nuevo;
  }

  // --- FACTURACIÓN Y EMISIÓN DTE (MINISTERIO DE HACIENDA) ---
  createVenta({ clienteId, items, metodoPago, referenciaPago = '', tipoDte = 'Factura (01)', descuentoPorcentaje = 0 }) {
    if (!items || items.length === 0) {
      throw new Error("No hay artículos en el carrito para facturar.");
    }

    // 1. Verificación atómica de stock
    for (const item of items) {
      const prod = this.getProductoById(item.productoId);
      if (!prod) throw new Error(`Producto ID ${item.productoId} no encontrado.`);
      if (prod.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}`);
      }
    }

    // 2. Desglose impositivo con IVA legal de El Salvador (13%)
    let totalBruto = 0;
    const detalleProcesado = [];

    items.forEach(item => {
      const prod = this.getProductoById(item.productoId);
      const precioUnitarioConIva = prod.precio_venta;
      const subtotalItemConIva = precioUnitarioConIva * item.cantidad;
      totalBruto += subtotalItemConIva;

      const subtotalNetoItem = subtotalItemConIva / (1 + TASA_IVA_SV);
      const ivaItem = subtotalItemConIva - subtotalNetoItem;

      detalleProcesado.push({
        producto_id: prod.id,
        nombre: prod.nombre,
        sku: prod.sku,
        cantidad: item.cantidad,
        precio_unitario_historico: parseFloat(precioUnitarioConIva.toFixed(2)),
        subtotal: parseFloat(subtotalNetoItem.toFixed(2)),
        iva_linea: parseFloat(ivaItem.toFixed(2))
      });
    });

    // Descuento comercial si se aplicó
    const descPct = parseFloat(descuentoPorcentaje) || 0;
    if (descPct > 0) {
      totalBruto = totalBruto * (1 - descPct / 100);
    }

    const subtotalGeneral = totalBruto / (1 + TASA_IVA_SV);
    const ivaGeneral = totalBruto - subtotalGeneral;

    // 3. Generación de Metadatos DTE Oficiales
    this.data.lastDteSequence = (this.data.lastDteSequence || 4929) + 1;
    const correlativo = String(this.data.lastDteSequence).padStart(8, '0');
    const numeroDte = `DTE-01-M001-${correlativo}`;
    const codigoGeneracionUUID = this.generateUUID();
    const selloRecepcionMH = `${new Date().getFullYear()}SV${this.generateRandomHex(28).toUpperCase()}`;

    const cliente = this.getClienteById(clienteId) || this.getClienteById(4); // Default Mostrador
    const nuevaFacturaId = (this.data.facturas.reduce((max, f) => Math.max(max, f.id), 0) || 0) + 1;

    const nuevaFactura = {
      id: nuevaFacturaId,
      numero_dte: numeroDte,
      codigo_generacion_uuid: codigoGeneracionUUID,
      sello_recepcion_mh: selloRecepcionMH,
      fecha_hora: new Date().toISOString(),
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_doc: cliente.dui_nit,
      tipo_dte: tipoDte,
      subtotal: parseFloat(subtotalGeneral.toFixed(2)),
      iva: parseFloat(ivaGeneral.toFixed(2)),
      total: parseFloat(totalBruto.toFixed(2)),
      descuento_aplicado: descPct,
      metodo_pago: metodoPago,
      referencia_pago: referenciaPago,
      estado_mh: "Transmitido con Éxito",
      cajero_responsable: this.currentUser ? this.currentUser.nombre_completo : 'Carlos Mendoza'
    };

    // 4. Descontar inventario y registrar renglones históricos
    let detalleMaxId = (this.data.detalle_facturas.reduce((max, d) => Math.max(max, d.id), 0) || 0);

    detalleProcesado.forEach(det => {
      detalleMaxId++;
      this.data.detalle_facturas.push({
        id: detalleMaxId,
        factura_id: nuevaFacturaId,
        producto_id: det.producto_id,
        cantidad: det.cantidad,
        precio_unitario_historico: det.precio_unitario_historico,
        subtotal: det.subtotal,
        iva_linea: det.iva_linea
      });
      this.updateStock(det.producto_id, det.cantidad);
    });

    this.data.facturas.unshift(nuevaFactura);
    this.saveDatabase();

    // Sincronizar en background con backend
    if (this.apiAvailable) {
      this.apiFetch(`${this.apiUrl}/api/facturas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cliente.id,
          items,
          metodoPago,
          referenciaPago,
          tipoDte,
          cajero: nuevaFactura.cajero_responsable,
          descuentoPorcentaje: descPct
        })
      }).catch(() => {});
    }

    return {
      factura: nuevaFactura,
      detalles: detalleProcesado,
      cliente
    };
  }

  // --- ANULACIÓN FISCAL DE DTE (REVIERTE STOCK) ---
  anularFactura(facturaId) {
    const f = this.data.facturas.find(fact => fact.id === parseInt(facturaId));
    if (!f) throw new Error("Factura no encontrada.");
    if (f.estado_mh.includes("Anulad")) throw new Error("Esta factura ya fue previamente anulada.");

    // Restituir inventario
    const detalles = (this.data.detalle_facturas || []).filter(d => d.factura_id === f.id);
    detalles.forEach(d => {
      const prod = this.getProductoById(d.producto_id);
      if (prod) {
        prod.stock += d.cantidad;
      }
    });

    f.estado_mh = "Anulada ante MH";
    f.fecha_anulacion = new Date().toISOString();
    this.saveDatabase();

    if (this.apiAvailable) {
      this.apiFetch(`${this.apiUrl}/api/facturas/${facturaId}/anular`, { method: 'POST' }).catch(() => {});
    }

    return {
      factura: f,
      articulosRestituidos: detalles.length
    };
  }

  getFacturas() {
    return this.data.facturas || [];
  }

  getFacturaById(id) {
    const f = this.getFacturas().find(fact => fact.id === parseInt(id));
    if (!f) return null;
    const detalles = (this.data.detalle_facturas || []).filter(d => d.factura_id === f.id);
    return { ...f, detalles };
  }

  // --- ANALÍTICA & KPIS ---
  getKPIs() {
    const facturas = this.getFacturas().filter(f => !f.estado_mh.includes('Anulad'));
    const productos = this.getProductos();

    const totalVentas = facturas.reduce((acc, f) => acc + (f.total || 0), 0);
    const totalIva = facturas.reduce((acc, f) => acc + (f.iva || 0), 0);
    const totalSubtotal = facturas.reduce((acc, f) => acc + (f.subtotal || 0), 0);
    const cantidadTransacciones = facturas.length;
    const ticketPromedio = cantidadTransacciones > 0 ? (totalVentas / cantidadTransacciones) : 0;

    const stockCritico = productos.filter(p => p.stock <= p.stock_minimo);
    const stockAgotado = productos.filter(p => p.stock === 0);

    const ventasPorProducto = {};
    (this.data.detalle_facturas || []).forEach(d => {
      const parentFact = this.data.facturas.find(fact => fact.id === d.factura_id);
      if (parentFact && !parentFact.estado_mh.includes('Anulad')) {
        ventasPorProducto[d.producto_id] = (ventasPorProducto[d.producto_id] || 0) + d.cantidad;
      }
    });

    const topProductos = productos
      .map(p => ({
        ...p,
        unidadesVendidas: ventasPorProducto[p.id] || 0,
        ingresoEstimado: (ventasPorProducto[p.id] || 0) * p.precio_venta
      }))
      .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
      .slice(0, 5);

    return {
      totalVentas,
      totalIva,
      totalSubtotal,
      cantidadTransacciones,
      ticketPromedio,
      stockCriticoCount: stockCritico.length,
      stockCriticoList: stockCritico,
      stockAgotadoCount: stockAgotado.length,
      topProductos
    };
  }

  // --- EXPORTACIÓN OFICIAL DTE JSON (MINISTERIO DE HACIENDA) ---
  getDteJson(facturaId) {
    const f = this.getFacturaById(facturaId);
    if (!f) return null;
    const cliente = this.getClienteById(f.cliente_id) || {};

    return {
      identificacion: {
        version: 1,
        ambiente: "00",
        tipoDte: f.tipo_dte.includes("CCF") ? "03" : "01",
        numeroControl: f.numero_dte,
        codigoGeneracion: f.codigo_generacion_uuid,
        tipoModelo: 1,
        tipoOperacion: 1,
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
        direccion: "Colonia Escalón, San Salvador",
        telefono: "+503 2288-0000",
        correo: "dte@facturafacil.sv"
      },
      receptor: {
        numDocumento: cliente.dui_nit || "00000000-0",
        nrc: cliente.nrc || null,
        nombre: cliente.nombre || f.cliente_nombre,
        direccion: cliente.direccion || "San Salvador, El Salvador",
        correo: cliente.email || "dte.receptor@facturafacil.sv"
      },
      cuerpoDocumento: f.detalles.map((d, index) => {
        const prod = this.getProductoById(d.producto_id) || {};
        return {
          numItem: index + 1,
          cantidad: d.cantidad,
          codigo: prod.sku || `ITEM-${d.producto_id}`,
          descripcion: prod.nombre || "Artículo",
          precioUni: d.precio_unitario_historico,
          ventaGravada: d.subtotal,
          ivaItem: d.iva_linea
        };
      }),
      resumen: {
        subTotalVentas: f.subtotal,
        totalGravada: f.subtotal,
        iva: f.iva,
        totalPagar: f.total,
        totalLetras: `${f.total.toFixed(2)} DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA`
      },
      selloRecepcion: {
        selloRecibido: f.sello_recepcion_mh,
        fhRecibido: f.fecha_hora,
        estado: f.estado_mh
      }
    };
  }

  // --- EXPORTACIÓN A CSV DE LIBRO DE VENTAS FISCAL (F-07) ---
  exportLibroVentasCSV() {
    const facturas = this.getFacturas();
    let csv = "ID,Numero DTE,Codigo UUID Generacion,Fecha Emision,Cliente,DUI / NIT,Tipo DTE,Subtotal Gravado,IVA 13%,Total Pagar,Metodo Pago,Estado Hacienda,Cajero\n";

    facturas.forEach(f => {
      csv += `"${f.id}","${f.numero_dte}","${f.codigo_generacion_uuid}","${f.fecha_hora}","${f.cliente_nombre.replace(/"/g, '""')}","${f.cliente_doc}","${f.tipo_dte}",${f.subtotal.toFixed(2)},${f.iva.toFixed(2)},${f.total.toFixed(2)},"${f.metodo_pago}","${f.estado_mh}","${f.cajero_responsable}"\n`;
    });

    this.downloadFile(csv, `Libro_Ventas_DTE_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  }

  // --- EXPORTACIÓN A CSV DE INVENTARIO VALORIZADO ---
  exportInventarioCSV() {
    const productos = this.getProductos();
    let csv = "ID,SKU,Codigo de Barra,Nombre,Categoria,Precio Costo,Margen %,Precio Venta IVA Inc,Stock Actual,Stock Minimo,Valor Total Costo,Valor Total Venta\n";

    productos.forEach(p => {
      const valCosto = p.stock * p.precio_costo;
      const valVenta = p.stock * p.precio_venta;
      csv += `"${p.id}","${p.sku}","${p.codigo_barra || ''}","${p.nombre.replace(/"/g, '""')}","${p.categoria}",${p.precio_costo.toFixed(2)},${p.margen_ganancia.toFixed(2)},${p.precio_venta.toFixed(2)},${p.stock},${p.stock_minimo},${valCosto.toFixed(2)},${valVenta.toFixed(2)}\n`;
    });

    this.downloadFile(csv, `Inventario_Valorizado_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  }

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  // --- EFECTOS DE SONIDO SINTETIZADOS (WEB AUDIO API - RETAIL SOUNDS) ---
  playBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, audioCtx.currentTime); // 1850Hz Beep de Escáner Láser
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  }

  playCashChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Doble campana de cobro exitoso
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.07);
        osc.stop(audioCtx.currentTime + i * 0.07 + 0.25);
      });
    } catch (e) {}
  }

  playError() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  }

  // --- GENERADORES AUXILIARES ---
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }

  generateRandomHex(length) {
    let result = '';
    const chars = '0123456789ABCDEF';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Instancia global disponible en todo el proyecto
window.facturaDB = new FacturaFacilDB();
