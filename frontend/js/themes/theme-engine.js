// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/theme-engine.js
//  Motor de temas Canvas
//
//  Problema de z-index que resuelve este motor:
//    El canvas usa z-index:-1 para estar siempre DETRÁS de todo
//    el contenido (feed, topbar, avatares, etc.). Pero con z-index:-1
//    el canvas queda también detrás del background del <body>, y no
//    se ve nada.
//
//  Solución:
//    Cuando un renderer Canvas está activo, se transfiere el color
//    de fondo de <body> a <html> y <body> queda transparente. Así:
//      - <html>  tiene el color de página (#030d12 para aurora, etc.)
//      - <body>  es transparente → el canvas z-index:-1 se ve a través
//      - Canvas  z-index:-1 → por debajo de feed, topbar, modales…
//    Al desactivar, se restaura el estado original.
//
//  Para agregar un nuevo renderer Canvas:
//    1. Crear frontend/js/themes/miTema.js  (mismo patrón que aurora.js)
//    2. Importarlo aquí
//    3. Agregarlo en el objeto RENDERERS con su clase CSS
// ════════════════════════════════════════════════════════════════

import { AuroraRenderer }      from './aurora.js';
import { CosmosRenderer }      from './cosmos.js';
import { LunarRenderer }       from './lunar.js';
import { SangreRenderer }      from './sangre.js';
import { RubiRenderer }        from './rubi.js';
import { EsmeraldaRenderer }   from './esmeralda.js';
import { EldergloomRenderer }  from './eldergloom.js';
import { DarkFantasyRenderer } from './dark-fantasy.js';

const RENDERERS = {
  'theme-aurora':       AuroraRenderer,
  'theme-cosmos':       CosmosRenderer,
  'theme-lunar':        LunarRenderer,
  'theme-sangre':       SangreRenderer,
  'theme-rubi':         RubiRenderer,
  'theme-esmeralda':    EsmeraldaRenderer,
  'theme-eldergloom':   EldergloomRenderer,
  'theme-dark-fantasy': DarkFantasyRenderer,
};

let activeRenderer = null;
let activeKey      = null;

function activateCanvasBackground() {
  // Leer el color --page definido por el tema activo en <html>
  const pageColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--page').trim();

  // Mover el fondo de <body> a <html>; <body> queda transparente
  document.documentElement.style.background = pageColor || '#0d0c1a';
  document.body.style.background            = 'transparent';
}

function restoreBackground() {
  document.documentElement.style.background = '';
  document.body.style.background            = '';
}

function syncRenderer() {
  const classes  = document.documentElement.classList;
  const nextKey  = Object.keys(RENDERERS).find(cls => classes.contains(cls)) ?? null;

  if (nextKey === activeKey) return;

  // Detener renderer anterior y restaurar fondos
  if (activeRenderer) {
    activeRenderer.stop();
    activeRenderer = null;
    restoreBackground();
  }

  activeKey = nextKey;

  if (activeKey) {
    activateCanvasBackground();
    activeRenderer = RENDERERS[activeKey];
    activeRenderer.start();
  }
}

// Observar cambios de clase en <html> (se dispara con aplicarTema())
const observer = new MutationObserver(syncRenderer);
observer.observe(document.documentElement, {
  attributes:      true,
  attributeFilter: ['class'],
});

// Sincronizar en carga (el tema puede ya estar activo desde localStorage)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncRenderer);
} else {
  syncRenderer();
}
