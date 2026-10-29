/**
 * FacturaFácil POS & Analytics - Configuración de Tailwind y Helpers Globales
 */

const THEME_STORAGE_KEY = 'factura_facil_theme';

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  document.querySelectorAll('.theme-toggle').forEach(button => {
    button.setAttribute('aria-pressed', String(isDark));
    const icon = button.querySelector('.theme-toggle-icon');
    const label = button.querySelector('.theme-toggle-label');
    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    if (label) label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
  });
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
document.documentElement.classList.toggle('dark', savedTheme === 'dark');
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';

window.toggleDarkMode = function() {
  applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
};

document.addEventListener('DOMContentLoaded', () => applyTheme(savedTheme === 'dark' ? 'dark' : 'light'));

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

// 2. Guardia de Enrutamiento Inmediato y Control RBAC Estricto
(function enforceStrictRBAC() {
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  const isLoginPage = currentFile === 'login.html';
  const isInsideHtmlFolder = currentPath.includes('/html/') || currentPath.endsWith('/html');

  function resolveNavUrl(destination) {
    if (destination === 'index.html') {
      return isInsideHtmlFolder ? '../index.html' : 'index.html';
    }
    if (destination === 'login.html') {
      return isInsideHtmlFolder ? 'login.html' : 'html/login.html';
    }
    return isInsideHtmlFolder ? destination : `html/${destination}`;
  }

  // Leer sesión guardada en localStorage
  let user = null;
  try {
    const raw = localStorage.getItem('factura_facil_active_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) {}

  // 1. Si no hay usuario y no estamos en login, redirigir a login
  if (!user && !isLoginPage) {
    window.location.replace(resolveNavUrl('login.html'));
    return;
  }

  // 2. Aislamiento Estricto de Roles:
  // Si el usuario es CAJERO, NUNCA puede entrar ni ver el panel de ADMIN (Dashboard, Inventario, Facturas, Clientes)
  const adminRestrictedPages = ['index.html', '', 'inventario.html', 'facturas.html', 'clientes.html'];
  if (user && user.rol === 'CAJERO' && adminRestrictedPages.includes(currentFile)) {
    // Redirección inmediata a la Terminal POS
    window.location.replace(resolveNavUrl('pos.html'));
    return;
  }
})();

// 3. Sistema de Notificaciones Toast
window.showToast = function(message, type = 'success', duration = 3800) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  const bgColor = type === 'success' ? 'bg-[#006c4a] text-white' : type === 'error' ? 'bg-[#ba1a1a] text-white' : 'bg-[#131b2e] text-white';

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

// 4. Helper Global de Cierre de Sesión Seguro
window.logoutUser = function() {
  if (window.facturaDB) {
    window.facturaDB.logout();
  } else {
    localStorage.removeItem('factura_facil_active_user');
    localStorage.removeItem('factura_facil_auth_token');
  }
  const isInsideHtml = window.location.pathname.includes('/html/');
  window.location.href = isInsideHtml ? 'login.html' : 'html/login.html';
};

function escapeUserValue(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

window.openUserSettings = function() {
  let user = null;
  if (window.facturaDB) {
    user = window.facturaDB.getCurrentUser();
  } else {
    try {
      user = JSON.parse(localStorage.getItem('factura_facil_active_user') || 'null');
    } catch (error) {
      user = null;
    }
  }
  if (!user) return;

  document.getElementById('userSettingsModal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'userSettingsModal';
  modal.className = 'fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="w-full max-w-md rounded-2xl bg-surface-container-lowest p-space-lg shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="userSettingsTitle">
      <div class="flex items-center justify-between mb-5">
        <h2 id="userSettingsTitle" class="font-headline-md text-headline-md font-bold text-on-surface">Configuración</h2>
        <button type="button" class="user-settings-close p-1 rounded-lg text-outline hover:bg-surface-container hover:text-on-surface" aria-label="Cerrar configuración">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
          <div class="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold">${escapeUserValue((user.nombre_completo || user.username).split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase())}</div>
          <div>
            <div class="font-label-md font-semibold text-on-surface">${escapeUserValue(user.nombre_completo || user.username)}</div>
            <div class="font-label-sm text-outline">${escapeUserValue(user.rol || '')}</div>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-2 text-sm">
          <div class="flex justify-between gap-4"><span class="text-outline">Usuario</span><strong class="text-on-surface">${escapeUserValue(user.username)}</strong></div>
          <div class="flex justify-between gap-4"><span class="text-outline">Correo</span><strong class="text-on-surface">${escapeUserValue(user.correo || 'No registrado')}</strong></div>
          <div class="flex justify-between gap-4"><span class="text-outline">Sucursal</span><strong class="text-on-surface text-right">${escapeUserValue(user.sucursal || 'No registrada')}</strong></div>
        </div>
      </div>
      <button type="button" class="user-settings-close mt-6 w-full py-2.5 rounded-xl bg-secondary text-white font-semibold hover:bg-[#00583b]">Cerrar</button>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('.user-settings-close').forEach(button => button.addEventListener('click', () => modal.remove()));
  modal.addEventListener('click', event => {
    if (event.target === modal) modal.remove();
  });
};

window.toggleUserMenu = function(trigger) {
  const currentMenu = document.getElementById('userMenu');
  if (currentMenu) {
    currentMenu.remove();
    trigger.setAttribute('aria-expanded', 'false');
    return;
  }

  const menu = document.createElement('div');
  const bounds = trigger.getBoundingClientRect();
  menu.id = 'userMenu';
  menu.className = 'fixed z-[9999] w-48 rounded-xl bg-surface-container-lowest p-1.5 shadow-xl border border-outline-variant/30';
  menu.style.top = `${bounds.bottom + 8}px`;
  menu.style.right = `${Math.max(12, window.innerWidth - bounds.right)}px`;
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <button type="button" class="user-menu-settings w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-on-surface hover:bg-surface-container" role="menuitem">
      <span class="material-symbols-outlined text-[18px]">settings</span>
      <span>Configuración</span>
    </button>
    <button type="button" class="theme-toggle user-menu-theme w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-on-surface hover:bg-surface-container" role="menuitem" aria-pressed="false">
      <span class="material-symbols-outlined text-[18px] theme-toggle-icon">dark_mode</span>
      <span class="theme-toggle-label">Modo oscuro</span>
    </button>
    <button type="button" class="user-menu-logout w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-error hover:bg-error-container/30" role="menuitem">
      <span class="material-symbols-outlined text-[18px]">logout</span>
      <span>Cerrar sesión</span>
    </button>`;
  document.body.appendChild(menu);
  trigger.setAttribute('aria-expanded', 'true');
  menu.querySelector('.user-menu-settings').addEventListener('click', () => {
    menu.remove();
    trigger.setAttribute('aria-expanded', 'false');
    window.openUserSettings();
  });
  menu.querySelector('.user-menu-theme').addEventListener('click', () => {
    window.toggleDarkMode();
    menu.remove();
    trigger.setAttribute('aria-expanded', 'false');
  });
  menu.querySelector('.user-menu-logout').addEventListener('click', () => window.logoutUser());
  setTimeout(() => {
    document.addEventListener('click', event => {
      if (!menu.contains(event.target) && !trigger.contains(event.target)) {
        menu.remove();
        trigger.setAttribute('aria-expanded', 'false');
      }
    }, { once: true });
  }, 0);
};

// 5. Inicialización de Navegación e Integración de UI según Rol
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  const isInsideHtmlFolder = currentPath.includes('/html/') || currentPath.endsWith('/html');

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

  // Renderizar información del usuario activo y aplicar reglas estrictas de visibilidad RBAC
  function updateUIForActiveUser() {
    let user = null;
    if (window.facturaDB) {
      user = window.facturaDB.getCurrentUser();
    } else {
      try {
        user = JSON.parse(localStorage.getItem('factura_facil_active_user'));
      } catch (e) {}
    }

    if (!user) return;

    // Actualizar nombre y rol en header
    const userDisplayNames = document.querySelectorAll('.user-display-name');
    userDisplayNames.forEach(el => el.textContent = user.nombre_completo || user.username);

    const userDisplayRoles = document.querySelectorAll('.user-display-role');
    userDisplayRoles.forEach(el => {
      if (user.rol === 'ADMIN') {
        el.textContent = user.cargo || 'Propietario';
      } else {
        el.textContent = user.rol;
      }
    });

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

    // Control de Permisos por Rol (RBAC):
    // Si el usuario es CAJERO:
    // Ocultar completamente todos los elementos destinados solo a administradores (.admin-only)
    if (user.rol === 'CAJERO') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
      });
      document.querySelectorAll('.cashier-only').forEach(el => {
        el.style.display = '';
      });
    } else {
      // Si es ADMIN, mostrar elementos de administrador
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = '';
      });
      document.querySelectorAll('.cashier-only').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  updateUIForActiveUser();

  window.addEventListener('facturafacil_auth_change', () => {
    updateUIForActiveUser();
  });
});
