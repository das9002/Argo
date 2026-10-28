/**
 * FacturaFácil POS - Lógica Interactiva del Terminal de Ventas (Caja Rápida)
 * Rol: Cajero / Empleado
 */

document.addEventListener('DOMContentLoaded', () => {
  // Estado local del Carrito de Compras
  let cart = []; // [{ productoId, cantidad }]
  let activeCategory = 'Todos';
  let selectedMethod = 'efectivo';
  let selectedDocType = 'Factura (01)';
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
      // Auto ajustar tipo de documento según contribuyente
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
          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
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
    const query = (productSearchInput.value || '').trim().toLowerCase();
    const allProducts = window.facturaDB.getProductos();

    const filtered = allProducts.filter(p => {
      const matchCat = activeCategory === 'Todos' || p.categoria === activeCategory;
      const matchQuery = !query || 
        p.nombre.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        p.categoria.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    productsGrid.innerHTML = '';

    if (filtered.length === 0) {
      productsGrid.innerHTML = `
        <div class="col-span-full py-12 flex flex-col items-center justify-center text-center text-outline">
          <span class="material-symbols-outlined text-[48px] opacity-40 mb-2">inventory_2</span>
          <p class="font-headline-sm text-headline-sm text-on-surface">No se encontraron productos</p>
          <p class="font-body-sm text-body-sm text-outline mt-1">Prueba con otro término de búsqueda o categoría.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement('div');
      const isOutOfStock = p.stock <= 0;
      const isLowStock = p.stock > 0 && p.stock <= p.stock_minimo;

      card.className = `bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden ${
        isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'
      }`;

      card.innerHTML = `
        <div>
          <!-- Imagen de Producto -->
          <div class="w-full h-36 rounded-xl bg-surface-container-low overflow-hidden relative mb-2.5">
            <img src="${p.imagen_url}" alt="${p.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80'" />
            <!-- Badge de Stock -->
            <div class="absolute top-2 right-2">
              ${
                isOutOfStock
                  ? '<span class="px-2 py-0.5 rounded-md bg-error text-white font-label-sm text-[10px] font-bold shadow">Agotado</span>'
                  : isLowStock
                  ? `<span class="px-2 py-0.5 rounded-md bg-amber-500 text-white font-label-sm text-[10px] font-bold shadow animate-pulse">Stock: ${p.stock}</span>`
                  : `<span class="px-2 py-0.5 rounded-md bg-secondary-container/90 text-on-secondary-container font-label-sm text-[10px] font-semibold backdrop-blur-sm shadow-sm">Stock: ${p.stock}</span>`
              }
            </div>
            <div class="absolute bottom-2 left-2">
              <span class="px-2 py-0.5 rounded-md bg-black/60 text-white font-label-sm text-[10px] font-medium backdrop-blur-sm">${p.sku}</span>
            </div>
          </div>

          <!-- Información -->
          <span class="font-label-sm text-[11px] uppercase tracking-wider text-outline block mb-0.5">${p.categoria}</span>
          <h4 class="font-label-md text-label-md font-semibold text-on-surface line-clamp-2 leading-tight">${p.nombre}</h4>
        </div>

        <!-- Precio y Botón Agregar -->
        <div class="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between">
          <div>
            <div class="font-numeric-pos-md font-bold text-on-surface text-base leading-none">$${p.precio_venta.toFixed(2)}</div>
            <span class="font-label-sm text-[10px] text-secondary font-medium">IVA 13% Inc.</span>
          </div>
          <button class="add-to-cart-btn w-9 h-9 rounded-xl ${
            isOutOfStock
              ? 'bg-surface-container text-outline cursor-not-allowed'
              : 'bg-secondary text-white hover:bg-[#00583b] shadow-sm'
          } flex items-center justify-center transition-all" ${isOutOfStock ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          </button>
        </div>
      `;

      // Clic en la tarjeta o botón para agregar
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
  });

  // Escaneo por código de barra rápido (Enter en el header)
  headerBarcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const code = headerBarcodeInput.value.trim().toLowerCase();
      if (!code) return;
      const all = window.facturaDB.getProductos();
      const match = all.find(p => p.sku.toLowerCase() === code || p.nombre.toLowerCase().includes(code));
      if (match) {
        addToCart(match.id);
        headerBarcodeInput.value = '';
        window.showToast(`Producto escaneado: ${match.nombre}`);
      } else {
        window.showToast(`Código ${code} no encontrado.`, 'error');
      }
    }
  });

  // 5. Manejo del Carrito de Compras
  function addToCart(productoId) {
    const prod = window.facturaDB.getProductoById(productoId);
    if (!prod) return;

    const existingIndex = cart.findIndex(item => item.productoId === productoId);
    if (existingIndex > -1) {
      if (cart[existingIndex].cantidad + 1 > prod.stock) {
        window.showToast(`No hay más unidades en stock para "${prod.nombre}"`, 'error');
        return;
      }
      cart[existingIndex].cantidad += 1;
    } else {
      if (prod.stock < 1) {
        window.showToast(`Producto sin stock disponible`, 'error');
        return;
      }
      cart.push({ productoId, cantidad: 1 });
    }

    renderCart();
  }

  function updateCartQuantity(productoId, delta) {
    const existingIndex = cart.findIndex(item => item.productoId === productoId);
    if (existingIndex === -1) return;

    const prod = window.facturaDB.getProductoById(productoId);
    const newQty = cart[existingIndex].cantidad + delta;

    if (newQty <= 0) {
      cart.splice(existingIndex, 1);
    } else {
      if (newQty > prod.stock) {
        window.showToast(`Stock máximo disponible alcanzado (${prod.stock})`, 'error');
        return;
      }
      cart[existingIndex].cantidad = newQty;
    }

    renderCart();
  }

  function removeCartItem(productoId) {
    cart = cart.filter(item => item.productoId !== productoId);
    renderCart();
  }

  btnClearCart.addEventListener('click', () => {
    if (cart.length === 0) return;
    if (confirm('¿Deseas vaciar el carrito actual?')) {
      cart = [];
      renderCart();
      window.showToast('Carrito vaciado');
    }
  });

  function renderCart() {
    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center p-6 text-outline">
          <span class="material-symbols-outlined text-[48px] opacity-40 mb-2">shopping_basket</span>
          <p class="font-label-md text-label-md">El carrito está vacío</p>
          <p class="font-body-sm text-body-sm text-outline mt-1">Haz clic en productos para agregarlos a la orden.</p>
        </div>
      `;
      cartSubtotalText.textContent = '$0.00';
      cartIvaText.textContent = '$0.00';
      cartTotalText.textContent = '$0.00';
      btnProceedPayment.disabled = true;
      return;
    }

    cartItemsList.innerHTML = '';
    let totalBruto = 0;

    cart.forEach(item => {
      const prod = window.facturaDB.getProductoById(item.productoId);
      const subtotalItem = prod.precio_venta * item.cantidad;
      totalBruto += subtotalItem;

      const row = document.createElement('div');
      row.className = 'py-3 flex items-center justify-between gap-3 group';
      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <img src="${prod.imagen_url}" alt="${prod.nombre}" class="w-11 h-11 rounded-lg object-cover bg-surface-container flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=300&q=80'" />
          <div class="min-w-0 flex-1">
            <h5 class="font-label-md text-label-md font-semibold text-on-surface truncate">${prod.nombre}</h5>
            <div class="font-body-sm text-xs text-outline">$${prod.precio_venta.toFixed(2)} c/u • <span class="text-secondary font-medium">13% IVA</span></div>
          </div>
        </div>

        <!-- Controles de Cantidad -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button class="qty-btn-minus w-7 h-7 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <span class="w-7 text-center font-numeric-pos-md font-bold text-on-surface text-sm">${item.cantidad}</span>
          <button class="qty-btn-plus w-7 h-7 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[16px]">add</span>
          </button>
        </div>

        <!-- Subtotal y Eliminar -->
        <div class="text-right flex-shrink-0 min-w-[70px]">
          <div class="font-numeric-pos-md font-bold text-on-surface text-sm">$${subtotalItem.toFixed(2)}</div>
          <button class="btn-remove-item text-xs text-error hover:underline flex items-center gap-0.5 justify-end ml-auto mt-0.5">
            <span class="material-symbols-outlined text-[13px]">delete</span> Quitar
          </button>
        </div>
      `;

      row.querySelector('.qty-btn-minus').addEventListener('click', () => updateCartQuantity(item.productoId, -1));
      row.querySelector('.qty-btn-plus').addEventListener('click', () => updateCartQuantity(item.productoId, 1));
      row.querySelector('.btn-remove-item').addEventListener('click', () => removeCartItem(item.productoId));

      cartItemsList.appendChild(row);
    });

    // Desglose fiscal salvadoreño (IVA 13%)
    const subtotalNeto = totalBruto / 1.13;
    const ivaMonto = totalBruto - subtotalNeto;

    cartSubtotalText.textContent = `$${subtotalNeto.toFixed(2)}`;
    cartIvaText.textContent = `$${ivaMonto.toFixed(2)}`;
    cartTotalText.textContent = `$${totalBruto.toFixed(2)}`;
    btnProceedPayment.disabled = false;
  }

  // 6. Proceso de Cobro y Pasarela de Pago
  btnProceedPayment.addEventListener('click', () => {
    if (cart.length === 0) return;
    const total = cartTotalText.textContent;
    modalTotalPayable.textContent = `${total} USD`;
    cashReceivedInput.value = '';
    cashChangeDisplay.textContent = '$0.00';
    setPaymentMethod('efectivo');
    paymentModal.classList.remove('hidden');
    cashReceivedInput.focus();
  });

  function closePayment() {
    paymentModal.classList.add('hidden');
  }

  btnClosePaymentModal.addEventListener('click', closePayment);
  btnCancelPayment.addEventListener('click', closePayment);

  function setPaymentMethod(method) {
    selectedMethod = method;
    paymentMethodBtns.forEach(btn => {
      const isCurrent = btn.getAttribute('data-method') === method;
      btn.className = `payment-method-btn p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
        isCurrent
          ? 'border-2 border-secondary bg-secondary-container/20 text-secondary font-semibold'
          : 'border border-outline-variant/40 hover:bg-surface-container-low text-on-surface'
      }`;
    });

    methodSectionEfectivo.classList.add('hidden');
    methodSectionTarjeta.classList.add('hidden');
    methodSectionChivo.classList.add('hidden');
    methodSectionTransferencia.classList.add('hidden');

    if (method === 'efectivo') methodSectionEfectivo.classList.remove('hidden');
    if (method === 'tarjeta') {
      methodSectionTarjeta.classList.remove('hidden');
      // Generar nuevo token Pagadito/Stripe para la demostración
      const cardTokenDisplay = document.getElementById('cardTokenDisplay');
      if (cardTokenDisplay) {
        cardTokenDisplay.textContent = `tok_sv_live_${Math.random().toString(16).slice(2, 14)}`;
      }
    }
    if (method === 'chivo') methodSectionChivo.classList.remove('hidden');
    if (method === 'transferencia') methodSectionTransferencia.classList.remove('hidden');
  }

  paymentMethodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setPaymentMethod(btn.getAttribute('data-method'));
    });
  });

  // Cálculo de cambio en efectivo
  function calculateChange() {
    const total = parseFloat(cartTotalText.textContent.replace('$', '')) || 0;
    const received = parseFloat(cashReceivedInput.value) || 0;
    const change = Math.max(0, received - total);
    cashChangeDisplay.textContent = `$${change.toFixed(2)}`;
    if (received < total && received > 0) {
      cashChangeDisplay.classList.add('text-error');
    } else {
      cashChangeDisplay.classList.remove('text-error');
    }
  }

  cashReceivedInput.addEventListener('input', calculateChange);

  cashQuickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const amt = parseFloat(btn.getAttribute('data-amt'));
      cashReceivedInput.value = amt.toFixed(2);
      calculateChange();
    });
  });

  cashExactBtn.addEventListener('click', () => {
    const total = parseFloat(cartTotalText.textContent.replace('$', '')) || 0;
    cashReceivedInput.value = total.toFixed(2);
    calculateChange();
  });

  // 7. Confirmación de Venta y Emisión de DTE
  btnConfirmSaleAndDte.addEventListener('click', () => {
    try {
      const total = parseFloat(cartTotalText.textContent.replace('$', '')) || 0;

      // Validar monto si es efectivo
      if (selectedMethod === 'efectivo') {
        const received = parseFloat(cashReceivedInput.value) || 0;
        if (received < total) {
          window.showToast(`El efectivo recibido ($${received.toFixed(2)}) es menor al total ($${total.toFixed(2)})`, 'error');
          return;
        }
      }

      // Preparar referencia de pago
      let refPago = '';
      if (selectedMethod === 'efectivo') {
        const received = parseFloat(cashReceivedInput.value) || total;
        const change = Math.max(0, received - total);
        refPago = `Efectivo: $${received.toFixed(2)} | Cambio: $${change.toFixed(2)}`;
      } else if (selectedMethod === 'tarjeta') {
        const tok = document.getElementById('cardTokenDisplay').textContent;
        refPago = `Pagadito Token: ${tok}`;
      } else if (selectedMethod === 'chivo') {
        refPago = `Chivo Wallet QR TX-${Date.now().toString().slice(-6)}`;
      } else {
        const transRef = document.getElementById('transferRefInput').value || 'UNI-SV-89210';
        refPago = `Banco: ${transRef}`;
      }

      // Mostrar estado de procesamiento
      btnConfirmSaleAndDte.disabled = true;
      btnConfirmSaleAndDte.innerHTML = `
        <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
        <span>Firmando DTE con MH El Salvador...</span>
      `;

      setTimeout(() => {
        try {
          // Invocar al motor relacional
          const saleResult = window.facturaDB.createVenta({
            clienteId: parseInt(clientSelect.value),
            items: cart,
            metodoPago: selectedMethod === 'efectivo' ? 'Efectivo' : selectedMethod === 'tarjeta' ? 'Tarjeta Visa/MC' : selectedMethod === 'chivo' ? 'Chivo Wallet / QR' : 'Transferencia UNI',
            referenciaPago: refPago,
            tipoDte: selectedDocType
          });

          lastCompletedSale = saleResult;
          closePayment();

          // Limpiar carrito y recargar catálogo con stock actualizado
          cart = [];
          renderCart();
          renderProducts();

          // Abrir modal de ticket térmico DTE
          showTicketModal(saleResult);
          window.showToast(`¡Venta procesada con éxito! DTE generado: ${saleResult.factura.numero_dte}`);
        } catch (err) {
          window.showToast(err.message, 'error');
        } finally {
          btnConfirmSaleAndDte.disabled = false;
          btnConfirmSaleAndDte.innerHTML = `
            <span class="material-symbols-outlined text-[18px]">verified</span>
            <span>AUTORIZAR Y EMITIR DTE MH</span>
          `;
        }
      }, 600);

    } catch (e) {
      window.showToast(e.message, 'error');
    }
  });

  // 8. Llenar y mostrar Ticket Térmico DTE
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

  // Inicializar todo
  loadClients();
  loadCategories();
  renderProducts();
  renderCart();
});
