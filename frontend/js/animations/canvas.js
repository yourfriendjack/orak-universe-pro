// ════════════════════════════════════════════════════════════
//  LIQUID CRYSTAL INTERACTION SYSTEM v3.0
//  · Parallax del mouse sobre paneles de cristal
//  · Transición "empañar/desempañar" entre vistas
//  · Gestos táctiles (swipe) para navegación móvil
//  · Navegación barra inferior móvil
// ════════════════════════════════════════════════════════════

// ── 1. PARALLAX DEL MOUSE ──────────────────────────────────
// Mueve el gradiente iridiscente en paneles .liquid-glass y
// .biblioteca-card conforme el mouse se desplaza sobre ellos.

(function initParallax() {
  'use strict';

  const SELECTORS = '.liquid-glass, .bc-crystal-outer, .biblioteca-card, .stat-card, .poll-card, .ranking-card, .currency-card, .modal, .card';
  let _raf = null;

  function applyParallax(panel, x, y) {
    const rect = panel.getBoundingClientRect();
    const px = ((x - rect.left) / rect.width)  * 100;
    const py = ((y - rect.top)  / rect.height) * 100;

    // Mover gradiente interno (via custom properties)
    panel.style.setProperty('--cx', `${px}%`);
    panel.style.setProperty('--cy', `${py}%`);

    // Reflejo iridiscente: inclinar transform del ::after via clase
    const mx = (px - 50) / 50;  // -1 → 1
    const my = (py - 50) / 50;
    panel.style.setProperty('--tilt-x', `${my * 4}deg`);
    panel.style.setProperty('--tilt-y', `${mx * -4}deg`);

    // Sutil cambio de perspectiva (transform sólo si no tiene animaciones activas)
    if (!panel.classList.contains('vista-transitioning')) {
      panel.style.transform = `perspective(800px) rotateX(${my * 1.2}deg) rotateY(${mx * 1.5}deg) translateZ(0)`;
    }
  }

  function resetParallax(panel) {
    panel.style.transform = '';
    panel.style.setProperty('--cx', '50%');
    panel.style.setProperty('--cy', '50%');
  }

  function onMouseMove(e) {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => {
      const panels = document.querySelectorAll(SELECTORS);
      panels.forEach(p => {
        const rect = p.getBoundingClientRect();
        if (
          e.clientX >= rect.left - 10 && e.clientX <= rect.right  + 10 &&
          e.clientY >= rect.top  - 10 && e.clientY <= rect.bottom + 10
        ) {
          applyParallax(p, e.clientX, e.clientY);
        }
      });
    });
  }

  function onMouseLeave(e) {
    // Solo resetear cuando el target es el panel mismo
    if (e.target && e.target.matches && e.target.matches(SELECTORS)) {
      resetParallax(e.target);
    }
  }

  // Attach (delegado al documento para capturar paneles dinámicos)
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave, true);

  // Reset transform al salir de cada panel
  document.addEventListener('mouseover', (e) => {
    const panels = document.querySelectorAll(SELECTORS);
    panels.forEach(p => {
      if (!p.contains(e.target) && p !== e.target) {
        // No resetear todavía — esperar mouseleave real del panel
      }
    });
  }, { passive: true });

  // Añadir listener de mouseleave a cada panel nuevo via MutationObserver
  function attachPanelListeners(root) {
    root.querySelectorAll(SELECTORS).forEach(panel => {
      if (panel._crystalBound) return;
      panel._crystalBound = true;
      panel.addEventListener('mouseleave', () => resetParallax(panel));
    });
  }

  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
          attachPanelListeners(n);
          if (n.matches && n.matches(SELECTORS)) resetParallax(n);
        }
      });
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  attachPanelListeners(document);
})();


// ── 2. TRANSICIÓN "EMPAÑAR / DESEMPAÑAR" ENTRE VISTAS ─────
// Intercepta setVista para animar el contenido central.

(function patchSetVista() {
  const _origSetVista = window.setVista;
  if (!_origSetVista) return;

  window.setVista = function(v) {
    const main = document.getElementById('mainContent');
    if (!main) { _origSetVista(v); return; }

    // Empañar (blur + desvanece)
    main.style.transition = 'opacity 0.25s ease, filter 0.25s ease';
    main.style.opacity = '0';
    main.style.filter  = 'blur(10px) saturate(40%)';

    setTimeout(() => {
      _origSetVista(v);
      // Desempañar
      main.style.transition = 'opacity 0.45s ease, filter 0.45s ease';
      main.style.opacity = '1';
      main.style.filter  = 'blur(0px) saturate(100%)';

      // Clase fade-in al contenido nuevo
      requestAnimationFrame(() => {
        main.classList.add('vista-fade-in');
        setTimeout(() => main.classList.remove('vista-fade-in'), 550);
      });

      // Actualizar barra móvil inferior
      _updateMobileNav(v);
    }, 260);
  };
})();


