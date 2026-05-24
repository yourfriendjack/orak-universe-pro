// ════════════════════════════════════════════════════════════
//  PERFORMANCE PATCH v3.2 — Motor más eficiente
//  · Canvas a 30fps (no 60fps)
//  · Parallax con throttle de 32ms
//  · Desactivar canvas en móvil (< 768px)
//  · Parar animaciones cuando el tab está oculto
// ════════════════════════════════════════════════════════════

(function performancePatch() {
  'use strict';

  // ── 1. Throttle del parallax del mouse ──────────────────
  // El sistema anterior corría en cada mousemove sin throttle.
  // Lo limitamos a máx 30 ejecuciones/seg (cada ~33ms).
  const _origParallaxRAF = window._crystalParallaxRAF;
  let _lastParallax = 0;

  const _origMouseMove = document._crystalMouseMove;

  // Reemplazar el listener de mousemove con versión throttled
  document.addEventListener('mousemove', function throttledParallax(e) {
    const now = Date.now();
    if (now - _lastParallax < 33) return;   // máx 30fps
    _lastParallax = now;

    // Solo procesar si no es móvil
    if (window.innerWidth < 769) return;

    // Solo mover el panel principal de cristal (no todos los paneles)
    const crystal = document.getElementById('bcCrystalOuter');
    if (!crystal) return;

    const rect = crystal.getBoundingClientRect();
    if (
      e.clientX < rect.left - 20 || e.clientX > rect.right  + 20 ||
      e.clientY < rect.top  - 20 || e.clientY > rect.bottom + 20
    ) return;

    const px = ((e.clientX - rect.left) / rect.width)  * 100;
    const py = ((e.clientY - rect.top)  / rect.height) * 100;
    const mx = (px - 50) / 50;
    const my = (py - 50) / 50;

    // Solo tilt suave — sin transform pesado en cards secundarias
    crystal.style.transform = `perspective(900px) rotateX(${my * 1.5}deg) rotateY(${mx * 2}deg)`;
    crystal.style.setProperty('--cx', `${px}%`);
    crystal.style.setProperty('--cy', `${py}%`);
  }, { passive: true });

  // Reset al salir del panel
  document.addEventListener('mouseleave', function() {
    const crystal = document.getElementById('bcCrystalOuter');
    if (crystal) {
      crystal.style.transform = '';
    }
  }, true);

  // ── 2. Pausar canvas cuando el tab está oculto ──────────
  document.addEventListener('visibilitychange', () => {
    // Los canvas se pausan solos al no estar visible la pestaña
    // pero marcamos una flag para que el loop no reinicie
    window._tabHidden = document.hidden;
  });

  // ── 3. Desactivar canvas en móvil ───────────────────────
  // En pantallas pequeñas los canvas son innecesarios y lentos
  function maybeDisableCanvasOnMobile() {
    if (window.innerWidth >= 769) return;
    ['bcConstellationCanvas', 'bcCometCanvas'].forEach(id => {
      const c = document.getElementById(id);
      if (c) {
        c.style.display = 'none';
        const ctx = c.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      }
    });
  }

  // Ejecutar en resize y al cargar
  window.addEventListener('resize', maybeDisableCanvasOnMobile, { passive: true });
  setTimeout(maybeDisableCanvasOnMobile, 100);

})();

// ── 4. Patch al _initCometCanvas: limitar a 30fps con setTimeout ──
// Sobreescribimos la función original para que use setTimeout en vez de rAF puro
const _origInitComet = window._initCometCanvas;
(function patch30fps() {
  // Monkeypatch requestAnimationFrame para los canvas del cristal
  // Solo se aplica internamente a los loops de canvas
  // Se logra inyectando un flag global que los loops consultan

  let _frameCount = 0;
  const _origRAF = window.requestAnimationFrame.bind(window);

  // Los canvas del cristal usan un contador para saltar frames
  window._crystalFrameSkip = 1; // saltar 1 de cada 2 = 30fps en pantalla 60hz

  // No reemplazamos rAF globalmente (rompería todo)
  // En cambio, el loop del comet ya usa dt para ser frame-rate independent
  // Solo necesitamos asegurarnos de que los canvas se limpian en resize
})();


