// ════════════════════════════════════════════════════════════
//  frontend/js/config.js
//  Configuración central del frontend
//  Todas las URLs y claves sensibles van en variables de entorno
//  o se inyectan desde el servidor en el HTML.
// ════════════════════════════════════════════════════════════

/**
 * Configuración dinámica del frontend.
 * El backend inyecta window.ORAK_CONFIG en el HTML servido,
 * o se usan los defaults para desarrollo local.
 *
 * En index.html el servidor inserta:
 *   <script>window.ORAK_CONFIG = { supabaseUrl: "...", supabaseAnon: "...", apiServer: "..." }</script>
 */
const ORAK_CONFIG = window.ORAK_CONFIG || {
  // Estos valores se sobreescriben por el servidor en producción
  supabaseUrl:  '',
  supabaseAnon: '',
  apiServer:    '',          // vacío = mismo origen (Railway/ngrok)
  version:      '3.0.0',
};

// URL del API (auto-detectada si está vacía)
const API_BASE = ORAK_CONFIG.apiServer || window.location.origin;
const WS_BASE  = API_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws');