// ── 3. NAVEGACIÓN BARRA MÓVIL ─────────────────────────────

function mobileNavTo(vista) {
  setVista(vista);
  _updateMobileNav(vista);
}

function _updateMobileNav(vista) {
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const active = document.getElementById(`mnav-${vista}`);
  if (active) active.classList.add('active');
}


// ── 4. GESTOS TÁCTILES — SWIPE PARA LIBROS / HABILIDADES ──
// Detecta swipe izquierda/derecha para navegar entre vistas
// en pantallas táctiles móviles.

(function initSwipeNav() {
  'use strict';

  const VISTAS_ORDEN = ['feed', 'libros', 'personajes', 'timeline', 'facciones'];
  let _touchStartX = 0;
  let _touchStartY = 0;
  let _touchTime   = 0;

  document.addEventListener('touchstart', e => {
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
    _touchTime   = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _touchStartX;
    const dy = e.changedTouches[0].clientY - _touchStartY;
    const dt = Date.now() - _touchTime;

    // Ignorar si el swipe fue más vertical que horizontal, o demasiado lento
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
    if (Math.abs(dx) < 60) return;
    if (dt > 450) return;

    // No disparar si el toque empezó dentro de un scroll horizontal (carousel)
    const target = document.elementFromPoint(_touchStartX, _touchStartY);
    if (target && target.closest('.swipe-carousel, .timeline-wrap, .pdf-container, input, textarea, select')) return;

    // Solo en móvil (< 769px)
    if (window.innerWidth >= 769) return;

    const currentIdx = VISTAS_ORDEN.indexOf(window._vista || 'feed');
    if (currentIdx === -1) return;

    if (dx < -60) {
      // Swipe izquierda → siguiente vista
      const next = VISTAS_ORDEN[Math.min(currentIdx + 1, VISTAS_ORDEN.length - 1)];
      if (next !== window._vista) setVista(next);
    } else if (dx > 60) {
      // Swipe derecha → vista anterior
      const prev = VISTAS_ORDEN[Math.max(currentIdx - 1, 0)];
      if (prev !== window._vista) setVista(prev);
    }
  }, { passive: true });
})();


