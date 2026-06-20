// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/theme-engine.js
//  Motor de temas Canvas — inicia/detiene renderers según la clase
//  activa en <html>. Usa MutationObserver para detectar cambios.
//
//  Para agregar un nuevo renderer:
//    1. Crear frontend/js/themes/miTema.js  (mismo patrón que aurora.js)
//    2. Importarlo aquí
//    3. Agregarlo al objeto RENDERERS con su clase CSS
// ════════════════════════════════════════════════════════════════

import { AuroraRenderer } from './aurora.js';

// Mapa clase-CSS → renderer Canvas
const RENDERERS = {
  'theme-aurora': AuroraRenderer,
  // 'theme-rubi':      RubiRenderer,
  // 'theme-esmeralda': EsmeraldaRenderer,
  // 'theme-sangre':    SangreRenderer,
};

let activeRenderer = null;
let activeKey      = null;

function syncRenderer() {
  const classes = document.documentElement.classList;

  // Buscar qué renderer (si alguno) corresponde al tema activo
  const nextKey = Object.keys(RENDERERS).find(cls => classes.contains(cls)) ?? null;

  if (nextKey === activeKey) return; // sin cambio — nada que hacer

  // Detener el renderer anterior
  if (activeRenderer) {
    activeRenderer.stop();
    activeRenderer = null;
  }

  // Iniciar el nuevo renderer
  activeKey = nextKey;
  if (activeKey) {
    activeRenderer = RENDERERS[activeKey];
    activeRenderer.start();
  }
}

// Observar cambios de clase en <html> (se dispara cuando aplicarTema() actúa)
const observer = new MutationObserver(syncRenderer);
observer.observe(document.documentElement, {
  attributes:      true,
  attributeFilter: ['class'],
});

// Sincronizar en carga inicial (el tema ya puede estar activo desde localStorage)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncRenderer);
} else {
  syncRenderer();
}
