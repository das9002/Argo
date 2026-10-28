/**
 * FacturaFácil POS & Analytics - Motor de Base de Datos y Lógica de Negocio
 * Simulación relacional en cliente con persistencia en localStorage
 * Modelo de 4 tablas maestras (Oracle SQL schema):
 * 1. clientes
 * 2. productos
 * 3. facturas
 * 4. detalle_facturas
 */

const STORAGE_KEY = 'factura_facil_db_v1';
const TASA_IVA_SV = 0.13; // 13% IVA El Salvador

// Datos iniciales de demostración contextualizados a El Salvador
const DEFAULT_CLIENTES = [
  {
    id: 1,
    dui_nit: "0614-230910-102-1",
    nombre: "Distribuidora Cuscatlán S.A. de C.V.",
    telefono: "+503 2257-8900",
    email: "contacto@cuscatlandist.com.sv",
    direccion: "Alameda Roosevelt #234, San Salvador",
    tipo_contribuyente: "Crédito Fiscal (CCF)",
    nrc: "238910-4",
    limite_credito: 10000.00,
    saldo_pendiente: 1420.00
  },
  {
    id: 2,
    dui_nit: "04981123-9",
    nombre: "Roberto Carlos Morales",
    telefono: "+503 7812-4490",
    email: "roberto.morales@gmail.com",
    direccion: "Colonia Escalón, Pje. 4 #12, San Salvador",
    tipo_contribuyente: "Consumidor Final",
    nrc: "",
    limite_credito: 1500.00,
    saldo_pendiente: 0.00
  },
  {
    id: 3,
    dui_nit: "02334812-4",
    nombre: "Marcela Rivas de Gómez",
    telefono: "+503 7199-2384",
    email: "marcela.rivas@yahoo.com",
    direccion: "Residencial Santa Teresa, Santa Tecla",
    tipo_contribuyente: "Consumidor Final",
    nrc: "",
    limite_credito: 800.00,
    saldo_pendiente: 0.00
  },
  {
    id: 4,
    dui_nit: "0614-110298-101-2",
    nombre: "Soluciones Tecnológicas SV, S.A.",
    telefono: "+503 2288-4400",
    email: "facturacion@solucionestech.sv",
    direccion: "Blvd. Los Próceres #88, Antiguo Cuscatlán",
    tipo_contribuyente: "Gran Contribuyente",
    nrc: "189402-1",
    limite_credito: 25000.00,
    saldo_pendiente: 5200.00
  },
  {
    id: 5,
    dui_nit: "00000000-0",
    nombre: "Cliente Final Mostrador",
    telefono: "+503 2200-0000",
    email: "cliente.final@facturafacil.sv",
    direccion: "San Salvador, El Salvador",
    tipo_contribuyente: "Consumidor Final",
    nrc: "",
    limite_credito: 0.00,
    saldo_pendiente: 0.00
  }
];

const DEFAULT_PRODUCTOS = [
  {
    id: 1,
    sku: "LAP-ASUS-G14",
    nombre: "Laptop Gamer ASUS ROG Zephyrus G14",
    categoria: "Computación",
    precio_costo: 1250.00,
    margen_ganancia: 25,
    precio_venta: 1765.63, // 1250 * 1.25 * 1.13 = 1765.625
    stock: 8,
    stock_minimo: 3,
    imagen_url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 2,
    sku: "MOU-LOGI-G502",
    nombre: "Mouse Inalámbrico Logitech G502 X Lightspeed",
    categoria: "Accesorios",
    precio_costo: 65.00,
    margen_ganancia: 30,
    precio_venta: 95.49,
    stock: 24,
    stock_minimo: 6,
    imagen_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 3,
    sku: "MON-LG-27GP",
    nombre: "Monitor Gamer UltraGear 27'' QHD 165Hz",
    categoria: "Monitores",
    precio_costo: 220.00,
    margen_ganancia: 28,
    precio_venta: 318.21,
    stock: 4, // Alerta stock bajo
    stock_minimo: 5,
    imagen_url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 4,
    sku: "TEC-COR-K70",
    nombre: "Teclado Mecánico RGB Corsair K70 PRO",
    categoria: "Accesorios",
    precio_costo: 110.00,
    margen_ganancia: 32,
    precio_venta: 164.08,
    stock: 12,
    stock_minimo: 4,
    imagen_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 5,
    sku: "AUD-SONY-1000",
    nombre: "Audífonos Inalámbricos Sony WH-1000XM5 ANC",
    categoria: "Audio",
    precio_costo: 260.00,
    margen_ganancia: 35,
    precio_venta: 396.63,
    stock: 3, // Alerta stock bajo
    stock_minimo: 5,
    imagen_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 6,
    sku: "SSD-SAM-990",
    nombre: "Disco Sólido Samsung 990 PRO NVMe 2TB",
    categoria: "Almacenamiento",
    precio_costo: 140.00,
    margen_ganancia: 25,
    precio_venta: 197.75,
    stock: 18,
    stock_minimo: 5,
    imagen_url: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 7,
    sku: "CF-PAC-400G",
    nombre: "Café Gourmet Pacamara Salvadoreño 400g",
    categoria: "Cafetería & Snacks",
    precio_costo: 6.50,
    margen_ganancia: 35,
    precio_venta: 9.92,
    stock: 65,
    stock_minimo: 15,
    imagen_url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 8,
    sku: "AG-ART-750ML",
    nombre: "Agua Mineral Artesanal 750ml",
    categoria: "Bebidas",
    precio_costo: 1.20,
    margen_ganancia: 50,
    precio_venta: 2.03,
    stock: 120,
    stock_minimo: 25,
    imagen_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 9,
    sku: "HUB-USB-7P",
    nombre: "Hub USB-C 7 en 1 con HDMI 4K y Power Delivery",
    categoria: "Accesorios",
    precio_costo: 28.00,
    margen_ganancia: 35,
    precio_venta: 42.71,
    stock: 2, // Alerta stock crítico
    stock_minimo: 6,
    imagen_url: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&w=300&q=80"
  }
];

