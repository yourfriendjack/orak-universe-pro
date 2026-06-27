/**
 * orak-pwa.js
 * Registra el Service Worker y maneja el prompt de instalación.
 */

// ── Registro del Service Worker ───────────────────────────────
export async function registrarSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { type: 'module' });
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          mostrarToastActualizacion();
        }
      });
    });
  } catch (e) {
    console.warn('[ORAK PWA] SW no registrado:', e.message);
  }
}

// ── Prompt de instalación (Android/Chrome) ────────────────────
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  mostrarBotonInstalar();
});

window.addEventListener('appinstalled', () => {
  ocultarBotonInstalar();
  _installPrompt = null;
});

export async function instalarApp() {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') _installPrompt = null;
}

// ── Toast de actualización disponible ────────────────────────
function mostrarToastActualizacion() {
  const el = document.getElementById('pwa-update-toast');
  if (el) el.style.display = 'flex';
}

export function aplicarActualizacion() {
  window.location.reload();
}

// ── Botón instalar (solo Android/Chrome lo muestra solo) ──────
function mostrarBotonInstalar() {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'flex';
}

function ocultarBotonInstalar() {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
}

// ── Detectar si ya está instalada ────────────────────────────
export function estaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}
