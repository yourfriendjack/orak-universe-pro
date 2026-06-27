/**
 * orak-cache.js
 * Define qué se guarda en la Memoria de Orak y cómo.
 */

export const MEMORIA_VERSION = 'orak-memoria-v4';

// Archivos que se cachean al instalar el SW (shell de la app)
export const SHELL = [
  '/',
  '/index-social.html',
  '/offline.html',
  '/css/orak-social.css',
  '/css/themes.css',
  '/js/orak-sounds.js',
  '/js/services/api.js',
  '/js/services/auth.js',
  '/js/themes/theme-engine.js',
  '/manifest.json',
  '/logo.svg',
];

// Rutas de API que nunca se cachean (siempre frescas)
export const API_BYPASS = [
  '/api/',
  '/auth/',
];

// Rutas que van a red primero, caché como respaldo
export const NETWORK_FIRST = [
  '/index-social.html',
  '/',
];

export function esAPI(url) {
  return API_BYPASS.some(p => url.includes(p));
}

export function esNetworkFirst(url) {
  const path = new URL(url).pathname;
  return NETWORK_FIRST.some(p => path === p || path.startsWith(p));
}
