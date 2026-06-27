/**
 * orak-pwa.js
 * Registra el Service Worker y maneja el prompt de instalación.
 */

// ── Registro del Service Worker ───────────────────────────────
export async function registrarSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
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

// ── Push Notifications ────────────────────────────────────────
const VAPID_PUBLIC_KEY = 'BL6HXpkznFdXpDBYo8t2ExX7iM6uhXKFtXsfsb3Idj18mW04w3Lvxo0ALkegl1nbvZ1PIr9JmevPuMppCfwF50E';

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - b64.length % 4) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function _pushLog(event, detail = '') {
  try { await fetch('/api/social/push/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, detail }) }); } catch {}
}

export async function suscribirPush(getToken) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    await _pushLog('no-support', navigator.userAgent.slice(0, 80));
    return;
  }
  try {
    const perm = await Notification.requestPermission();
    await _pushLog('permission', perm);
    if (perm !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    await _pushLog('sw-ready', reg.active?.state || 'unknown');

    let sub = await reg.pushManager.getSubscription();
    await _pushLog('existing-sub', sub ? sub.endpoint.slice(0, 60) : 'none');

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await _pushLog('subscribed', sub.endpoint.slice(0, 60));
    }

    const token = typeof getToken === 'function' ? getToken() : getToken;
    const res = await fetch('/api/social/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    await _pushLog('saved', res.ok ? 'ok' : `error ${res.status}`);
  } catch (e) {
    await _pushLog('error', `${e.name}: ${e.message}`);
  }
}