const DEFAULT_FACTURAS = [
  {
    id: 1,
    numero_dte: "DTE-01-M001-00004928",
    codigo_generacion_uuid: "D4C2B7E1-891A-4C4D-B552-9A3FE18C0142",
    sello_recepcion_mh: "2024E677F6702BB04481A01B73FE001428",
    fecha_hora: "2024-10-18T16:42:10",
    cliente_id: 1,
    cliente_nombre: "Distribuidora Cuscatlán S.A. de C.V.",
    cliente_doc: "0614-230910-102-1",
    tipo_dte: "CCF (03)",
    subtotal: 126.11,
    iva: 16.39,
    total: 142.50,
    metodo_pago: "Tarjeta Visa",
    referencia_pago: "tok_visa_49182",
    estado_mh: "Transmitido con Éxito"
  },
  {
    id: 2,
    numero_dte: "DTE-01-M001-00004927",
    codigo_generacion_uuid: "9B1F223A-C450-4F21-95E0-880F12AA5591",
    sello_recepcion_mh: "2024B119C9031EA19208B12C88FF119201",
    fecha_hora: "2024-10-18T16:38:52",
    cliente_id: 5,
    cliente_nombre: "Cliente Final Mostrador",
    cliente_doc: "04981123-9",
    tipo_dte: "Factura (01)",
    subtotal: 25.44,
    iva: 3.31,
    total: 28.75,
    metodo_pago: "Efectivo",
    referencia_pago: "Efectivo: $30.00 | Cambio: $1.25",
    estado_mh: "Transmitido con Éxito"
  },
  {
    id: 3,
    numero_dte: "DTE-01-M001-00004926",
    codigo_generacion_uuid: "88CE7130-1052-4BC2-911E-F302D4E18B80",
    sello_recepcion_mh: "2024A8812D339FF18274A09C99DE441829",
    fecha_hora: "2024-10-18T16:34:01",
    cliente_id: 3,
    cliente_nombre: "Marcela Rivas de Gómez",
    cliente_doc: "02334812-4",
    tipo_dte: "Factura (01)",
    subtotal: 17.52,
    iva: 2.28,
    total: 19.80,
    metodo_pago: "Chivo Wallet / QR",
    referencia_pago: "chivo_tx_889102",
    estado_mh: "Transmitido con Éxito"
  },
  {
    id: 4,
    numero_dte: "DTE-01-M001-00004925",
    codigo_generacion_uuid: "55A1289F-7741-4E60-A91D-44D1E89A0021",
    sello_recepcion_mh: "2024C9918E221DA88301B20A77EE112048",
    fecha_hora: "2024-10-18T16:30:19",
    cliente_id: 4,
    cliente_nombre: "Soluciones Tecnológicas SV, S.A.",
    cliente_doc: "0614-110298-101-2",
    tipo_dte: "CCF (03)",
    subtotal: 274.34,
    iva: 35.66,
    total: 310.00,
    metodo_pago: "Transferencia UNI",
    referencia_pago: "uni_sv_banco_8819",
    estado_mh: "Transmitido con Éxito"
  }
];

const DEFAULT_DETALLE_FACTURAS = [
  { id: 1, factura_id: 1, producto_id: 2, cantidad: 1, precio_unitario_historico: 95.49, subtotal: 84.50, iva_linea: 10.99 },
  { id: 2, factura_id: 1, producto_id: 9, cantidad: 1, precio_unitario_historico: 42.71, subtotal: 37.80, iva_linea: 4.91 },
  { id: 3, factura_id: 2, producto_id: 7, cantidad: 2, precio_unitario_historico: 9.92, subtotal: 17.56, iva_linea: 2.28 },
  { id: 4, factura_id: 2, producto_id: 8, cantidad: 4, precio_unitario_historico: 2.03, subtotal: 7.19, iva_linea: 0.93 },
  { id: 5, factura_id: 3, producto_id: 7, cantidad: 2, precio_unitario_historico: 9.90, subtotal: 17.52, iva_linea: 2.28 },
  { id: 6, factura_id: 4, producto_id: 3, cantidad: 1, precio_unitario_historico: 310.00, subtotal: 274.34, iva_linea: 35.66 }
];

