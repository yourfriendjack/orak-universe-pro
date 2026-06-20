// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/rubi.js
//  Rubí — interior de una gema viva
//
//  bgCanvas  (z:-1)   → atmósfera carmesí, estrellas cálidas,
//                        polvo, columnas de luz (veins) y destellos de faceta
//  overCanvas (z:9998) → cursor: halo rosa + chispas de 4 puntas
// ════════════════════════════════════════════════════════════════

const RubiRenderer = (() => {

  let bgCanvas = null,   bgCtx   = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;
  let dust = null;

  // ── Cursor ──────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastSparkle = 0, _onMove = null;
  const sparkles = [];

  // ── Destellos de faceta (ambiente, espontáneos) ─────────────────────────
  const flashes = [];
  let nextFlashIn = 200;

  // ── Campo estelar cálido — 120 estrellas ────────────────────────────────
  const STARS = Array.from({ length: 120 }, (_, i) => ({
    x:     (i * 173.71 + 5.30) % 100,
    y:     (i * 127.37 + 8.10) % 90,
    r:     i % 9 === 0 ? 1.35 : i % 5 === 0 ? 0.95 : i % 3 === 0 ? 0.72 : 0.45,
    phase: i * 0.7131,
    spd:   0.000400 + (i % 7) * 0.000145,
    rose:  i % 5 === 0,
    warm:  i % 8 === 0,
  }));

  // ── Columnas de luz (veins verticales) ─────────────────────────────────
  //   Para cada y (0→H): x = W*baseX + W*a1*sin(y*f1 + t*s1)
  //   Gradiente horizontal — columna de carmesí que se mece
  const VEINS = [
    { r:188, g:22,  b:55,  baseX:.20, a1:.048, f1:.0038, s1:.00032, alpha:.58, halfW:.055 },
    { r:218, g:45,  b:88,  baseX:.46, a1:.040, f1:.0030, s1:.00026, alpha:.44, halfW:.048 },
    { r:235, g:78,  b:118, baseX:.66, a1:.055, f1:.0044, s1:.00040, alpha:.32, halfW:.042 },
    { r:155, g:12,  b:40,  baseX:.33, a1:.038, f1:.0034, s1:.00028, alpha:.26, halfW:.038 },
    { r:205, g:55,  b:95,  baseX:.80, a1:.048, f1:.0040, s1:.00036, alpha:.22, halfW:.035 },
    { r:145, g:8,   b:30,  baseX:.56, a1:.034, f1:.0026, s1:.00022, alpha:.18, halfW:.032 },
  ];

  // ── Polvo carmesí — 65 partículas ──────────────────────────────────────
  function initDust(W, H) {
    dust = Array.from({ length: 65 }, () => {
      const roll = Math.random();
      return {
        x:     Math.random() * W,
        y:     Math.random() * H,
        size:  0.32 + Math.random() * 0.95,
        vx:    (Math.random() - 0.5) * 0.042,
        vy:   -0.014 - Math.random() * 0.032,
        alpha: 0.07 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        type:  roll < 0.45 ? 'crimson' : roll < 0.74 ? 'rose' : 'deep',
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Atmósfera interna (luz difusa carmesí)
  // ════════════════════════════════════════════════════════════════════════
  function drawAtmosphere(W, H) {
    const pulse = 0.80 + 0.20 * Math.sin(t * 0.00036);

    [
      [W * 0.24, H * 0.18, W * 0.52],
      [W * 0.70, H * 0.14, W * 0.42],
      [W * 0.40, H * 0.68, W * 0.48],
      [W * 0.84, H * 0.54, W * 0.34],
    ].forEach(([cx, cy, r]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0.00, `rgba(182, 22, 52, ${0.052 * pulse})`);
      g.addColorStop(0.48, `rgba(138, 10, 30, ${0.022 * pulse})`);
      g.addColorStop(1.00,  'rgba(0,0,0,0)');
      bgCtx.fillStyle = g;
      bgCtx.fillRect(0, 0, W, H);
    });

    // Viñeta profunda
    const vig = bgCtx.createRadialGradient(W / 2, H / 2, H * 0.26, W / 2, H / 2, W * 0.74);
    vig.addColorStop(0,   'rgba(0,0,0,0)');
    vig.addColorStop(1,   `rgba(6, 0, 2, ${0.34 * pulse})`);
    bgCtx.fillStyle = vig;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Estrellas
  // ════════════════════════════════════════════════════════════════════════
  function drawStars(W, H) {
    bgCtx.save();
    STARS.forEach(s => {
      const sx = s.x / 100 * W;
      const sy = s.y / 100 * H;
      const tw = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * s.spd + s.phase));
      const al = tw * (0.22 + s.r * 0.18);
      bgCtx.fillStyle = s.rose ? `rgba(255,175,198,${al})`
                      : s.warm ? `rgba(255,215,198,${al})`
                      :           `rgba(255,198,210,${al})`;
      bgCtx.beginPath();
      bgCtx.arc(sx, sy, s.r, 0, Math.PI * 2);
      bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Polvo carmesí
  // ════════════════════════════════════════════════════════════════════════
  function drawDust(W, H) {
    if (!dust) return;
    bgCtx.save();
    dust.forEach(p => {
      const tw = 0.58 + 0.42 * Math.sin(t * 0.00128 + p.phase);
      bgCtx.fillStyle = p.type === 'crimson' ? `rgba(200, 38, 68, ${p.alpha * tw})`
                      : p.type === 'rose'    ? `rgba(238, 98, 138, ${p.alpha * tw})`
                      :                         `rgba(138, 10, 28, ${p.alpha * tw})`;
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      bgCtx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -4)    { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -4)    { p.x = W + 4; }
      if (p.x > W + 4) { p.x = -4; }
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Columnas de luz verticales (veins)
  //  Camino: para cada y→H, x = W*baseX + W*a1*sin(y*f1 + t*s1) ± halfW
  //  Gradiente horizontal — columna de carmesí que se mece suavemente
  // ════════════════════════════════════════════════════════════════════════
  function drawVein(vein, W, H) {
    const { r, g, b, baseX, a1, f1, s1, alpha, halfW } = vein;
    const pulse  = 0.60 + 0.40 * Math.sin(t * 0.00062 + baseX * 5.5);
    const veinPx = W * halfW;
    const N      = 120;

    bgCtx.save();
    bgCtx.globalAlpha = alpha * pulse;
    bgCtx.globalCompositeOperation = 'screen';

    bgCtx.beginPath();
    for (let i = 0; i <= N; i++) {
      const y = (i / N) * H;
      const x = W * baseX + W * a1 * Math.sin(y * f1 + t * s1) - veinPx;
      i === 0 ? bgCtx.moveTo(x, y) : bgCtx.lineTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const y = (i / N) * H;
      const x = W * baseX + W * a1 * Math.sin(y * f1 + t * s1) + veinPx;
      bgCtx.lineTo(x, y);
    }
    bgCtx.closePath();
    bgCtx.clip();

    const cx   = W * baseX;
    const grad = bgCtx.createLinearGradient(cx - veinPx * 1.6, 0, cx + veinPx * 1.6, 0);
    grad.addColorStop(0.00, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.22, `rgba(${r},${g},${b},0.18)`);
    grad.addColorStop(0.50, `rgba(${r},${g},${b},1.00)`);
    grad.addColorStop(0.78, `rgba(${r},${g},${b},0.18)`);
    grad.addColorStop(1.00, `rgba(${r},${g},${b},0)`);
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, W, H);
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Destellos de faceta (espontáneos, como luz capturada en la gema)
  // ════════════════════════════════════════════════════════════════════════
  function draw4PointStar(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255, 195, 212, 1)';
    ctx.lineCap     = 'round';
    // 4 brazos principales
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    // 4 brazos diagonales (más cortos)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * size * 0.52, Math.sin(a) * size * 0.52);
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    // Brillo central
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.44);
    grd.addColorStop(0, 'rgba(255,220,232,0.88)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.restore();
  }

  function updateFlashes(W, H) {
    nextFlashIn--;
    if (nextFlashIn <= 0 && flashes.length < 4) {
      flashes.push({
        x:    W * (0.08 + Math.random() * 0.84),
        y:    H * (0.06 + Math.random() * 0.78),
        size: 0,
        maxSize: 7 + Math.random() * 10,
        alpha: 0.50 + Math.random() * 0.28,
        life:  1.0,
      });
      nextFlashIn = 260 + Math.floor(Math.random() * 380);
    }

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.size = Math.min(f.maxSize, f.size + f.maxSize * 0.10);
      draw4PointStar(bgCtx, f.x, f.y, f.size, f.alpha * f.life);
      f.life -= 0.038;
      if (f.life <= 0) flashes.splice(i, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor: halo rosa suave + chispas de 4 puntas
  // ════════════════════════════════════════════════════════════════════════
  function drawSparkle(x, y, size, alpha) {
    overCtx.save();
    overCtx.translate(x, y);
    overCtx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      overCtx.beginPath();
      overCtx.moveTo(0, 0);
      overCtx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      overCtx.strokeStyle = `rgba(255, 178, 200, ${alpha})`;
      overCtx.lineWidth   = 0.7;
      overCtx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      overCtx.beginPath();
      overCtx.moveTo(0, 0);
      overCtx.lineTo(Math.cos(a) * size * 0.52, Math.sin(a) * size * 0.52);
      overCtx.strokeStyle = `rgba(255, 155, 180, ${alpha * 0.52})`;
      overCtx.lineWidth   = 0.45;
      overCtx.stroke();
    }
    overCtx.restore();
  }

  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    // Halo exterior rosa
    const outerGlow = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 46);
    outerGlow.addColorStop(0.00, 'rgba(215, 55, 88, 0.09)');
    outerGlow.addColorStop(0.45, 'rgba(175, 28, 58, 0.03)');
    outerGlow.addColorStop(1.00,  'rgba(0,0,0,0)');
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 46, 0, Math.PI * 2);
    overCtx.fillStyle = outerGlow;
    overCtx.fill();

    // Núcleo cercano
    const innerGlow = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 13);
    innerGlow.addColorStop(0.00, 'rgba(255, 205, 218, 0.20)');
    innerGlow.addColorStop(0.40, 'rgba(215, 55, 88,  0.10)');
    innerGlow.addColorStop(1.00,  'rgba(0,0,0,0)');
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 13, 0, Math.PI * 2);
    overCtx.fillStyle = innerGlow;
    overCtx.fill();

    // Punto central carmesí
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 1.8, 0, Math.PI * 2);
    overCtx.fillStyle = 'rgba(255, 205, 218, 0.55)';
    overCtx.fill();

    // Chispas de faceta
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      drawSparkle(s.x, s.y, s.size, s.alpha);
      if (s.growing) {
        s.size  = Math.min(s.maxSize, s.size + s.maxSize * 0.18);
        s.alpha = Math.min(s.maxAlpha, s.alpha + 0.12);
        if (s.size >= s.maxSize) s.growing = false;
      } else {
        s.alpha -= 0.015;
      }
      if (s.alpha <= 0) sparkles.splice(i, 1);
    }

    overCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LOOP
  // ════════════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W = bgCanvas.width;
    const H = bgCanvas.height;

    bgCtx.clearRect(0, 0, W, H);
    drawAtmosphere(W, H);
    drawStars(W, H);
    drawDust(W, H);
    VEINS.forEach(v => drawVein(v, W, H));
    updateFlashes(W, H);

    drawCursor(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width   = W;  bgCanvas.height   = H;
    overCanvas.width = W;  overCanvas.height = H;
    initDust(W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-rubi-bg';
      Object.assign(bgCanvas.style, {
        position: 'fixed', inset: '0',
        pointerEvents: 'none', zIndex: '-1',
      });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-rubi-over';
      Object.assign(overCanvas.style, {
        position: 'fixed', inset: '0',
        pointerEvents: 'none', zIndex: '9998',
      });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      _onMove = (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        const now = performance.now();
        if (now - lastSparkle > 160 && sparkles.length < 8) {
          lastSparkle = now;
          sparkles.push({
            x: mouseX, y: mouseY,
            size: 0.5,
            maxSize:  4 + Math.random() * 4,
            alpha:    0,
            maxAlpha: 0.20 + Math.random() * 0.12,
            growing:  true,
          });
        }
      };
      document.addEventListener('mousemove', _onMove, { passive: true });
      document.addEventListener('mouseleave', () => { mouseX = -999; mouseY = -999; });
      window.addEventListener('resize', resize);
      t = 0;
      frame();
    },

    stop() {
      if (!bgCanvas) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (_onMove) { document.removeEventListener('mousemove', _onMove); _onMove = null; }
      bgCanvas.remove();   bgCanvas   = bgCtx   = null;
      overCanvas.remove(); overCanvas = overCtx = null;
      dust = null;
      sparkles.length = flashes.length = 0;
      mouseX = mouseY = -999;
      raf = null; t = 0;
    },
  };
})();

export { RubiRenderer };