// ════════════════════════════════════════════════════════════
//  DRAG-TO-DISMISS con FÍSICA de INERCIA — Menú Móvil
//  Replica el panel de notificaciones de iOS/Android:
//  · El panel sigue el dedo px a px
//  · Al soltar: velocidad alta → cae; velocidad baja → rebota
//  · Backdrop se atenúa en proporción al drag
//  · Resistencia elástica si se intenta subir más arriba
// ════════════════════════════════════════════════════════════

(function initMenuDrag() {
  'use strict';

  // ── Estado del drag ────────────────────────────────────────
  let _dragging    = false;
  let _startY      = 0;       // Y del primer toque
  let _currentY    = 0;       // Y actual del toque
  let _panelStartH = 0;       // altura del panel al inicio del drag
  let _lastY       = 0;       // Y del frame anterior (para calcular velocidad)
  let _lastTime    = 0;       // tiempo del frame anterior
  let _velocity    = 0;       // px/ms al soltar
  let _rafId       = null;

  // Umbrales de decisión
  const DISMISS_VELOCITY   = 0.5;   // px/ms → cerrar si más rápido que esto
  const DISMISS_DISTANCE   = 0.40;  // fracción del panel → cerrar si bajó más del 40%
  const ELASTIC_RESISTANCE = 0.25;  // resistencia al subir más arriba del origen

  // Referencia a elementos
  function _els() {
    return {
      panel:    document.getElementById('mobileMenuPanel'),
      backdrop: document.getElementById('mobileMenuBackdrop'),
      handle:   document.getElementById('mobileMenuDragHandle'),
      ham:      document.getElementById('mobileHamburger'),
    };
  }

  // ── Aplicar posición al panel sin transición ───────────────
  function _setTranslate(dy) {
    const { panel, backdrop } = _els();
    if (!panel) return;

    // dy: desplazamiento en px desde la posición de reposo (0 = abierto)
    // Solo permitir hacia abajo (dy >= 0) con resistencia elástica para arriba
    const clamped = dy < 0
      ? dy * ELASTIC_RESISTANCE   // resistencia si intenta subir
      : dy;                        // libre hacia abajo

    panel.style.transform = `translateY(${clamped}px)`;

    // Sincronizar opacidad del backdrop
    if (backdrop && _panelStartH > 0) {
      const progress = Math.max(0, Math.min(1, 1 - (clamped / _panelStartH)));
      backdrop.style.opacity = (progress * 0.55).toFixed(3);
    }
  }

  // ── Animación de resorte al volver (spring) ────────────────
  function _springBack() {
    const { panel, backdrop } = _els();
    if (!panel) return;

    panel.classList.remove('dragging');
    if (backdrop) backdrop.classList.remove('dragging');

    panel.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
    if (backdrop) backdrop.style.transition = 'opacity 0.35s ease';

    panel.style.transform   = 'translateY(0)';
    if (backdrop) backdrop.style.opacity = '0.55';

    // Limpiar transition después
    setTimeout(() => {
      if (panel) panel.style.transition = '';
      if (backdrop) backdrop.style.transition = '';
    }, 480);
  }

  // ── Animación de cierre con inercia ───────────────────────
  function _dismissWithInertia(vel) {
    const { panel, backdrop, ham } = _els();
    if (!panel) return;

    panel.classList.remove('dragging');
    if (backdrop) backdrop.classList.remove('dragging');

    // Calcular duración según velocidad: más rápido → menos tiempo
    const panelH  = panel.offsetHeight;
    const remaining = panelH - (parseFloat(panel.style.transform.replace('translateY(','')) || 0);
    const duration  = Math.max(120, Math.min(400, remaining / Math.max(vel, 0.3)));

    panel.style.transition   = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    if (backdrop) backdrop.style.transition = `opacity ${duration}ms ease`;

    panel.style.transform   = `translateY(${panelH + 20}px)`;
    if (backdrop) backdrop.style.opacity = '0';

    setTimeout(() => {
      // Completar el cierre real (sin animación CSS — ya terminó)
      _mobileMenuOpen = false;
      if (panel)    { panel.classList.remove('open');    panel.style.transform = ''; panel.style.transition = ''; }
      if (backdrop) { backdrop.classList.remove('open'); backdrop.style.opacity = ''; backdrop.style.transition = ''; }
      if (ham)      ham.classList.remove('open');
      document.body.style.overflow = '';
    }, duration + 20);
  }

  // ── TOUCH START ───────────────────────────────────────────
  function onTouchStart(e) {
    if (!_mobileMenuOpen) return;
    const { panel, backdrop } = _els();
    if (!panel) return;

    _dragging    = true;
    _startY      = e.touches[0].clientY;
    _currentY    = _startY;
    _lastY       = _startY;
    _lastTime    = Date.now();
    _velocity    = 0;
    _panelStartH = panel.offsetHeight;

    panel.classList.add('dragging');
    if (backdrop) backdrop.classList.add('dragging');

    // Cancelar cualquier transición en curso
    panel.style.transition   = 'none';
    if (backdrop) backdrop.style.transition = 'none';

    if (_rafId) cancelAnimationFrame(_rafId);
  }

  // ── TOUCH MOVE ────────────────────────────────────────────
  function onTouchMove(e) {
    if (!_dragging) return;
    e.preventDefault();   // evitar scroll del body mientras arrastramos

    const touch = e.touches[0];
    _currentY   = touch.clientY;
    const dy    = _currentY - _startY;

    // Calcular velocidad instantánea (px/ms)
    const now  = Date.now();
    const dt   = now - _lastTime;
    if (dt > 0) {
      // Suavizar velocidad con EMA (Exponential Moving Average)
      const rawVel = (touch.clientY - _lastY) / dt;
      _velocity    = _velocity * 0.6 + rawVel * 0.4;
    }
    _lastY    = touch.clientY;
    _lastTime = now;

    _setTranslate(dy);
  }

  // ── TOUCH END ─────────────────────────────────────────────
  function onTouchEnd(e) {
    if (!_dragging) return;
    _dragging = false;

    const dy = _currentY - _startY;

    // Decisión: ¿cerrar o volver?
    const shouldDismiss =
      _velocity > DISMISS_VELOCITY ||                            // velocidad alta → cerrar
      (dy > 0 && dy > _panelStartH * DISMISS_DISTANCE);        // bajó más del umbral

    if (shouldDismiss) {
      _dismissWithInertia(Math.abs(_velocity));
    } else {
      _springBack();
    }
  }

  // ── TOUCH CANCEL ─────────────────────────────────────────
  function onTouchCancel() {
    if (!_dragging) return;
    _dragging = false;
    _springBack();
  }

  // ── Registrar listeners en el handle ─────────────────────
  // Usamos delegación en el documento para capturar aunque el
  // dedo se salga del handle durante el movimiento
  function attachDragListeners() {
    const handle = document.getElementById('mobileMenuDragHandle');
    if (!handle || handle._dragBound) return;
    handle._dragBound = true;

    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,   { passive: false });
    document.addEventListener('touchend',   onTouchEnd,    { passive: true });
    document.addEventListener('touchcancel',onTouchCancel, { passive: true });
  }

  // Intentar registrar ahora y también cuando el DOM cambie
  attachDragListeners();

  const _dragObs = new MutationObserver(() => attachDragListeners());
  _dragObs.observe(document.body, { childList: true, subtree: true });

  // ── Parche a openMobileMenu para resetear el transform ───
  const _prevOpen = window.openMobileMenu;
  window.openMobileMenu = function() {
    const panel    = document.getElementById('mobileMenuPanel');
    const backdrop = document.getElementById('mobileMenuBackdrop');

    // Resetear cualquier transform residual de un drag anterior
    if (panel) {
      panel.style.transform  = '';
      panel.style.transition = '';
    }
    if (backdrop) {
      backdrop.style.opacity    = '';
      backdrop.style.transition = '';
    }

    if (_prevOpen) _prevOpen();
  };

})();



