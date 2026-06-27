/**
 * sw.js — Service Worker de ORAK Universe (classic, compatible iOS)
 */

const MEMORIA_VERSION = 'orak-memoria-v5';
const SHELL = [
  '/', '/index-social.html', '/offline.html',
  '/css/orak-social.css', '/css/themes.css',
  '/js/orak-sounds.js', '/js/services/api.js', '/js/services/auth.js',
  '/js/themes/theme-engine.js', '/manifest.json', '/logo.svg',
];
const API_BYPASS   = ['/api/', '/auth/'];
const NETWORK_FIRST_PATHS = ['/index-social.html', '/'];

function esAPI(url) { return API_BYPASS.some(p => url.includes(p)); }
function esNetworkFirst(url) {
  try { const p = new URL(url).pathname; return NETWORK_FIRST_PATHS.some(r => p === r || p.startsWith(r)); } catch { return false; }
}

// ── Instalación ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(MEMORIA_VERSION).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activación ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== MEMORIA_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (esAPI(url)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Sin conexión' }), { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }
  if (esNetworkFirst(url)) { event.respondWith(networkFirst(event.request)); return; }
  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  try {
    const respuesta = await fetch(request);
    const cache = await caches.open(MEMORIA_VERSION);
    cache.put(request, respuesta.clone());
    return respuesta;
  } catch {
    return (await caches.match(request)) || caches.match('/offline.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then(async r => { if (r.ok) (await caches.open(MEMORIA_VERSION)).put(request, r); }).catch(() => {});
    return cached;
  }
  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) (await caches.open(MEMORIA_VERSION)).put(request, respuesta.clone());
    return respuesta;
  } catch {
    return caches.match('/offline.html');
  }
}

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'ORAK Universe', body: 'Tienes una nueva notificación' };
  try { if (event.data) data = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'ORAK Universe', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: 'orak-notif',
      renotify: true,
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const c = cs.find(c => c.url.includes(self.location.origin));
      if (c) { c.focus(); c.postMessage({ type: 'NOTIF_CLICK' }); }
      else clients.openWindow(url);
    })
  );
});
