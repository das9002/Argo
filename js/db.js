/**
 * FacturaFácil POS & Analytics - Motor de Base de Datos y Lógica de Negocio
 * Soporte Híbrido: API REST Backend + Fallback en localStorage
 * Modelo con Autenticación y Control de Acceso Basado en Roles (RBAC):
 * Roles:
 * - ADMIN: Acceso total (Dashboard, KPIs, Inventario, Clientes, Facturas, Gestión de Usuarios)
 * - CAJERO: Acceso a Terminal POS (Ventas Rápidas, Cobro, Emisión DTE)
 */

const STORAGE_KEY = 'factura_facil_db_v2';
const AUTH_KEY = 'factura_facil_auth_token';
const USER_KEY = 'factura_facil_active_user';
const TASA_IVA_SV = 0.13; // 13% IVA El Salvador

// Usuarios por defecto (Credenciales de Demostración)
const DEFAULT_USERS = [
  {
    id: 1,
    username: 'admin',
    password: '123',
    nombre_completo: 'Diego Siliezar',
    correo: 'diego.admin@facturafacil.sv',
    rol: 'ADMIN',
    rol_id: 1,
    cargo: 'ADMIN / Propietario',
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
    cargo: 'Cajero / Terminal POS #02',
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
];

const DEFAULT_PRODUCTOS = [
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
];

const DEFAULT_FACTURAS = [
  {
    id: 1,
    numero_dte: "DTE-01-M001-00000001",
    codigo_generacion_uuid: "D4C2B7E1-891A-4C4D-B552-9A3FE18C0142",
    sello_recepcion_mh: "2024E677F6702BB04481A01B73FE001428",
    fecha_hora: "2024-10-18T16:42:10",
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
    fecha_hora: "2024-10-18T16:38:52",
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
    this.data = this.loadDatabase();
    this.currentUser = this.loadActiveUser();
  }

  loadDatabase() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Error leyendo localStorage:", e);
    }
    const initial = {
      usuarios: DEFAULT_USERS,
      clientes: DEFAULT_CLIENTES,
      productos: DEFAULT_PRODUCTOS,
      facturas: DEFAULT_FACTURAS,
      detalle_facturas: DEFAULT_DETALLE_FACTURAS,
      lastDteSequence: 4928
    };
    this.saveDatabase(initial);
    return initial;
  }

  saveDatabase(dataToSave = null) {
    const d = dataToSave || this.data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      window.dispatchEvent(new CustomEvent('facturafacil_sync', { detail: { timestamp: Date.now() } }));
    } catch (e) {
      console.error("Error al persistir base de datos:", e);
    }
  }

  // --- AUTENTICACIÓN Y ROLES ---
  loadActiveUser() {
    try {
      const u = localStorage.getItem(USER_KEY);
      if (u) return JSON.parse(u);
    } catch (e) {}
    // Usuario por defecto si no hay sesión iniciada
    return DEFAULT_USERS[0]; // Admin
  }

  login(username, password) {
    const user = (this.data.usuarios || DEFAULT_USERS).find(
      u => u.username.toLowerCase() === (username || '').trim().toLowerCase() && u.password === password
    );

    if (!user) {
      return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }

    this.currentUser = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_KEY, `token_${user.username}_${Date.now()}`);

    window.dispatchEvent(new CustomEvent('facturafacil_auth_change', { detail: { user } }));
    return { success: true, user };
  }

  switchRole(roleName) {
    const targetUser = (this.data.usuarios || DEFAULT_USERS).find(u => u.rol === roleName) || DEFAULT_USERS[0];
    this.currentUser = targetUser;
    localStorage.setItem(USER_KEY, JSON.stringify(targetUser));
    window.dispatchEvent(new CustomEvent('facturafacil_auth_change', { detail: { user: targetUser } }));
    return targetUser;
  }

  logout() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_KEY);
    this.currentUser = DEFAULT_USERS[0];
    window.dispatchEvent(new CustomEvent('facturafacil_auth_change', { detail: { user: null } }));
    return true;
  }

  getCurrentUser() {
    return this.currentUser || DEFAULT_USERS[0];
  }

  getRole() {
    return (this.currentUser && this.currentUser.rol) ? this.currentUser.rol : 'ADMIN';
  }

  isAdmin() {
    return this.getRole() === 'ADMIN';
  }

  isCajero() {
    return this.getRole() === 'CAJERO';
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
      direccion: cliente.direccion || 'San Salvador',
      tipo_contribuyente: cliente.tipo_contribuyente || 'Consumidor Final',
      nrc: cliente.nrc || '',
      limite_credito: parseFloat(cliente.limite_credito) || 1000.00,
      saldo_pendiente: 0.00
    };
    this.data.clientes.unshift(nuevo);
    this.saveDatabase();
    return nuevo;
  }

  // --- PRODUCTOS ---
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
      sku: prod.sku || `SKU-${Date.now().toString().slice(-6)}`,
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
    return nuevo;
  }

  updateStock(productoId, cantidadADescontar) {
    const prod = this.getProductoById(productoId);
    if (!prod) return false;
    prod.stock = Math.max(0, prod.stock - cantidadADescontar);
    this.saveDatabase();
    return prod;
  }

  // --- FACTURACIÓN Y VENTAS (REGLAS DTE EL SALVADOR) ---
  createVenta({ clienteId, items, metodoPago, referenciaPago = '', tipoDte = 'Factura (01)' }) {
    if (!items || items.length === 0) {
      throw new Error("No hay artículos en el carrito para facturar.");
    }

    // 1. Verificar stock
    for (const item of items) {
      const prod = this.getProductoById(item.productoId);
      if (!prod) throw new Error(`Producto ID ${item.productoId} no encontrado.`);
      if (prod.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}`);
      }
    }

    // 2. Calcular desglose impositivo
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

    const subtotalGeneral = totalBruto / (1 + TASA_IVA_SV);
    const ivaGeneral = totalBruto - subtotalGeneral;

    // 3. Folio DTE
    this.data.lastDteSequence = (this.data.lastDteSequence || 4928) + 1;
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
      metodo_pago: metodoPago,
      referencia_pago: referenciaPago,
      estado_mh: "Transmitido con Éxito",
      cajero_responsable: this.currentUser ? this.currentUser.nombre_completo : 'Carlos Mendoza'
    };

    // 4. Descontar e insertar detalle
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

    return {
      factura: nuevaFactura,
      detalles: detalleProcesado,
      cliente
    };
  }

  getFacturas() {
    return this.data.facturas || [];
  }

  getFacturaById(id) {
    const f = this.getFacturas().find(fact => fact.id === parseInt(id));
    if (!f) return null;
    const detalles = (this.data.detalle_facturas || []).filter(d => d.factura_id === f.id);
    return {
      ...f,
      detalles
    };
  }

  // --- ANALÍTICA & KPIS ---
  getKPIs() {
    const facturas = this.getFacturas();
    const productos = this.getProductos();

    const totalVentas = facturas.reduce((acc, f) => acc + (f.total || 0), 0);
    const totalIva = facturas.reduce((acc, f) => acc + (f.iva || 0), 0);
    const cantidadTransacciones = facturas.length;
    const ticketPromedio = cantidadTransacciones > 0 ? (totalVentas / cantidadTransacciones) : 0;

    const stockCritico = productos.filter(p => p.stock <= p.stock_minimo);
    const stockAgotado = productos.filter(p => p.stock === 0);

    const ventasPorProducto = {};
    (this.data.detalle_facturas || []).forEach(d => {
      ventasPorProducto[d.producto_id] = (ventasPorProducto[d.producto_id] || 0) + d.cantidad;
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
      cantidadTransacciones,
      ticketPromedio,
      stockCriticoCount: stockCritico.length,
      stockCriticoList: stockCritico,
      stockAgotadoCount: stockAgotado.length,
      topProductos
    };
  }

  // Utilidades
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

// Instancia global
window.facturaDB = new FacturaFacilDB();