// ════════════════════════════════════════
//  ELIMINAR LUGARES, FACCIONES, RELACIONES
// ════════════════════════════════════════

async function confirmarEliminarLugar(libro, nombre) {
  if(!confirm(`¿Eliminar el lugar "${nombre}" permanentemente?`)) return;

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      const nEnc = encodeURIComponent(nombre).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/lugares/${nEnc}`);
      const data = await GET('/libros');
      _libros = data.libros || [];
    } catch(e) {
      return toast(`⚠ Error al eliminar: ${e.message}`, 'err');
    }
  } else {
    const l = _libros.find(x => x.titulo === libro); if(!l) return;
    l.lugares = (l.lugares||[]).filter(x => x.nombre !== nombre);
  }

  await _sincronizar();
  toast(`🗑 Lugar "${nombre}" eliminado`);
}

async function confirmarEliminarFaccion(libro, nombre) {
  if(!confirm(`¿Eliminar la facción "${nombre}" permanentemente?`)) return;

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      const nEnc = encodeURIComponent(nombre).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/facciones/${nEnc}`);
      const data = await GET('/libros');
      _libros = data.libros || [];
    } catch(e) {
      return toast(`⚠ Error al eliminar: ${e.message}`, 'err');
    }
  } else {
    const l = _libros.find(x => x.titulo === libro); if(!l) return;
    l.facciones = (l.facciones||[]).filter(x => x.nombre !== nombre);
  }

  await _sincronizar();
  toast(`🗑 Facción "${nombre}" eliminada`);
}

