/**
 * FacturaFácil POS & Analytics - Configuración de Tailwind y Helpers Globales
 */

// 1. Configuración de Tailwind CSS
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary-fixed-dim": "#bec6e0",
        "on-secondary": "#ffffff",
        "background": "#f8f9ff",
        "on-primary-fixed-variant": "#3f465c",
        "secondary-fixed": "#85f8c4",
        "surface-container-high": "#dce9ff",
        "on-tertiary-container": "#497cff",
        "on-surface": "#0b1c30",
        "outline-variant": "#c6c6cd",
        "surface-container-lowest": "#ffffff",
        "tertiary": "#000000",
        "surface-variant": "#d3e4fe",
        "surface-container-highest": "#d3e4fe",
        "on-tertiary": "#ffffff",
        "on-primary-fixed": "#131b2e",
        "on-primary-container": "#7c839b",
        "on-tertiary-fixed-variant": "#003ea8",
        "secondary-container": "#82f5c1",
        "surface": "#f8f9ff",
        "tertiary-container": "#00174b",
        "inverse-on-surface": "#eaf1ff",
        "primary": "#000000",
        "tertiary-fixed-dim": "#b4c5ff",
        "surface-container": "#e5eeff",
        "surface-tint": "#565e74",
        "on-error-container": "#93000a",
        "on-surface-variant": "#45464d",
        "on-primary": "#ffffff",
        "surface-bright": "#f8f9ff",
        "primary-container": "#131b2e",
        "outline": "#76777d",
        "surface-container-low": "#eff4ff",
        "on-error": "#ffffff",
        "secondary": "#006c4a",
        "inverse-primary": "#bec6e0",
        "tertiary-fixed": "#dbe1ff",
        "on-secondary-fixed": "#002114",
        "primary-fixed": "#dae2fd",
        "error-container": "#ffdad6",
        "error": "#ba1a1a",
        "on-tertiary-fixed": "#00174b",
        "on-background": "#0b1c30",
        "secondary-fixed-dim": "#68dba9",
        "on-secondary-container": "#00714e",
        "surface-dim": "#cbdbf5",
        "inverse-surface": "#213145",
        "on-secondary-fixed-variant": "#005137"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      spacing: {
        "gutter-desktop": "1.5rem",
        "space-xs": "0.25rem",
        "space-xl": "2rem",
        "margin-tablet": "1.5rem",
        "margin-desktop": "2rem",
        "space-lg": "1.5rem",
        "gutter": "1rem",
        "gutter-tablet": "1.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "margin": "1rem"
      },
      fontFamily: {
        "headline-sm": ["Plus Jakarta Sans", "sans-serif"],
        "numeric-pos-md": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "headline-md": ["Plus Jakarta Sans", "sans-serif"],
        "display-hero": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "display-hero-mobile": ["Plus Jakarta Sans", "sans-serif"],
        "numeric-pos-lg": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"]
      }
    }
  }
};

// 2. Sistema de Notificaciones Toast
window.showToast = function(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  const bgColor = type === 'success' ? 'bg-[#006c4a] text-white' : type === 'error' ? 'bg-[#ba1a1a] text-white' : 'bg-[#0b1c30] text-white';

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl font-label-md text-label-md ${bgColor} transform translate-y-4 opacity-0 transition-all duration-300 pointer-events-auto`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px]">${icon}</span>
    <span class="flex-1">${message}</span>
    <button class="opacity-70 hover:opacity-100" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined text-[16px]">close</span>
    </button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// 3. Sistema de Enrutamiento Inteligente e Integración de Autenticación
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  const isInsideHtmlFolder = currentPath.includes('/html/');

  function resolveNavUrl(destination) {
    if (destination === 'index.html') {
      return isInsideHtmlFolder ? '../index.html' : 'index.html';
    }
    if (destination === 'login.html') {
      return isInsideHtmlFolder ? 'login.html' : 'html/login.html';
    }
    return isInsideHtmlFolder ? destination : `html/${destination}`;
  }

  const navMap = {
    'terminal-pos-caja-rapida': 'pos.html',
    'dashboard-kpis': 'index.html',
    'catalogo-inventario': 'inventario.html',
    'facturas-dte-hacienda': 'facturas.html',
    'directorio-clientes': 'clientes.html'
  };

  document.querySelectorAll('[data-path]').forEach(el => {
    const targetKey = el.getAttribute('data-path');
    const targetFile = navMap[targetKey];
    if (targetFile) {
      el.setAttribute('href', resolveNavUrl(targetFile));
    }
  });

  // Resaltado de página activa en el Sidebar
  document.querySelectorAll('aside nav a').forEach(link => {
    const targetKey = link.getAttribute('data-path');
    const targetFile = navMap[targetKey];
    if (targetFile && (currentFile === targetFile || (currentFile === '' && targetFile === 'index.html'))) {
      link.className = 'flex items-center gap-space-sm px-space-sm py-2.5 rounded-lg bg-secondary-container text-on-secondary-container font-semibold shadow-sm transition-all';
    }
  });

  // Renderizar información del usuario activo e indicador de rol
  function updateUIForActiveUser() {
    if (!window.facturaDB) return;
    const user = window.facturaDB.getCurrentUser();

    // Actualizar nombre y rol en header
    const userDisplayNames = document.querySelectorAll('.user-display-name');
    userDisplayNames.forEach(el => el.textContent = user.nombre_completo || user.username);

    const userDisplayRoles = document.querySelectorAll('.user-display-role');
    userDisplayRoles.forEach(el => el.textContent = `${user.rol} / ${user.cargo || 'Operador'}`);

    const userAvatars = document.querySelectorAll('.user-display-avatar');
    userAvatars.forEach(el => {
      const initials = (user.nombre_completo || user.username)
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      el.textContent = initials || 'US';
      if (user.rol === 'ADMIN') {
        el.className = 'w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs user-display-avatar';
      } else {
        el.className = 'w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs user-display-avatar';
      }
    });

    // Control de Permisos por Rol (RBAC): si es Cajero en la página de Dashboard Admin, mostrar aviso o restringir
    if (user.rol === 'CAJERO' && (currentFile === 'index.html' || currentFile === '')) {
      const adminOnlyElements = document.querySelectorAll('.admin-only');
      adminOnlyElements.forEach(el => el.classList.add('opacity-50', 'pointer-events-none'));
    }
  }

  updateUIForActiveUser();

  window.addEventListener('facturafacil_auth_change', () => {
    updateUIForActiveUser();
  });
});
