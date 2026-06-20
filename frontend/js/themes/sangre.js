// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/sangre.js
//  Sangre & Tinta — renderizador Canvas 2D
//
//  DOS CANVAS independientes:
//    bgCanvas   z-index:-1   → atmósfera, motas, wisps, blooms
//    overCanvas z-index:9998 → ripples del cursor (sobre toda la UI)
//
//  Fondo: #f2e8d8 pergamino.  Todo debe ser OSCURO para ser visible.
// ════════════════════════════════════════════════════════════════

const SangreRenderer = (() => {

  // ── Dos canvas ──────────────────────────────────────────────────
  let bgCanvas = null,   bgCtx   = null;   // fondo atmosférico
  let overCanvas = null, overCtx = null;   // ripples sobre la UI

  let raf    = null;
  let t      = 0;

  let motes       = null;
  let wisps       = null;
  const blooms    = [];
  const ripples   = [];
  let nextBloomIn = 40;
  let lastRipple  = 0;
  let _onMove     = null;

  // ════════════════════════════════════════════════════════════════
  //  INIT partículas
  // ════════════════════════════════════════════════════════════════
  function initMotes(W, H) {
    motes = Array.from({ length: 110 }, () => {
      const roll = Math.random();
      const type = roll < 0.52 ? 'ink'
                 : roll < 0.78 ? 'crimson'
                 :                'sepia';
      return {
        x:     Math.random() * W,
        y:     Math.random() * H,
        size:  0.50 + Math.random() * 1.60,
        vx:    (Math.random() - 0.5) * 0.065,
        vy:     0.018 + Math.random() * 0.050,
        alpha:  type === 'ink'     ? 0.10 + Math.random() * 0.18
              : type === 'crimson' ? 0.08 + Math.random() * 0.14
              :                      0.07 + Math.random() * 0.12,
        phase:  Math.random() * Math.PI * 2,
        wobb:   0.00050 + Math.random() * 0.00130,
        type,
      };
    });
  }

  function initWisps(W, H) {
    wisps = Array.from({ length: 14 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      len:   4.5 + Math.random() * 11,
      angle: (Math.random() - 0.5) * 0.55,
      vx:    (Math.random() - 0.5) * 0.040,
      vy:     0.008 + Math.random() * 0.022,
      alpha:  0.20 + Math.random() * 0.28,
      phase:  Math.random() * Math.PI * 2,
      wobb:   0.00040 + Math.random() * 0.00085,
    }));
  }

  function spawnBloom(W, H, ox, oy) {
    return {
      x:     ox ?? (W * 0.08 + Math.random() * W * 0.84),
      y:     oy ?? (H * 0.08 + Math.random() * H * 0.84),
      r:     1.0,
      maxR:  16 + Math.random() * 60,
      alpha: 0.10 + Math.random() * 0.14,
      life:  1.0,
      speed: 0.12 + Math.random() * 0.20,
      type:  Math.random() < 0.55 ? 'ink' : 'crimson',
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  BG CANVAS — atmósfera
  // ════════════════════════════════════════════════════════════════
  function drawAtmosphere(W, H) {
    const pulse = 0.84 + 0.16 * Math.sin(t * 0.000280);

    const corners = [[0,0],[W,0],[0,H],[W,H]];
    corners.forEach(([cx,cy]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.40);
      g.addColorStop(0.00, `rgba(70, 35, 14, ${0.16 * pulse})`);
      g.addColorStop(0.45, `rgba(50, 22,  8, ${0.08 * pulse})`);
      g.addColorStop(1.00,  'rgba(0,0,0,0)');
      bgCtx.fillStyle = g;
      bgCtx.fillRect(0, 0, W, H);
    });

    const stain = bgCtx.createRadialGradient(W * 0.74, H * 0.60, 0, W * 0.74, H * 0.60, W * 0.30);
    stain.addColorStop(0.00, `rgba(120, 12, 34, ${0.09 * pulse})`);
    stain.addColorStop(0.50, `rgba( 85,  6, 20, ${0.045 * pulse})`);
    stain.addColorStop(1.00,  'rgba(0,0,0,0)');
    bgCtx.fillStyle = stain;
    bgCtx.fillRect(0, 0, W, H);

    const stain2 = bgCtx.createRadialGradient(W * 0.22, H * 0.42, 0, W * 0.22, H * 0.42, W * 0.22);
    stain2.addColorStop(0.00, `rgba(14, 4, 10, ${0.06 * pulse})`);
    stain2.addColorStop(0.55, `rgba( 8, 2,  5, ${0.025 * pulse})`);
    stain2.addColorStop(1.00,  'rgba(0,0,0,0)');
    bgCtx.fillStyle = stain2;
    bgCtx.fillRect(0, 0, W, H);

    const vig = bgCtx.createRadialGradient(W / 2, H / 2, H * 0.30, W / 2, H / 2, W * 0.72);
    vig.addColorStop(0.00, 'rgba(0,0,0,0)');
    vig.addColorStop(0.60, `rgba(55, 26, 10, ${0.06 * pulse})`);
    vig.addColorStop(1.00, `rgba(35, 14,  4, ${0.22 * pulse})`);
    bgCtx.fillStyle = vig;
    bgCtx.fillRect(0, 0, W, H);
  }

  function drawMotes(W, H) {
    bgCtx.save();
    motes.forEach(p => {
      const tw = 0.50 + 0.50 * Math.sin(t * p.wobb + p.phase);
      const al = p.alpha * (0.60 + 0.40 * tw);

      if (p.type === 'ink')
        bgCtx.fillStyle = `rgba(14, 4, 10, ${al})`;
      else if (p.type === 'crimson')
        bgCtx.fillStyle = `rgba(110, 12, 32, ${al})`;
      else
        bgCtx.fillStyle = `rgba(80,  38, 16, ${al})`;

      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      bgCtx.fill();

      p.x += p.vx + Math.sin(t * p.wobb + p.phase) * 0.036;
      p.y += p.vy;
      if (p.y > H + 5)  { p.y = -5;  p.x = Math.random() * W; }
      if (p.x < -5)     { p.x = W + 5; }
      if (p.x > W + 5)  { p.x = -5; }
    });
    bgCtx.restore();
  }

  function drawWisps(W, H) {
    bgCtx.save();
    wisps.forEach(w => {
      const tw = 0.55 + 0.45 * Math.sin(t * w.wobb + w.phase);
      const al = w.alpha * tw;

      bgCtx.save();
      bgCtx.translate(w.x, w.y);
      bgCtx.rotate(w.angle + Math.sin(t * w.wobb * 0.7 + w.phase) * 0.10);

      bgCtx.strokeStyle = `rgba(30, 6, 14, ${al})`;
      bgCtx.lineWidth   = 0.90;
      bgCtx.lineCap     = 'round';
      bgCtx.beginPath();
      bgCtx.moveTo(-w.len / 2, 0);
      bgCtx.quadraticCurveTo(0, -w.len * 0.07, w.len / 2, 0);
      bgCtx.stroke();

      bgCtx.strokeStyle = `rgba(30, 6, 14, ${al * 0.22})`;
      bgCtx.lineWidth   = 2.8;
      bgCtx.stroke();

      bgCtx.restore();

      w.x += w.vx + Math.sin(t * 0.00080 + w.phase) * 0.024;
      w.y += w.vy;
      if (w.y > H + 5)  { w.y = -5;  w.x = Math.random() * W; }
      if (w.x < -5)     { w.x = W + 5; }
      if (w.x > W + 5)  { w.x = -5; }
    });
    bgCtx.restore();
  }

  function drawBlooms() {
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i];
      const al = b.alpha * b.life * b.life;
      if (al < 0.004) { blooms.splice(i, 1); continue; }

      const grad = bgCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      if (b.type === 'ink') {
        grad.addColorStop(0.00, `rgba(12, 3, 8, ${al})`);
        grad.addColorStop(0.40, `rgba( 8, 1, 4, ${al * 0.52})`);
        grad.addColorStop(1.00,  'rgba(0,0,0,0)');
      } else {
        grad.addColorStop(0.00, `rgba(100, 10, 28, ${al})`);
        grad.addColorStop(0.40, `rgba( 68,  5, 16, ${al * 0.50})`);
        grad.addColorStop(1.00,  'rgba(0,0,0,0)');
      }

      bgCtx.beginPath();
      bgCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      bgCtx.fillStyle = grad;
      bgCtx.fill();

      b.r    += b.speed;
      b.life -= 0.0022 + (b.r / b.maxR) * 0.0014;
      if (b.life <= 0 || b.r >= b.maxR) blooms.splice(i, 1);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  OVERLAY CANVAS — ripples sobre toda la UI
  //  z-index:9998, pointer-events:none → visible encima de posts,
  //  sidebars y topbar sin bloquear ningún clic.
  // ════════════════════════════════════════════════════════════════
  function drawRipples(W, H) {
    overCtx.clearRect(0, 0, W, H);

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];

      // Gota principal
      overCtx.save();
      overCtx.beginPath();
      overCtx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      overCtx.strokeStyle = `rgba(28, 5, 12, ${rp.life * 0.32})`;
      overCtx.lineWidth   = 1.0;
      overCtx.stroke();

      // Anillo interior más pequeño
      if (rp.r > 10) {
        overCtx.beginPath();
        overCtx.arc(rp.x, rp.y, rp.r * 0.46, 0, Math.PI * 2);
        overCtx.strokeStyle = `rgba(28, 5, 12, ${rp.life * 0.14})`;
        overCtx.lineWidth   = 0.5;
        overCtx.stroke();
      }

      // Punto central — como la gota cayendo
      if (rp.r < 8) {
        const dropAlpha = (1 - rp.r / 8) * rp.life * 0.55;
        overCtx.beginPath();
        overCtx.arc(rp.x, rp.y, 2.2 * (1 - rp.r / 8), 0, Math.PI * 2);
        overCtx.fillStyle = `rgba(20, 4, 10, ${dropAlpha})`;
        overCtx.fill();
      }

      overCtx.restore();

      rp.r    += 0.50;
      rp.life -= 0.0100;
      if (rp.life <= 0) ripples.splice(i, 1);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  LOOP
  // ════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W = bgCanvas.width;
    const H = bgCanvas.height;

    // — BG canvas —
    bgCtx.clearRect(0, 0, W, H);
    drawAtmosphere(W, H);
    drawMotes(W, H);
    drawWisps(W, H);

    nextBloomIn--;
    if (nextBloomIn <= 0 && blooms.length < 14) {
      blooms.push(spawnBloom(W, H));
      nextBloomIn = 85 + Math.floor(Math.random() * 140);
    }
    drawBlooms();

    // — Overlay canvas —
    drawRipples(W, H);

    raf = requestAnimationFrame(frame);
  }

  // ════════════════════════════════════════════════════════════════
  //  RESIZE — sincroniza ambos canvas
  // ════════════════════════════════════════════════════════════════
  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    bgCanvas.width    = W;  bgCanvas.height    = H;
    overCanvas.width  = W;  overCanvas.height  = H;
    initMotes(W, H);
    initWisps(W, H);
  }

  // ════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      // Canvas de fondo — atmósfera detrás de todo
      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-sangre-bg';
      Object.assign(bgCanvas.style, {
        position: 'fixed', inset: '0',
        pointerEvents: 'none', zIndex: '-1',
      });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      // Canvas overlay — ripples encima de toda la UI
      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-sangre-over';
      Object.assign(overCanvas.style, {
        position: 'fixed', inset: '0',
        pointerEvents: 'none', zIndex: '9998',
      });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      // Blooms iniciales
      for (let i = 0; i < 7; i++) {
        const b = spawnBloom(bgCanvas.width, bgCanvas.height);
        b.r    = Math.random() * b.maxR * 0.55;
        b.life = 0.55 + Math.random() * 0.45;
        blooms.push(b);
      }
      nextBloomIn = 50;

      // Cursor — genera ripple en overlay con throttle 180 ms
      _onMove = (e) => {
        const now = performance.now();
        if (now - lastRipple > 180 && ripples.length < 10) {
          lastRipple = now;
          ripples.push({ x: e.clientX, y: e.clientY, r: 1.0, life: 1.0 });
        }
      };
      document.addEventListener('mousemove', _onMove, { passive: true });
      window.addEventListener('resize', resize);
      t = 0;
      frame();
    },

    stop() {
      if (!bgCanvas) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (_onMove) { document.removeEventListener('mousemove', _onMove); _onMove = null; }
      bgCanvas.remove();   bgCanvas = bgCtx   = null;
      overCanvas.remove(); overCanvas = overCtx = null;
      raf = null;
      motes = wisps = null;
      blooms.length = ripples.length = 0;
      lastRipple = 0;
      t = 0;
    },
  };
})();

export { SangreRenderer };