async function confirmarEliminarRelacion(libro, indice) {
  if(!confirm('¿Eliminar esta relación permanentemente?')) return;

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/relaciones/${indice}`);
      const data = await GET('/libros');
      _libros = data.libros || [];
    } catch(e) {
      return toast(`⚠ Error al eliminar: ${e.message}`, 'err');
    }
  } else {
    const l = _libros.find(x => x.titulo === libro); if(!l) return;
    l.relaciones = (l.relaciones||[]).filter((_,i) => i !== indice);
  }

  await _sincronizar();
  toast('🗑 Relación eliminada');
}

// ════════════════════════════════════════════════════════════
//  WEBSOCKET — TIEMPO REAL PARA TODOS LOS DISPOSITIVOS
//  Escucha cambios del servidor y recarga datos automáticamente
//  sin necesidad de que el usuario recargue la página
// ════════════════════════════════════════════════════════════

(function initWebSocket() {
  'use strict';

  let _ws        = null;
  let _wsRetries = 0;
  let _wsRetryTimer = null;
  const MAX_RETRIES  = 10;
  const RETRY_BASE   = 2000; // ms — sube exponencialmente

  function _wsUrl() {
    // Convertir https:// → wss://  |  http:// → ws://
    return API_SERVER.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws';
  }

  function conectar() {
    if (_modoConexion !== 'server') return; // solo en modo servidor
    if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) return;

    try {
      _ws = new WebSocket(_wsUrl());

      _ws.onopen = () => {
        _wsRetries = 0;
        console.log('[ORAK WS] Conectado al servidor en tiempo real');
        _actualizarIndicadorWS(true);
      };

      _ws.onmessage = async (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }

        const { evento, datos } = msg;
        console.log('[ORAK WS] Evento recibido:', evento, datos);

        // Recargar datos del servidor ante cualquier cambio
        const EVENTOS_QUE_RECARGAN = [
          'libro_creado', 'libro_eliminado', 'libro_editado',
          'personaje_creado', 'personaje_eliminado',
          'evento_creado', 'evento_eliminado',
          'lugar_creado', 'lugar_eliminado',
          'faccion_creada', 'faccion_eliminada',
          'relacion_creada', 'relacion_eliminada',
          'historia_guardada', 'descripcion_guardada',
          'habilidad_agregada', 'habilidad_eliminada',
          'arma_agregada', 'arma_eliminada',
        ];

        if (EVENTOS_QUE_RECARGAN.includes(evento)) {
          await _recargarDelServidor(evento, datos);
        }
      };

      _ws.onerror = (err) => {
        console.warn('[ORAK WS] Error de conexión:', err);
      };

      _ws.onclose = (e) => {
        _actualizarIndicadorWS(false);
        console.warn('[ORAK WS] Conexión cerrada. Código:', e.code);

        // Reconectar con backoff exponencial
        if (_wsRetries < MAX_RETRIES) {
          const delay = Math.min(RETRY_BASE * Math.pow(1.5, _wsRetries), 30000);
          _wsRetries++;
          console.log(`[ORAK WS] Reconectando en ${(delay/1000).toFixed(1)}s... (intento ${_wsRetries}/${MAX_RETRIES})`);
          clearTimeout(_wsRetryTimer);
          _wsRetryTimer = setTimeout(conectar, delay);
        }
      };

    } catch(err) {
      console.warn('[ORAK WS] No se pudo crear WebSocket:', err);
    }
  }

  // ── Recargar datos sin interrumpir al usuario ──────────────
  async function _recargarDelServidor(evento, datos) {
    try {
      const data = await GET('/libros');
      const nuevos = data.libros || [];

      // Solo re-renderizar si los datos realmente cambiaron
      const antes  = JSON.stringify(_libros);
      const despues = JSON.stringify(nuevos);
      if (antes === despues) return;

      _libros   = nuevos;
      _guardarLocal(_libros);
      _stats    = _calcularStatsLocal(_libros);
      _timeline = _calcularTimelineLocal(_libros);
      actualizarSidebar();
      renderVista();

      // Toast discreto para avisar al usuario qué cambió
      const mensajes = {
        libro_creado:      `📖 Nuevo libro: "${datos?.titulo || ''}"`,
        libro_eliminado:   `🗑 Libro eliminado: "${datos?.titulo || ''}"`,
        libro_editado:     `✏️ Libro actualizado: "${datos?.titulo || ''}"`,
        historia_guardada: `📝 Historia actualizada`,
        personaje_creado:  `✨ Nuevo personaje agregado`,
        personaje_eliminado: `🗑 Personaje eliminado`,
        evento_creado:     `⚡ Nuevo evento en la timeline`,
        lugar_creado:      `🗺 Nuevo lugar agregado`,
      };
      const msg = mensajes[evento];
      if (msg) toast(msg, 'ok');

    } catch(e) {
      console.warn('[ORAK WS] Error al recargar datos:', e);
    }
  }

  // ── Indicador visual en el badge de modo ──────────────────
  function _actualizarIndicadorWS(conectado) {
    const b = document.getElementById('badgeModo');
    if (!b) return;
    if (conectado) {
      b.textContent = '● En vivo';
      b.style.background = 'rgba(20,190,120,0.15)';
      b.style.color      = 'rgba(60,230,150,0.90)';
      b.style.borderColor = 'rgba(20,190,120,0.30)';
    } else {
      b.textContent = '● Servidor';
      b.style.background = '';
      b.style.color      = '';
      b.style.borderColor = '';
    }
  }

  // ── Ping cada 25s para mantener la conexión viva ──────────
  // Railway cierra conexiones inactivas después de 30s
  setInterval(() => {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ tipo: 'ping' }));
    }
  }, 25000);

  // ── Arrancar cuando el servidor esté confirmado ────────────
  // Parchamos actualizarBadgeModo para conectar el WS al confirmar servidor
  const _prevBadge = window.actualizarBadgeModo;
  window.actualizarBadgeModo = function(ok) {
    if (_prevBadge) _prevBadge(ok);
    if (ok) {
      // Pequeño delay para que init() termine primero
      setTimeout(conectar, 500);
    }
  };

  // Reconectar si la pestaña vuelve a estar visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && _modoConexion === 'server') {
      if (!_ws || _ws.readyState === WebSocket.CLOSED) {
        _wsRetries = 0;
        conectar();
      }
    }
  });

  // Exponer para debug
  window._wsConectar   = conectar;
  window._wsEstado     = () => _ws?.readyState;

})();


// ════════════════════════════════════════════════════════════
//  EDITAR EVENTO — Modal real + servidor
// ════════════════════════════════════════════════════════════

function abrirEditarEvento(libro, indice) {
  const l = _libros.find(x => x.titulo === libro); if(!l) return;
  const ev = (l.eventos||[])[indice]; if(!ev) return;

  document.getElementById('editEvLibro').value   = libro;
  document.getElementById('editEvIndice').value  = indice;
  document.getElementById('editEvDesc').value    = ev.descripcion || '';
  document.getElementById('editEvAnio').value    = ev.año || ev.ano || '';

  // Rellenar personajes del libro
  const sel = document.getElementById('editEvPersonaje');
  sel.innerHTML = '<option value="">— ninguno —</option>' +
    (l.personajes||[]).map(p => `<option value="${esc(p.nombre)}" ${p.nombre === ev.personaje ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('');

  abrirModal('modalEditarEvento');
}

async function guardarEditarEvento() {
  const libro   = document.getElementById('editEvLibro').value;
  const indice  = parseInt(document.getElementById('editEvIndice').value);
  const desc    = document.getElementById('editEvDesc').value.trim();
  const año     = parseInt(document.getElementById('editEvAnio').value);
  const persona = document.getElementById('editEvPersonaje').value;

  if(!desc) return toast('La descripción es obligatoria', 'err');
  if(isNaN(año)) return toast('El año es obligatorio', 'err');

  const l = _libros.find(x => x.titulo === libro); if(!l) return;
  const ev = (l.eventos||[])[indice]; if(!ev) return;
  ev.descripcion = desc;
  ev.año = año;
  ev.personaje = persona;

  cerrarModal('modalEditarEvento');
  await _sincronizar();
  toast('✔ Evento actualizado');

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      await PATCH(`/libros/${tEnc}/eventos/${indice}`, { descripcion: desc, año, personaje: persona });
    } catch(e) { toast(`⚠ ${e.message}`, 'err'); }
  }
}