class FacturaFacilDB {
  constructor() {
    this.data = this.loadDatabase();
  }

  loadDatabase() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("No se pudo leer localStorage, usando memoria volátil:", e);
    }
    const initial = {
      clientes: DEFAULT_CLIENTES,
      productos: DEFAULT_PRODUCTOS,
      facturas: DEFAULT_FACTURAS,
      detalle_facturas: DEFAULT_DETALLE_FACTURAS,
      lastDteSequence: 4928,
      activeUserRole: 'cajero', // 'cajero' | 'admin'
      currentCashier: {
        nombre: 'Carlos Mendoza',
        cargo: 'Cajero / Terminal POS #02',
        sucursal: 'Sucursal Escalón - San Salvador',
        turno: '05h 42m',
        baseCaja: 350.00
      }
    };
    this.saveDatabase(initial);
    return initial;
  }

  saveDatabase(dataToSave = null) {
    const d = dataToSave || this.data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      // Notificar a otras ventanas o componentes en la misma pestaña
      window.dispatchEvent(new CustomEvent('facturafacil_sync', { detail: { timestamp: Date.now() } }));
    } catch (e) {
      console.error("Error al persistir base de datos:", e);
    }
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = this.loadDatabase();
    this.saveDatabase();
    return this.data;
  }

  // Clientes
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
      dui_nit: cliente.dui_nit || '00000000-0',
      nombre: cliente.nombre || 'Nuevo Cliente',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || 'San Salvador',
      tipo_contribuyente: cliente.tipo_contribuyente || 'Consumidor Final',
      nrc: cliente.nrc || '',
      limite_credito: parseFloat(cliente.limite_credito) || 500.00,
      saldo_pendiente: 0.00
    };
    this.data.clientes.unshift(nuevo);
    this.saveDatabase();
    return nuevo;
  }

  // Productos
  getProductos() {
    return this.data.productos || [];
  }

  getProductoById(id) {
    return this.getProductos().find(p => p.id === parseInt(id));
  }

  addProducto(prod) {
    const newId = (this.data.productos.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1;
    const costo = parseFloat(prod.precio_costo) || 0;
    const margen = parseFloat(prod.margen_ganancia) || 25;
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

  // Facturación y Ventas (Motor de Reglas de Negocio)
  createVenta({ clienteId, items, metodoPago, referenciaPago = '', tipoDte = 'Factura (01)' }) {
    if (!items || items.length === 0) {
      throw new Error("No hay artículos en el carrito para facturar.");
    }

    // 1. Verificar y descontar stock
    for (const item of items) {
      const prod = this.getProductoById(item.productoId);
      if (!prod) {
        throw new Error(`Producto ID ${item.productoId} no encontrado en catálogo.`);
      }
      if (prod.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}`);
      }
    }

    // 2. Calcular totales exactos con IVA 13% de El Salvador
    let totalBruto = 0;
    const detalleProcesado = [];

    items.forEach(item => {
      const prod = this.getProductoById(item.productoId);
      const precioUnitarioConIva = prod.precio_venta;
      const subtotalItemConIva = precioUnitarioConIva * item.cantidad;
      totalBruto += subtotalItemConIva;

      // Desglose fiscal salvadoreño (precios de venta al público en SV ya incluyen IVA)
      // Base imponible = Total / 1.13; IVA = Total - Base
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

    // 3. Generar Identificadores Oficiales de Factura Electrónica (DTE El Salvador)
    this.data.lastDteSequence = (this.data.lastDteSequence || 4928) + 1;
    const correlativo = String(this.data.lastDteSequence).padStart(8, '0');
    const numeroDte = `DTE-01-M001-${correlativo}`;
    const codigoGeneracionUUID = this.generateUUID();
    const selloRecepcionMH = `${new Date().getFullYear()}SV${this.generateRandomHex(28).toUpperCase()}`;

    // Obtener cliente
    const cliente = this.getClienteById(clienteId) || this.getClienteById(5); // Default Mostrador

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
      estado_mh: "Transmitido con Éxito"
    };

    // 4. Descontar inventario e insertar detalles
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
      // Descontar inventario
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

  // Analítica & KPIs para el ADMIN
  getKPIs() {
    const facturas = this.getFacturas();
    const productos = this.getProductos();

    // Ventas acumuladas
    const totalVentas = facturas.reduce((acc, f) => acc + (f.total || 0), 0);
    const totalIva = facturas.reduce((acc, f) => acc + (f.iva || 0), 0);
    const cantidadTransacciones = facturas.length;
    const ticketPromedio = cantidadTransacciones > 0 ? (totalVentas / cantidadTransacciones) : 0;

    // Alertas de inventario crítico
    const stockCritico = productos.filter(p => p.stock <= p.stock_minimo);
    const stockAgotado = productos.filter(p => p.stock === 0);

    // Calcular artículos más vendidos
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
