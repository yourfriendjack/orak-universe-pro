/**
 * sw.js — Service Worker de ORAK Universe
 * La Memoria de Orak: guarda, sirve y sincroniza recursos.
 *
 * Estrategias:
 *   API calls   → Network only   (siempre datos frescos)
 *   HTML pages  → Network first  (fresco si hay red, caché si no)
 *   Assets      → Cache first    (rápido, actualiza en segundo plano)
 */

import { MEMORIA_VERSION, SHELL, esAPI, esNetworkFirst } from '/js/pwa/orak-cache.js';

// ── Instalación: precachear el shell de la app ────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(MEMORIA_VERSION).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activación: limpiar versiones antiguas ────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== MEMORIA_VERSION)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: interceptar todas las peticiones ───────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // API → siempre red, nunca caché
  if (esAPI(url)) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Sin conexión' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // HTML principal → red primero, caché como respaldo
  if (esNetworkFirst(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets (CSS, JS, imágenes) → caché primero, actualiza en fondo
  event.respondWith(cacheFirst(request));
});

// ── Estrategia: red primero ───────────────────────────────────
async function networkFirst(request) {
  try {
    const respuesta = await fetch(request);
    const cache = await caches.open(MEMORIA_VERSION);
    cache.put(request, respuesta.clone());
    return respuesta;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}

// ── Estrategia: caché primero ─────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Actualizar en segundo plano sin bloquear
    fetch(request).then(async respuesta => {
      if (respuesta.ok) {
        const cache = await caches.open(MEMORIA_VERSION);
        cache.put(request, respuesta);
      }
    }).catch(() => {});
    return cached;
  }
  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) {
      const cache = await caches.open(MEMORIA_VERSION);
      cache.put(request, respuesta.clone());
    }
    return respuesta;
  } catch {
    return caches.match('/offline.html');
  }
}