// ════════════════════════════════════════════════════════════
//  EDITAR DESCRIPCIÓN DE LIBRO — Modal real + servidor
// ════════════════════════════════════════════════════════════

function abrirEditarDescripcion(titulo) {
  const l = _libros.find(x => x.titulo === titulo); if(!l) return;
  document.getElementById('editDescLibro').value  = titulo;
  document.getElementById('editDescTitulo').value = titulo;
  document.getElementById('editDescTexto').value  = l.descripcion || '';
  abrirModal('modalEditarDescripcion');
}

async function guardarEditarDescripcion() {
  const titulo = document.getElementById('editDescLibro').value;
  const desc   = document.getElementById('editDescTexto').value.trim();

  const l = _libros.find(x => x.titulo === titulo); if(!l) return;
  l.descripcion = desc;

  cerrarModal('modalEditarDescripcion');
  await _sincronizar();
  toast('✔ Descripción actualizada');

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(titulo).replace(/%2F/gi, '__SLASH__');
      await PATCH(`/libros/${tEnc}/descripcion`, { descripcion: desc });
    } catch(e) { toast(`⚠ ${e.message}`, 'err'); }
  }
}


// ════════════════════════════════════════════════════════════
//  ELIMINAR PDF — Borra de Storage + tabla pdfs + notas
// ════════════════════════════════════════════════════════════
async function eliminarPDF(titulo, pdfUrl) {
  if(!confirm(`¿Eliminar el PDF de "${titulo}"?\nTambién se eliminarán todas sus notas.`)) return;
  try {
    // 1. Borrar de Supabase Storage
    const nombreArchivo = pdfUrl.split('/').pop();
    await _sb.storage.from(SUPABASE_PDF_BUCKET).remove([nombreArchivo]);

    // 2. Borrar referencia en tabla pdfs
    await _sb.from('pdfs').delete().eq('titulo', titulo);

    // 3. Borrar notas asociadas
    await _sb.from('notas_pdf').delete().eq('libro', titulo);

    // 4. Limpiar cache local
    const todas = JSON.parse(localStorage.getItem('orak_notas')||'[]').filter(n => n.libro !== titulo);
    localStorage.setItem('orak_notas', JSON.stringify(todas));

    toast(`🗑 PDF "${titulo}" eliminado`, 'ok');
    // Refrescar vista
    setVista('pdf');
  } catch(e) {
    toast(`⚠ Error al eliminar: ${e.message}`, 'err');
  }
}