// ── 5. INDICADOR VISUAL DE SWIPE (feedback háptico) ────────
(function initSwipeFeedback() {
  let indicator = null;

  function showIndicator(dir) {
    if (indicator) indicator.remove();
    indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed; top: 50%; ${dir === 'left' ? 'right: 16px' : 'left: 16px'};
      transform: translateY(-50%);
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(212,175,55,0.20);
      border: 1px solid rgba(212,175,55,0.40);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; color: rgba(212,175,55,0.80);
      pointer-events: none; z-index: 9999;
      animation: swipeFade 0.4s ease forwards;
    `;
    indicator.textContent = dir === 'left' ? '›' : '‹';
    document.body.appendChild(indicator);
    setTimeout(() => { if (indicator) { indicator.remove(); indicator = null; } }, 400);
  }

  // Agregar estilo de animación
  const style = document.createElement('style');
  style.textContent = `@keyframes swipeFade { 0% { opacity:0; transform:translateY(-50%) scale(.7); } 40% { opacity:1; transform:translateY(-50%) scale(1); } 100% { opacity:0; transform:translateY(-50%) scale(1.1); } }`;
  document.head.appendChild(style);

  let _startX = 0;
  document.addEventListener('touchstart', e => { _startX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (window.innerWidth >= 769) return;
    const dx = e.touches[0].clientX - _startX;
    if (Math.abs(dx) > 40) showIndicator(dx < 0 ? 'left' : 'right');
  }, { passive: true });
})();


// ════════════════════════════════════════════════════════════
//  MENÚ HAMBURGUESA MÓVIL — PATCH v3.1
// ════════════════════════════════════════════════════════════

let _mobileMenuOpen = false;

function toggleMobileMenu() {
  _mobileMenuOpen ? closeMobileMenu() : openMobileMenu();
}

function openMobileMenu() {
  _mobileMenuOpen = true;
  const panel    = document.getElementById('mobileMenuPanel');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  const ham      = document.getElementById('mobileHamburger');

  if (panel)    panel.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
  if (ham)      ham.classList.add('open');

  document.body.style.overflow = 'hidden';

  // Actualizar contadores en el menú
  const cL = document.getElementById('mmCountLibros');
  const cP = document.getElementById('mmCountPersonajes');
  if (cL && typeof _stats !== 'undefined') cL.textContent = _stats.libros     || 0;
  if (cP && typeof _stats !== 'undefined') cP.textContent = _stats.personajes || 0;
}

function closeMobileMenu() {
  _mobileMenuOpen = false;
  const panel    = document.getElementById('mobileMenuPanel');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  const ham      = document.getElementById('mobileHamburger');

  if (panel)    panel.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  if (ham)      ham.classList.remove('open');

  document.body.style.overflow = '';
}

// Cerrar con tecla Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _mobileMenuOpen) closeMobileMenu();
});


// ════════════════════════════════════════════════════════════
//  CRYSTAL PANEL ENGINE — Panel Holográfico Biblioteca Activa
//  5 capas: Constelaciones · Iridiscente · Onda Dorada
//           Especular · Fresnel
// ════════════════════════════════════════════════════════════

function _initCrystalPanel() {
  _initConstellationCanvas();
  _initCometCanvas();
}

// ── CAPA 0: Constelaciones ─────────────────────────────────
function _initConstellationCanvas() {
  const canvas = document.getElementById('bcConstellationCanvas');
  if (!canvas) return;
  const outer = document.getElementById('bcCrystalOuter');
  if (!outer) return;

  canvas.width  = outer.offsetWidth;
  canvas.height = outer.offsetHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const rand = (a,b) => a + Math.random()*(b-a);

  // Generar estrellas
  const stars = Array.from({length: 55}, () => ({
    x: rand(0,W), y: rand(0,H),
    r: rand(0.4, 1.8),
    a: rand(0.15, 0.55),
    gold: Math.random() < 0.18,
    twinkleSpeed: rand(0.4, 1.2),
    twinkleOffset: rand(0, Math.PI*2)
  }));

  // Generar líneas de constelación (pares de estrellas cercanas)
  const lines = [];
  for (let i = 0; i < stars.length; i++) {
    for (let j = i+1; j < stars.length; j++) {
      const dx = stars[i].x - stars[j].x;
      const dy = stars[i].y - stars[j].y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 90 && Math.random() < 0.22) {
        lines.push([i, j, d]);
      }
    }
  }

  let t = 0;
  let raf;

  function drawConstellation() {
    ctx.clearRect(0, 0, W, H);
    t += 0.012;

    // Líneas de constelación
    lines.forEach(([a, b]) => {
      const sa = stars[a], sb = stars[b];
      const alpha = 0.06 + 0.04 * Math.sin(t * 0.3);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.strokeStyle = `rgba(212,185,140,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Estrellas
    stars.forEach(s => {
      const twinkle = 0.7 + 0.3 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
      const alpha   = s.a * twinkle;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = s.gold
        ? `rgba(212,175,55,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      ctx.fill();

      // Halo suave en estrellas grandes
      if (s.r > 1.2) {
        const grad = ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*5);
        grad.addColorStop(0, s.gold ? `rgba(212,175,55,${alpha*0.5})` : `rgba(200,220,255,${alpha*0.4})`);
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r*5, 0, Math.PI*2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    });

    raf = requestAnimationFrame(drawConstellation);
  }

  drawConstellation();

  // Limpiar cuando el panel se destruya
  const observer = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      cancelAnimationFrame(raf);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ── CAPA 2: Onda dorada (comet streak) ────────────────────
function _initCometCanvas() {
  const canvas = document.getElementById('bcCometCanvas');
  if (!canvas) return;
  const outer  = document.getElementById('bcCrystalOuter');
  if (!outer)  return;

  canvas.width  = outer.offsetWidth;
  canvas.height = outer.offsetHeight;
  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;

  // Parámetros de la onda — imita la imagen de referencia
  // Curva Bezier que va de izquierda-centro hacia derecha-arriba
  const comets = [
    {
      // Onda principal larga dorada
      progress: 0,
      speed: 0.0018,
      width: 2.2,
      length: 0.55,        // fracción de la curva que ocupa la cola
      colorA: 'rgba(212,175,55,0.85)',
      colorB: 'rgba(255,230,120,0.55)',
      colorC: 'rgba(180,140,20,0)',
      // Puntos de control Bezier (normalizados 0-1)
      p0: {x:0.05, y:0.52},
      p1: {x:0.30, y:0.48},
      p2: {x:0.62, y:0.38},
      p3: {x:0.90, y:0.28},
      delay: 0,
      loop: 8000,
    },
    {
      // Onda secundaria más delgada / iridiscente
      progress: 0.35,
      speed: 0.0014,
      width: 1.1,
      length: 0.40,
      colorA: 'rgba(180,220,255,0.50)',
      colorB: 'rgba(150,200,255,0.25)',
      colorC: 'rgba(100,160,255,0)',
      p0: {x:0.05, y:0.54},
      p1: {x:0.28, y:0.50},
      p2: {x:0.60, y:0.42},
      p3: {x:0.88, y:0.32},
      delay: 1200,
      loop: 9000,
    },
    {
      // Onda terciaria muy tenue / perla
      progress: 0.65,
      speed: 0.0022,
      width: 0.7,
      length: 0.30,
      colorA: 'rgba(255,255,255,0.30)',
      colorB: 'rgba(255,255,255,0.10)',
      colorC: 'rgba(255,255,255,0)',
      p0: {x:0.05, y:0.50},
      p1: {x:0.32, y:0.46},
      p2: {x:0.63, y:0.36},
      p3: {x:0.92, y:0.24},
      delay: 600,
      loop: 7500,
    }
  ];

  // Evaluar punto en Bezier cúbica
  function bezier(t, p0, p1, p2, p3, wh) {
    const u = 1 - t;
    return {
      x: (u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x) * wh.w,
      y: (u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y) * wh.h,
    };
  }

  // Construir segmentos de la curva (precalculado por comet)
  const STEPS = 80;
  comets.forEach(c => {
    c.pts = [];
    for (let i = 0; i <= STEPS; i++) {
      c.pts.push(bezier(i/STEPS, c.p0, c.p1, c.p2, c.p3, {w:W,h:H}));
    }
  });

  let lastTime = 0;
  let raf;

  function drawComets(ts) {
    const dt = Math.min(ts - lastTime, 50);
    lastTime  = ts;

    ctx.clearRect(0, 0, W, H);

    comets.forEach(c => {
      // Avanzar progreso
      c.progress = (c.progress + c.speed * (dt / 16.67)) % 1;

      const prog   = c.progress;
      const tailLen = c.length;

      // Rango de la cola en los puntos precalculados
      const headIdx = Math.floor(prog * STEPS);
      const tailIdx = Math.max(0, Math.floor((prog - tailLen) * STEPS));

      if (headIdx <= tailIdx) return;

      // Dibujar la cola como path con gradiente
      const ptSlice = c.pts.slice(tailIdx, headIdx + 1);
      if (ptSlice.length < 2) return;

      // Gradiente a lo largo de la curva
      const head = ptSlice[ptSlice.length - 1];
      const tail = ptSlice[0];
      const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0,   c.colorC);  // cola: transparente
      grad.addColorStop(0.5, c.colorB);  // medio
      grad.addColorStop(1,   c.colorA);  // cabeza: brillante

      ctx.beginPath();
      ctx.moveTo(ptSlice[0].x, ptSlice[0].y);
      for (let i = 1; i < ptSlice.length; i++) {
        ctx.lineTo(ptSlice[i].x, ptSlice[i].y);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth   = c.width;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.shadowColor  = c.colorA;
      ctx.shadowBlur   = c.width * 6;
      ctx.stroke();
      ctx.shadowBlur   = 0;

      // Punto de cabeza brillante
      const hx = head.x, hy = head.y;
      const headGrad = ctx.createRadialGradient(hx,hy,0,hx,hy,c.width*5);
      headGrad.addColorStop(0, c.colorA);
      headGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(hx, hy, c.width*4, 0, Math.PI*2);
      ctx.fillStyle = headGrad;
      ctx.fill();
    });

    raf = requestAnimationFrame(drawComets);
  }

  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(drawComets); });

  // Limpiar al destruirse
  const obs = new MutationObserver(() => {
    if (!document.contains(canvas)) { cancelAnimationFrame(raf); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// Re-inicializar en resize
window.addEventListener('resize', () => {
  const outer = document.getElementById('bcCrystalOuter');
  if (!outer) return;
  ['bcConstellationCanvas','bcCometCanvas'].forEach(id => {
    const c = document.getElementById(id);
    if (c) { c.width = outer.offsetWidth; c.height = outer.offsetHeight; }
  });
  _initCrystalPanel();
});


