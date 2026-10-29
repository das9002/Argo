/**
 * FACTURAFÁCIL POS - LÓGICA INTERACTIVA DEL TERMINAL DE VENTAS (CAJA RÁPIDA)
 * Módulo de Operador / Cajero & Emisión Homologada DTE El Salvador
 *
 * Características Innovadoras:
 * - Escáner de Código de Barras con síntesis de Audio Bip (Web Audio API)
 * - Descuentos comerciales reactivos (-5%, -10%, -15%)
 * - Múltiples pasarelas: Efectivo USD con cálculo de cambio, Tarjeta, Chivo/QR, Banco UNI
 * - Ticket Térmico Oficial (80mm) con QR Dinámico de Hacienda
 * - Resumen y Arqueo de Turno de Caja en Tiempo Real
 */

document.addEventListener('DOMContentLoaded', () => {
  // Estado local del Carrito de Ventas
  let cart = []; // [{ productoId, cantidad }]
  let activeCategory = 'Todos';
  let selectedMethod = 'efectivo';
  let selectedDocType = 'Factura (01)';
  let currentDiscountPct = 0;
  let lastCompletedSale = null;

  // Elementos DOM
  const productsGrid = document.getElementById('productsGrid');
  const categoryPillsContainer = document.getElementById('categoryPillsContainer');
  const productSearchInput = document.getElementById('productSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const headerBarcodeInput = document.getElementById('headerBarcodeInput');

  const clientSelect = document.getElementById('clientSelect');
  const clientDuiPreview = document.getElementById('clientDuiPreview');
  const btnDocFactura = document.getElementById('btnDocFactura');
  const btnDocCCF = document.getElementById('btnDocCCF');

  const cartItemsList = document.getElementById('cartItemsList');
  const cartSubtotalText = document.getElementById('cartSubtotalText');
  const cartIvaText = document.getElementById('cartIvaText');
  const cartTotalText = document.getElementById('cartTotalText');
  const btnClearCart = document.getElementById('btnClearCart');
  const btnProceedPayment = document.getElementById('btnProceedPayment');

  // Modales
  const paymentModal = document.getElementById('paymentModal');
  const btnClosePaymentModal = document.getElementById('btnClosePaymentModal');
  const btnCancelPayment = document.getElementById('btnCancelPayment');
  const modalTotalPayable = document.getElementById('modalTotalPayable');
  const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');

  // Secciones de Pago
  const methodSectionEfectivo = document.getElementById('methodSectionEfectivo');
  const methodSectionTarjeta = document.getElementById('methodSectionTarjeta');
  const methodSectionChivo = document.getElementById('methodSectionChivo');
  const methodSectionTransferencia = document.getElementById('methodSectionTransferencia');

  const cashReceivedInput = document.getElementById('cashReceivedInput');
  const cashChangeDisplay = document.getElementById('cashChangeDisplay');
  const cashExactBtn = document.getElementById('cashExactBtn');
  const cashQuickBtns = document.querySelectorAll('.cash-quick-btn');
  const btnConfirmSaleAndDte = document.getElementById('btnConfirmSaleAndDte');

  // Modal de Ticket Exitoso
  const invoiceSuccessModal = document.getElementById('invoiceSuccessModal');
  const btnCloseInvoiceModal = document.getElementById('btnCloseInvoiceModal');
  const btnPrintTicket = document.getElementById('btnPrintTicket');
  const btnNewSale = document.getElementById('btnNewSale');

  // Modal Rápido de Cliente
  const quickClientModal = document.getElementById('quickClientModal');
  const btnQuickAddClient = document.getElementById('btnQuickAddClient');
  const btnCloseQuickClient = document.getElementById('btnCloseQuickClient');
  const btnCancelQuickClient = document.getElementById('btnCancelQuickClient');
  const quickClientForm = document.getElementById('quickClientForm');

  // 1. Inicializar Clientes
  function loadClients() {
    if (!window.facturaDB) return;
    const clients = window.facturaDB.getClientes();
    clientSelect.innerHTML = '';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nombre} (${c.dui_nit})`;
      if (c.dui_nit === '00000000-0') opt.selected = true;
      clientSelect.appendChild(opt);
    });
    updateClientPreview();
  }

  function updateClientPreview() {
    const cid = parseInt(clientSelect.value);
    const client = window.facturaDB.getClienteById(cid);
    if (client) {
      clientDuiPreview.textContent = `${client.dui_nit.startsWith('0614') ? 'NIT' : 'DUI'}: ${client.dui_nit} • ${client.tipo_contribuyente}`;
      // Auto-seleccionar CCF si el cliente es contribuyente
      if (client.tipo_contribuyente.includes('CCF') || client.tipo_contribuyente.includes('Gran Contribuyente')) {
        setDocType('CCF (03)');
      }
    }
  }

  clientSelect.addEventListener('change', updateClientPreview);

  // 2. Manejo de Tipo de Documento (Factura 01 vs CCF 03)
  function setDocType(type) {
    selectedDocType = type;
    if (type === 'Factura (01)') {
      btnDocFactura.className = 'flex-1 py-1.5 text-center font-label-md text-label-md rounded-lg bg-surface-container-lowest font-semibold text-on-surface shadow-sm transition-all';
      btnDocCCF.className = 'flex-1 py-1.5 text-center font-label-md text-label-md rounded-lg text-on-surface-variant hover:text-on-surface transition-all';
    } else {
      btnDocCCF.className = 'flex-1 py-1.5 text-center font-label-md text-label-md rounded-lg bg-surface-container-lowest font-semibold text-on-surface shadow-sm transition-all';
      btnDocFactura.className = 'flex-1 py-1.5 text-center font-label-md text-label-md rounded-lg text-on-surface-variant hover:text-on-surface transition-all';
    }
  }

  btnDocFactura.addEventListener('click', () => setDocType('Factura (01)'));
  btnDocCCF.addEventListener('click', () => setDocType('CCF (03)'));

  // 3. Renderizar Categorías en Chips
  function loadCategories() {
    const prods = window.facturaDB.getProductos();
    const categories = ['Todos', ...new Set(prods.map(p => p.categoria))];
    categoryPillsContainer.innerHTML = '';

    categories.forEach(cat => {
      const pill = document.createElement('button');
      const isActive = cat === activeCategory;
      pill.className = `px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
        isActive
          ? 'bg-secondary text-white font-semibold shadow-sm'
          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
      }`;
      pill.textContent = cat;
      pill.addEventListener('click', () => {
        activeCategory = cat;
        loadCategories();
        renderProducts();
      });
      categoryPillsContainer.appendChild(pill);
    });
  }

  // 4. Renderizar Catálogo de Productos
  function renderProducts() {
    const prods = window.facturaDB.getProductos();
    const query = productSearchInput.value.trim().toLowerCase();

    const filtered = prods.filter(p => {
      const matchCat = activeCategory === 'Todos' || p.categoria === activeCategory;
      const matchQuery = !query || 
        p.nombre.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        (p.codigo_barra && p.codigo_barra.includes(query));
      return matchCat && matchQuery;
    });

    productsGrid.innerHTML = '';

    if (filtered.length === 0) {
      productsGrid.innerHTML = `
        <div class="col-span-full py-12 text-center text-outline flex flex-col items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[48px]">inventory_2</span>
          <p class="font-label-md text-label-md">No se encontraron productos que coincidan con "${query}".</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement('div');
      const isOutOfStock = p.stock <= 0;
      const isLowStock = p.stock > 0 && p.stock <= p.stock_minimo;

      card.className = `bg-surface-container-lowest rounded-2xl p-space-sm border border-outline-variant/30 flex flex-col justify-between transition-all group ${
        isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:border-secondary cursor-pointer'
      }`;

      card.innerHTML = `
        <div class="flex flex-col gap-2">
          <div class="relative w-full h-32 rounded-xl overflow-hidden bg-surface-container">
            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="${p.imagen_url}" alt="${p.nombre}" onerror="this.src='https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80'" />
            <div class="absolute top-2 left-2 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm">
              ${p.sku}
            </div>
            ${
              isOutOfStock
                ? '<div class="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center font-bold text-xs text-white">AGOTADO</div>'
                : isLowStock
                ? '<div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold text-[9px] animate-pulse">Stock Crítico: ' + p.stock + '</div>'
                : '<div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-semibold text-[10px]">Stock: ' + p.stock + '</div>'
            }
          </div>
          <div>
            <div class="font-label-sm text-label-sm text-outline uppercase">${p.categoria}</div>
            <h4 class="font-headline-sm text-label-md font-semibold text-on-surface line-clamp-2 leading-tight mt-0.5">${p.nombre}</h4>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20 mt-2">
          <div class="font-numeric-pos-lg text-lg font-bold text-secondary font-numeric-pos-lg">
            $${p.precio_venta.toFixed(2)}
          </div>
          <button class="w-8 h-8 rounded-lg bg-surface-container hover:bg-secondary hover:text-white flex items-center justify-center text-on-surface transition-colors ${isOutOfStock ? 'pointer-events-none' : ''}">
            <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          </button>
        </div>
      `;

      if (!isOutOfStock) {
        card.addEventListener('click', () => {
          addToCart(p.id);
        });
      }

      productsGrid.appendChild(card);
    });
  }

  // Búsqueda en tiempo real
  productSearchInput.addEventListener('input', renderProducts);
  btnClearSearch.addEventListener('click', () => {
    productSearchInput.value = '';
    renderProducts();
    productSearchInput.focus();
  });

  // Búsqueda rápida por Enter en el buscador principal
  productSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const code = productSearchInput.value.trim().toLowerCase();
      if (!code) return;
      const all = window.facturaDB.getProductos();
      const match = all.find(p => 
        p.sku.toLowerCase() === code || 
        (p.codigo_barra && p.codigo_barra === code) ||
        p.nombre.toLowerCase().includes(code)
      );
      if (match) {
        addToCart(match.id);
        productSearchInput.value = '';
        renderProducts();
      }
    }
  });

  // Escaneo por código de barra rápido en el Header
  if (headerBarcodeInput) {
    headerBarcodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const code = headerBarcodeInput.value.trim().toLowerCase();
        if (!code) return;
        const all = window.facturaDB.getProductos();
        const match = all.find(p => 
          p.sku.toLowerCase() === code || 
          (p.codigo_barra && p.codigo_barra === code) ||
          p.nombre.toLowerCase().includes(code)
        );
        if (match) {
          addToCart(match.id);
          headerBarcodeInput.value = '';
          window.showToast(`Escaneado: ${match.nombre}`);
        } else {
          window.facturaDB.playError();
          window.showToast(`Código de barra / SKU "${code}" no encontrado.`, 'error');
        }
      }
    });
  }

  // 5. Manejo del Carrito de Compras
  function addToCart(productoId) {
    const prod = window.facturaDB.getProductoById(productoId);
    if (!prod) return;

    const existingIndex = cart.findIndex(item => item.productoId === productoId);
    if (existingIndex > -1) {
      if (cart[existingIndex].cantidad + 1 > prod.stock) {
        window.facturaDB.playError();
        window.showToast(`Stock insuficiente. Solo quedan ${prod.stock} unidades de "${prod.nombre}".`, 'error');
        return;
      }
      cart[existingIndex].cantidad++;
    } else {
      if (prod.stock < 1) {
        window.facturaDB.playError();
        window.showToast(`"${prod.nombre}" está agotado.`, 'error');
        return;
      }
      cart.push({ productoId, cantidad: 1 });
    }

    // Reproducir sonido de escaneo retail
    window.facturaDB.playBeep();
    renderCart();
  }

  function updateCartItemQuantity(productoId, delta) {
    const prod = window.facturaDB.getProductoById(productoId);
    const index = cart.findIndex(item => item.productoId === productoId);
    if (index === -1) return;

    const newQty = cart[index].cantidad + delta;
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else {
      if (newQty > prod.stock) {
        window.facturaDB.playError();
        window.showToast(`Stock máximo alcanzado (${prod.stock} uds).`, 'error');
        return;
      }
      cart[index].cantidad = newQty;
      window.facturaDB.playBeep();
    }
    renderCart();
  }

  function removeCartItem(productoId) {
    cart = cart.filter(item => item.productoId !== productoId);
    renderCart();
  }

  btnClearCart.addEventListener('click', () => {
    if (cart.length === 0) return;
    cart = [];
    currentDiscountPct = 0;
    renderCart();
    window.showToast('Carrito de venta vaciado.');
  });

  function calculateCartTotals() {
    let subtotalNeto = 0;
    let totalBruto = 0;

    cart.forEach(item => {
      const prod = window.facturaDB.getProductoById(item.productoId);
      if (prod) {
        const totalItem = prod.precio_venta * item.cantidad;
        totalBruto += totalItem;
      }
    });

    if (currentDiscountPct > 0) {
      totalBruto = totalBruto * (1 - currentDiscountPct / 100);
    }

    subtotalNeto = totalBruto / 1.13; // Desglose sin IVA
    const ivaMonto = totalBruto - subtotalNeto;

    return {
      subtotalNeto,
      ivaMonto,
      totalPagar: totalBruto
    };
  }

  function renderCart() {
    cartItemsList.innerHTML = '';

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-center p-space-md text-outline">
          <span class="material-symbols-outlined text-[48px] opacity-40">shopping_cart</span>
          <p class="font-label-md text-label-md mt-2 font-medium">El carrito está vacío</p>
          <span class="text-xs opacity-75">Selecciona productos del catálogo o escanea un código de barra</span>
        </div>
      `;
      btnProceedPayment.disabled = true;
      cartSubtotalText.textContent = '$0.00';
      cartIvaText.textContent = '$0.00';
      cartTotalText.textContent = '$0.00';
      return;
    }

    btnProceedPayment.disabled = false;

    cart.forEach(item => {
      const prod = window.facturaDB.getProductoById(item.productoId);
      if (!prod) return;

      const totalLinea = prod.precio_venta * item.cantidad;
      const el = document.createElement('div');
      el.className = 'py-3 flex items-center justify-between gap-3 group';

      el.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <img src="${prod.imagen_url}" class="w-10 h-10 rounded-lg object-cover bg-surface-container flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80'" />
          <div class="truncate">
            <div class="font-semibold text-xs text-on-surface truncate leading-tight">${prod.nombre}</div>
            <div class="text-[11px] text-outline font-numeric-pos-md font-medium">$${prod.precio_venta.toFixed(2)} c/u • <span class="text-secondary font-mono">${prod.sku}</span></div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="flex items-center bg-surface-container rounded-lg p-0.5">
            <button class="btn-qty-minus w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface">
              <span class="material-symbols-outlined text-[14px]">remove</span>
            </button>
            <span class="w-6 text-center font-bold text-xs font-numeric-pos-md text-on-surface">${item.cantidad}</span>
            <button class="btn-qty-plus w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface">
              <span class="material-symbols-outlined text-[14px]">add</span>
            </button>
          </div>

          <div class="font-bold text-xs text-right font-numeric-pos-md w-16 text-on-surface">
            $${totalLinea.toFixed(2)}
          </div>

          <button class="btn-remove-item text-outline hover:text-error transition-colors p-1" title="Quitar producto">
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      `;

      el.querySelector('.btn-qty-minus').addEventListener('click', () => updateCartItemQuantity(prod.id, -1));
      el.querySelector('.btn-qty-plus').addEventListener('click', () => updateCartItemQuantity(prod.id, 1));
      el.querySelector('.btn-remove-item').addEventListener('click', () => removeCartItem(prod.id));

      cartItemsList.appendChild(el);
    });

    const totals = calculateCartTotals();
    cartSubtotalText.textContent = `$${totals.subtotalNeto.toFixed(2)}`;
    cartIvaText.textContent = `$${totals.ivaMonto.toFixed(2)}`;
    cartTotalText.textContent = `$${totals.totalPagar.toFixed(2)}`;
  }

  // 6. Pasarela de Pagos (Checkout)
  btnProceedPayment.addEventListener('click', () => {
    if (cart.length === 0) return;
    openPayment();
  });

  function openPayment() {
    const totals = calculateCartTotals();
    modalTotalPayable.textContent = `$${totals.totalPagar.toFixed(2)} USD`;
    cashReceivedInput.value = '';
    cashChangeDisplay.textContent = '$0.00';
    cashReceivedInput.focus();
    selectPaymentMethod('efectivo');
    paymentModal.classList.remove('hidden');
  }

  function closePayment() {
    paymentModal.classList.add('hidden');
  }

  btnClosePaymentModal.addEventListener('click', closePayment);
  btnCancelPayment.addEventListener('click', closePayment);

  // Cambio de Método de Pago
  paymentMethodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.getAttribute('data-method');
      selectPaymentMethod(method);
    });
  });

  function selectPaymentMethod(method) {
    selectedMethod = method;

    paymentMethodBtns.forEach(b => {
      if (b.getAttribute('data-method') === method) {
        b.className = 'payment-method-btn p-2.5 rounded-xl border-2 border-secondary bg-secondary-container/20 flex flex-col items-center justify-center gap-1 transition-all text-secondary';
      } else {
        b.className = 'payment-method-btn p-2.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low flex flex-col items-center justify-center gap-1 transition-all text-on-surface-variant';
      }
    });

    methodSectionEfectivo.classList.add('hidden');
    methodSectionTarjeta.classList.add('hidden');
    methodSectionChivo.classList.add('hidden');
    methodSectionTransferencia.classList.add('hidden');

    if (method === 'efectivo') {
      methodSectionEfectivo.classList.remove('hidden');
      cashReceivedInput.focus();
    } else if (method === 'tarjeta') {
      methodSectionTarjeta.classList.remove('hidden');
    } else if (method === 'chivo') {
      methodSectionChivo.classList.remove('hidden');
    } else if (method === 'transferencia') {
      methodSectionTransferencia.classList.remove('hidden');
    }
  }

  // Lógica de Efectivo y Cambio
  function updateCashChange() {
    const totals = calculateCartTotals();
    const received = parseFloat(cashReceivedInput.value) || 0;
    const change = Math.max(0, received - totals.totalPagar);
    cashChangeDisplay.textContent = `$${change.toFixed(2)}`;
    if (received < totals.totalPagar && received > 0) {
      cashChangeDisplay.className = 'font-numeric-pos-lg text-xl font-bold text-error';
    } else {
      cashChangeDisplay.className = 'font-numeric-pos-lg text-xl font-bold text-secondary';
    }
  }

  cashReceivedInput.addEventListener('input', updateCashChange);

  cashQuickBtns.forEach(b => {
    b.addEventListener('click', () => {
      const amt = parseFloat(b.getAttribute('data-amt'));
      cashReceivedInput.value = amt.toFixed(2);
      updateCashChange();
    });
  });

  cashExactBtn.addEventListener('click', () => {
    const totals = calculateCartTotals();
    cashReceivedInput.value = totals.totalPagar.toFixed(2);
    updateCashChange();
  });

  // 7. Confirmación de Venta y Emisión de DTE
  btnConfirmSaleAndDte.addEventListener('click', () => {
    const totals = calculateCartTotals();

    // Validar método de efectivo
    if (selectedMethod === 'efectivo') {
      const received = parseFloat(cashReceivedInput.value) || 0;
      if (received < totals.totalPagar) {
        window.facturaDB.playError();
        window.showToast(`Monto insuficiente. Faltan $${(totals.totalPagar - received).toFixed(2)} USD`, 'error');
        cashReceivedInput.focus();
        return;
      }
    }

    btnConfirmSaleAndDte.disabled = true;
    btnConfirmSaleAndDte.innerHTML = `
      <span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>
      <span>Transmitiendo DTE a Hacienda...</span>
    `;

    setTimeout(() => {
      try {
        let refPago = '';
        if (selectedMethod === 'tarjeta') {
          refPago = document.getElementById('cardTokenDisplay').textContent || 'tok_visa_pagadito_sv';
        } else if (selectedMethod === 'transferencia') {
          refPago = document.getElementById('transferRefInput').value.trim() || 'uni_sv_banco_ref';
        } else if (selectedMethod === 'chivo') {
          refPago = `chivo_ln_${Date.now().toString().slice(-8)}`;
        } else {
          refPago = `Efectivo Recibido: $${parseFloat(cashReceivedInput.value).toFixed(2)}`;
        }

        const saleResult = window.facturaDB.createVenta({
          clienteId: parseInt(clientSelect.value),
          items: cart,
          metodoPago: selectedMethod === 'efectivo' ? 'Efectivo' : selectedMethod === 'tarjeta' ? 'Tarjeta Visa/MC' : selectedMethod === 'chivo' ? 'Chivo Wallet / QR' : 'Transferencia UNI',
          referenciaPago: refPago,
          tipoDte: selectedDocType,
          descuentoPorcentaje: currentDiscountPct
        });

        lastCompletedSale = saleResult;
        closePayment();

        // Reproducir campana de cobro exitoso
        window.facturaDB.playCashChime();

        // Limpiar carrito y recargar catálogo
        cart = [];
        currentDiscountPct = 0;
        renderCart();
        renderProducts();

        // Mostrar ticket térmico
        showTicketModal(saleResult);
        window.showToast(`¡DTE Emitido con Éxito! Folio: ${saleResult.factura.numero_dte}`);
      } catch (err) {
        window.facturaDB.playError();
        window.showToast(err.message, 'error');
      } finally {
        btnConfirmSaleAndDte.disabled = false;
        btnConfirmSaleAndDte.innerHTML = `
          <span class="material-symbols-outlined text-[18px]">verified</span>
          <span>AUTORIZAR Y EMITIR DTE MH</span>
        `;
      }
    }, 500);
  });

  // 8. Llenar y mostrar Ticket Térmico DTE con QR
  function showTicketModal(sale) {
    const f = sale.factura;
    const c = sale.cliente;

    document.getElementById('ticketTipoDteHeader').textContent = f.tipo_dte.toUpperCase();
    document.getElementById('ticketNumeroDte').textContent = f.numero_dte;
    document.getElementById('ticketUuid').textContent = f.codigo_generacion_uuid;
    document.getElementById('ticketSelloMh').textContent = f.sello_recepcion_mh;
    document.getElementById('ticketFechaHora').textContent = new Date(f.fecha_hora).toLocaleString('es-SV');
    document.getElementById('ticketClienteNombre').textContent = c.nombre;
    document.getElementById('ticketClienteDoc').textContent = c.dui_nit;

    const tbody = document.getElementById('ticketItemsTbody');
    tbody.innerHTML = '';

    sale.detalles.forEach(d => {
      const tr = document.createElement('tr');
      const totalLinea = d.precio_unitario_historico * d.cantidad;
      tr.innerHTML = `
        <td class="py-1 font-bold">${d.cantidad}</td>
        <td class="py-1">${d.nombre}</td>
        <td class="py-1 text-right font-bold">$${totalLinea.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('ticketSubtotalNeto').textContent = `$${f.subtotal.toFixed(2)}`;
    document.getElementById('ticketIvaMonto').textContent = `$${f.iva.toFixed(2)}`;
    document.getElementById('ticketTotalPagar').textContent = `$${f.total.toFixed(2)}`;
    document.getElementById('ticketMetodoPago').textContent = `${f.metodo_pago} (${f.referencia_pago})`;

    invoiceSuccessModal.classList.remove('hidden');
  }

  btnCloseInvoiceModal.addEventListener('click', () => {
    invoiceSuccessModal.classList.add('hidden');
  });

  btnNewSale.addEventListener('click', () => {
    invoiceSuccessModal.classList.add('hidden');
    productSearchInput.focus();
  });

  btnPrintTicket.addEventListener('click', () => {
    window.print();
  });

  // 9. Registro de Cliente Express
  btnQuickAddClient.addEventListener('click', () => {
    quickClientModal.classList.remove('hidden');
    document.getElementById('newClientName').focus();
  });

  function closeQuickClient() {
    quickClientModal.classList.add('hidden');
    quickClientForm.reset();
  }

  btnCloseQuickClient.addEventListener('click', closeQuickClient);
  btnCancelQuickClient.addEventListener('click', closeQuickClient);

  quickClientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('newClientName').value.trim();
    const doc = document.getElementById('newClientDoc').value.trim();
    const tipo = document.getElementById('newClientType').value;
    const tel = document.getElementById('newClientPhone').value.trim();

    if (!nombre || !doc) return;

    const nuevo = window.facturaDB.addCliente({
      nombre,
      dui_nit: doc,
      tipo_contribuyente: tipo,
      telefono: tel
    });

    loadClients();
    clientSelect.value = nuevo.id;
    updateClientPreview();
    closeQuickClient();
    window.showToast(`Cliente "${nombre}" registrado y asignado.`);
  });

  // Escuchar eventos de sincronización entre ventanas
  window.addEventListener('facturafacil_sync', () => {
    renderProducts();
  });

  // Exponer control de descuento para chips
  window.setPosDiscount = function(pct) {
    currentDiscountPct = pct;
    renderCart();
    if (pct > 0) {
      window.showToast(`Descuento del ${pct}% aplicado a la orden.`);
    }
  };

  // Inicialización
  loadClients();
  loadCategories();
  renderProducts();
  renderCart();
});
