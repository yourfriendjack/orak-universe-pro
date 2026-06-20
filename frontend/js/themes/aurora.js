// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/aurora.js
//  Aurora — entidad viva que envuelve ORAK Universe
//
//  Capas (de atrás hacia adelante, z-index:-1):
//    1. Campo estelar   — 200 estrellas con parpadeo y difracción
//    2. Polvo cósmico   — 80 partículas teal/cyan ultralentas
//    3. Niebla luminosa — 3 manchas de luz suave ambiental
//    4. Aurora dinámica — 9 bandas multi-armónico con 'screen'
//    5. Núcleo auroral  — esfera energética con plasma, halo y ciclo cromático
// ════════════════════════════════════════════════════════════════

const AuroraRenderer = (() => {

  // ── Dos canvas ──────────────────────────────────────────────────────────
  let canvas = null,     ctx     = null;  // z-index:-1  atmósfera + aurora
  let overCanvas = null, overCtx = null;  // z-index:9998 cursor glow (sobre la UI)

  let raf = null, t = 0;
  let dust = null;

  // ── Cursor ──────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastFrost = 0;
  let _onMove   = null;
  const frosts  = [];

  // ── Posición del núcleo ─────────────────────────────────────────────────
  const CORE_XF = 0.74;
  const CORE_YF = 0.32;
  const CORE_R  = 38;

  // ── Campo estelar — 200 estrellas deterministas ─────────────────────────
  const STARS = Array.from({ length: 200 }, (_, i) => {
    const x     = (i * 173.71 + 5.30) % 100;
    const y     = (i * 127.37 + 8.10) % 82;
    const r     = i % 9 === 0 ? 1.65 : i % 5 === 0 ? 1.20 : i % 3 === 0 ? 0.88 : 0.55;
    const phase = i * 0.7131;
    const spd   = 0.000480 + (i % 9) * 0.000160;
    return { x, y, r, phase, spd,
      warm: i % 11 === 0,
      cold: i % 7  === 0,
      teal: i % 5  === 0 && i % 7 !== 0,
    };
  });

  // ── Bandas de aurora — 9 capas con doble frecuencia sinusoidal ─────────
  //   a1/f1/s1 : onda primaria (lenta, mayor amplitud)
  //   a2/f2/s2 : onda secundaria (rápida, menor amplitud) — da textura
  const BANDS = [
    { r:0,   g:255, b:140, baseY:.34, a1:.060,f1:.0045,s1:.00042, a2:.022,f2:.0110,s2:.00180, alpha:.72, halfH:.100, ph:0.00 },
    { r:0,   g:232, b:218, baseY:.45, a1:.048,f1:.0036,s1:.00032, a2:.018,f2:.0095,s2:.00160, alpha:.52, halfH:.082, ph:1.20 },
    { r:148, g:58,  b:255, baseY:.20, a1:.068,f1:.0058,s1:.00060, a2:.028,f2:.0130,s2:.00220, alpha:.38, halfH:.075, ph:2.40 },
    { r:0,   g:218, b:255, baseY:.52, a1:.038,f1:.0050,s1:.00038, a2:.016,f2:.0085,s2:.00145, alpha:.34, halfH:.062, ph:0.80 },
    { r:210, g:88,  b:255, baseY:.14, a1:.052,f1:.0075,s1:.00068, a2:.024,f2:.0148,s2:.00240, alpha:.25, halfH:.060, ph:3.50 },
    { r:65,  g:255, b:165, baseY:.39, a1:.040,f1:.0062,s1:.00052, a2:.014,f2:.0108,s2:.00195, alpha:.30, halfH:.068, ph:1.80 },
    { r:0,   g:180, b:160, baseY:.58, a1:.030,f1:.0032,s1:.00025, a2:.012,f2:.0078,s2:.00130, alpha:.22, halfH:.055, ph:4.10 },
    { r:50,  g:255, b:230, baseY:.28, a1:.055,f1:.0068,s1:.00055, a2:.020,f2:.0120,s2:.00210, alpha:.20, halfH:.050, ph:2.90 },
    { r:100, g:40,  b:220, baseY:.08, a1:.042,f1:.0042,s1:.00048, a2:.018,f2:.0092,s2:.00168, alpha:.16, halfH:.048, ph:5.20 },
  ];

  // ── Polvo cósmico ───────────────────────────────────────────────────────
  function initDust(W, H) {
    dust = Array.from({ length: 80 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      size:  0.28 + Math.random() * 0.82,
      vx:    (Math.random() - 0.5) * 0.052,
      vy:   -0.022 - Math.random() * 0.042,
      alpha: 0.028 + Math.random() * 0.075,
      phase: Math.random() * Math.PI * 2,
      teal:  Math.random() < 0.58,
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CAPA 1 — Estrellas con parpadeo y difracción
  // ════════════════════════════════════════════════════════════════════════
  function drawStars(W, H) {
    // Excluir zona del núcleo (evitar estrellas sobre la esfera)
    const excl = (CORE_R * 1.30) ** 2;
    const nx   = W * CORE_XF;
    const ny   = H * CORE_YF;

    ctx.save();
    STARS.forEach(s => {
      const sx = s.x / 100 * W;
      const sy = s.y / 100 * H;
      const dx = sx - nx, dy = sy - ny;
      if (dx * dx + dy * dy < excl) return;

      const tw = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * s.spd + s.phase));
      const al = tw * (0.28 + s.r * 0.22);

      const col = s.teal ? `rgba(140,255,220,${al})`
                : s.warm ? `rgba(255,245,210,${al})`
                : s.cold ? `rgba(200,222,255,${al})`
                :           `rgba(215,235,255,${al})`;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();

      if (s.r > 1.1 && tw > 0.72) {
        const len = s.r * 3.8 * tw;
        ctx.globalAlpha = tw * 0.20;
        ctx.strokeStyle = s.teal ? 'rgba(140,255,220,1)' : s.cold ? 'rgba(200,222,255,1)' : 'rgba(255,245,210,1)';
        ctx.lineWidth   = 0.4;
        ctx.beginPath();
        ctx.moveTo(sx - len, sy); ctx.lineTo(sx + len, sy);
        ctx.moveTo(sx, sy - len); ctx.lineTo(sx, sy + len);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CAPA 2 — Polvo cósmico
  // ════════════════════════════════════════════════════════════════════════
  function drawDust(W, H) {
    if (!dust) return;
    ctx.save();
    dust.forEach(p => {
      const tw = 0.58 + 0.42 * Math.sin(t * 0.00138 + p.phase);
      ctx.fillStyle = p.teal
        ? `rgba(0,212,178,${p.alpha * tw})`
        : `rgba(140,220,255,${p.alpha * tw})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -4)    { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -4)    { p.x = W + 4; }
      if (p.x > W + 4) { p.x = -4; }
    });
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CAPA 3 — Niebla luminosa ambiental
  // ════════════════════════════════════════════════════════════════════════
  function drawMist(W, H) {
    const pulse = 0.80 + 0.20 * Math.sin(t * 0.00032);

    const m1 = ctx.createRadialGradient(W * 0.48, H * 0.04, 0, W * 0.48, H * 0.04, W * 0.62);
    m1.addColorStop(0.00, `rgba(0,178,138,${0.042 * pulse})`);
    m1.addColorStop(0.48, `rgba(0,140,118,${0.018 * pulse})`);
    m1.addColorStop(1.00,  'rgba(0,0,0,0)');
    ctx.fillStyle = m1;
    ctx.fillRect(0, 0, W, H);

    const m2 = ctx.createRadialGradient(W * 0.10, H * 0.42, 0, W * 0.10, H * 0.42, W * 0.36);
    m2.addColorStop(0.00, `rgba(0,208,198,${0.030 * pulse})`);
    m2.addColorStop(0.55, `rgba(0,168,165,${0.012 * pulse})`);
    m2.addColorStop(1.00,  'rgba(0,0,0,0)');
    ctx.fillStyle = m2;
    ctx.fillRect(0, 0, W, H);

    const m3 = ctx.createRadialGradient(W * 0.84, H * 0.10, 0, W * 0.84, H * 0.10, W * 0.28);
    m3.addColorStop(0.00, `rgba(118,48,218,${0.024 * pulse})`);
    m3.addColorStop(0.55, `rgba(78,28,178,${0.009 * pulse})`);
    m3.addColorStop(1.00,  'rgba(0,0,0,0)');
    ctx.fillStyle = m3;
    ctx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CAPA 4 — Banda de aurora (multi-armónico + altura variable)
  // ════════════════════════════════════════════════════════════════════════
  function drawBand(band, W, H) {
    const { r, g, b, baseY, a1, f1, s1, a2, f2, s2, alpha, halfH, ph } = band;

    const pulse  = 0.60 + 0.40 * Math.sin(t * 0.00068 + ph);
    const hMod   = 0.82 + 0.18 * Math.sin(t * 0.00038 + ph * 1.7);
    const bandPx = H * halfH * hMod;
    const N      = 140;

    ctx.save();
    ctx.globalAlpha = alpha * pulse;
    ctx.globalCompositeOperation = 'screen';

    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      const y = H * baseY
        + H * a1 * Math.sin(x * f1 + t * s1 + ph)
        + H * a2 * Math.sin(x * f2 - t * s2 * 1.3 + ph * 1.5)
        - bandPx;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const x = (i / N) * W;
      const y = H * baseY
        + H * a1 * Math.sin(x * f1 + t * s1 + ph)
        + H * a2 * Math.sin(x * f2 - t * s2 * 1.3 + ph * 1.5)
        + bandPx;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();

    const cy   = H * baseY;
    const grad = ctx.createLinearGradient(0, cy - bandPx * 1.7, 0, cy + bandPx * 1.7);
    grad.addColorStop(0.00, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.22, `rgba(${r},${g},${b},0.15)`);
    grad.addColorStop(0.52, `rgba(${r},${g},${b},0.78)`);
    grad.addColorStop(0.72, `rgba(${r},${g},${b},1.00)`);
    grad.addColorStop(0.86, `rgba(${r},${g},${b},0.52)`);
    grad.addColorStop(1.00, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CAPA 5 — Núcleo auroral vivo
  //    · Esfera con ciclo cromático teal → cyan → violeta → teal
  //    · 5 streams de plasma giratorios
  //    · Halo lejano + corona cercana pulsantes
  // ════════════════════════════════════════════════════════════════════════
  function drawCore(W, H) {
    const cx  = W * CORE_XF;
    const cy  = H * CORE_YF;
    const r   = CORE_R;
    const bv  = 1 + 0.14 * Math.sin(t * 0.00115);
    const rot = t * 0.00075;

    // Ciclo cromático lento (período ~105 s a 60fps)
    const hue   = Math.sin(t * 0.00060);
    const cr    = Math.round(Math.max(0, -hue) * 120);
    const cg    = Math.round(212 - 48 * Math.abs(hue));
    const cb    = Math.round(168 + Math.max(0, hue) * 80);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // — Halo exterior —
    const farHalo = ctx.createRadialGradient(cx, cy, r * 1.6, cx, cy, r * 7.5);
    farHalo.addColorStop(0.00, `rgba(${cr},${cg},${cb},${0.042 * bv})`);
    farHalo.addColorStop(0.32, `rgba(0,198,178,${0.018 * bv})`);
    farHalo.addColorStop(0.68, `rgba(0,155,138,${0.006 * bv})`);
    farHalo.addColorStop(1.00,  'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 7.5, 0, Math.PI * 2);
    ctx.fillStyle = farHalo;
    ctx.fill();

    // — Corona cercana —
    const nearHalo = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r * 2.8);
    nearHalo.addColorStop(0.00, `rgba(${cr},${cg},${cb},${0.30 * bv})`);
    nearHalo.addColorStop(0.42, `rgba(0,218,198,${0.16 * bv})`);
    nearHalo.addColorStop(0.78, `rgba(0,178,168,${0.058 * bv})`);
    nearHalo.addColorStop(1.00,  'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.8, 0, Math.PI * 2);
    ctx.fillStyle = nearHalo;
    ctx.fill();

    // — Streams de plasma (5 arcos giratorios) —
    for (let i = 0; i < 5; i++) {
      const a0  = rot * (1.0 + i * 0.20) + (i / 5) * Math.PI * 2;
      const a1  = a0 + 0.52 + 0.18 * Math.sin(t * 0.00085 + i);
      const sr  = r * (1.18 + 0.38 * Math.sin(t * 0.00105 + i * 1.24));
      const sx0 = cx + Math.cos(a0) * sr;
      const sy0 = cy + Math.sin(a0) * sr;
      const sx1 = cx + Math.cos(a1) * sr * 1.65;
      const sy1 = cy + Math.sin(a1) * sr * 1.65;
      const scx = cx + Math.cos((a0 + a1) * 0.5) * sr * 0.52;
      const scy = cy + Math.sin((a0 + a1) * 0.5) * sr * 0.52;
      const sa  = (0.13 + 0.10 * Math.sin(t * 0.00135 + i * 1.1)) * bv;

      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.quadraticCurveTo(scx, scy, sx1, sy1);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${sa})`;
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    // — Esfera clipeada —
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const sphere = ctx.createRadialGradient(
      cx - r * 0.28, cy - r * 0.24, r * 0.02,
      cx + r * 0.05, cy + r * 0.05, r * 1.08
    );
    sphere.addColorStop(0.00, '#ffffff');
    sphere.addColorStop(0.12, `rgba(${Math.min(255, cr + 180)},255,${Math.min(255, cb + 80)},1)`);
    sphere.addColorStop(0.36, `rgba(${cr},${cg},${cb},0.92)`);
    sphere.addColorStop(0.68, `rgba(${Math.round(cr * 0.55)},${Math.round(cg * 0.68)},${Math.round(cb * 0.78)},0.72)`);
    sphere.addColorStop(1.00,  'rgba(0,80,70,0.52)');
    ctx.fillStyle = sphere;
    ctx.fillRect(cx - r - 1, cy - r - 1, r * 2 + 2, r * 2 + 2);
    ctx.restore();

    // — Borde especular —
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.32, cy + r * 0.32);
    rim.addColorStop(0.00, `rgba(255,255,255,${0.32 * bv})`);
    rim.addColorStop(0.50, `rgba(${cr},${cg},${cb},${0.14 * bv})`);
    rim.addColorStop(1.00,  'rgba(0,0,0,0)');
    ctx.strokeStyle = rim;
    ctx.lineWidth   = 1.6;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CURSOR OVERLAY — halo de brío + escarcha hexagonal
  //  Cristales de hielo con 6 brazos y sub-ramas, como dendritas reales.
  //  Renderiza en overCanvas (z:9998) sobre posts, sidebars y topbar.
  // ════════════════════════════════════════════════════════════════════════

  // Dibuja un cristal de hielo hexagonal en (x,y)
  function drawFrostCrystal(x, y, size, alpha, rotation) {
    overCtx.save();
    overCtx.translate(x, y);
    overCtx.rotate(rotation);
    overCtx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
      overCtx.save();
      overCtx.rotate((i / 6) * Math.PI * 2);

      // Brazo principal
      overCtx.beginPath();
      overCtx.moveTo(0, 0);
      overCtx.lineTo(size, 0);
      overCtx.strokeStyle = `rgba(225, 250, 255, ${alpha})`;
      overCtx.lineWidth   = 0.85;
      overCtx.stroke();

      // Sub-ramas: dos puntos a lo largo del brazo, ángulo de 60°
      const subAngle = Math.PI / 3;
      [[size * 0.38, size * 0.30], [size * 0.64, size * 0.20]].forEach(([pos, len]) => {
        [1, -1].forEach(sign => {
          overCtx.beginPath();
          overCtx.moveTo(pos, 0);
          overCtx.lineTo(pos + Math.cos(subAngle * sign) * len,
                              Math.sin(subAngle * sign) * len);
          overCtx.strokeStyle = `rgba(200, 242, 255, ${alpha * 0.68})`;
          overCtx.lineWidth   = 0.48;
          overCtx.stroke();
        });
      });

      overCtx.restore();
    }

    // Punto central — brillo blanco puro
    overCtx.beginPath();
    overCtx.arc(0, 0, 1.4, 0, Math.PI * 2);
    overCtx.fillStyle = `rgba(255,255,255,${alpha * 0.90})`;
    overCtx.fill();

    overCtx.restore();
  }

  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    // Color sincronizado con el ciclo cromático del núcleo
    const hue = Math.sin(t * 0.00060);
    const cr  = Math.round(Math.max(0, -hue) * 120);
    const cg  = Math.round(212 - 48 * Math.abs(hue));
    const cb  = Math.round(168 + Math.max(0, hue) * 80);

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    // — Halo exterior suave —
    const outerGlow = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 72);
    outerGlow.addColorStop(0.00, `rgba(${cr},${cg},${cb},0.10)`);
    outerGlow.addColorStop(0.40, `rgba(${cr},${cg},${cb},0.04)`);
    outerGlow.addColorStop(1.00,  'rgba(0,0,0,0)');
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 72, 0, Math.PI * 2);
    overCtx.fillStyle = outerGlow;
    overCtx.fill();

    // — Núcleo cercano —
    const innerGlow = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 20);
    innerGlow.addColorStop(0.00, 'rgba(255,255,255,0.20)');
    innerGlow.addColorStop(0.30, `rgba(${cr},${cg},${cb},0.14)`);
    innerGlow.addColorStop(0.70, `rgba(${cr},${cg},${cb},0.05)`);
    innerGlow.addColorStop(1.00,  'rgba(0,0,0,0)');
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
    overCtx.fillStyle = innerGlow;
    overCtx.fill();

    // — Bolita blanca central —
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 2.6, 0, Math.PI * 2);
    overCtx.fillStyle = 'rgba(255,255,255,0.62)';
    overCtx.fill();

    // — Cristales de escarcha —
    for (let i = frosts.length - 1; i >= 0; i--) {
      const f = frosts[i];

      drawFrostCrystal(f.x, f.y, f.size, f.alpha, f.rotation);

      // Fase crecimiento (rápido) → desvanecimiento (lento)
      if (f.growing) {
        f.size  = Math.min(f.maxSize, f.size + f.maxSize * 0.16);
        f.alpha = Math.min(f.maxAlpha, f.alpha + 0.11);
        if (f.size >= f.maxSize) f.growing = false;
      } else {
        f.alpha -= 0.014;
      }
      if (f.alpha <= 0) frosts.splice(i, 1);
    }

    overCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LOOP
  // ════════════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W = canvas.width;
    const H = canvas.height;

    // — Canvas de fondo —
    ctx.clearRect(0, 0, W, H);
    drawStars(W, H);
    drawDust(W, H);
    drawMist(W, H);
    BANDS.forEach(band => drawBand(band, W, H));
    drawCore(W, H);

    // — Overlay cursor —
    drawCursor(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!canvas) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width      = W;  canvas.height      = H;
    overCanvas.width  = W;  overCanvas.height  = H;
    initDust(W, H);
  }

  return {
    start() {
      if (canvas) return;

      // Canvas de fondo — atmósfera + aurora
      canvas = document.createElement('canvas');
      canvas.id = 'orak-aurora-bg';
      Object.assign(canvas.style, {
        position: 'fixed', inset: '0',
        pointerEvents: 'none', zIndex: '-1',
      });
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');

      // Canvas overlay — cursor glow sobre toda la UI
      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-aurora-over';
      Object.assign(overCanvas.style, {
        position: 'fixed', inset: '0',
        pointerEvents: 'none', zIndex: '9998',
      });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      // Cursor: halo inmediato + cristal de escarcha cada 160 ms
      _onMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        const now = performance.now();
        if (now - lastFrost > 160 && frosts.length < 10) {
          lastFrost = now;
          frosts.push({
            x:        mouseX,
            y:        mouseY,
            size:     1.0,
            maxSize:  14 + Math.random() * 10,   // 14-24 px
            alpha:    0,
            maxAlpha: 0.55 + Math.random() * 0.20,
            growing:  true,
            rotation: Math.random() * (Math.PI / 3), // simetría 6-fold: 0-60°
          });
        }
      };
      document.addEventListener('mousemove', _onMove, { passive: true });

      // Ocultar glow cuando el cursor sale de la ventana
      document.addEventListener('mouseleave', () => { mouseX = -999; mouseY = -999; });

      window.addEventListener('resize', resize);
      t = 0;
      frame();
    },

    stop() {
      if (!canvas) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (_onMove) { document.removeEventListener('mousemove', _onMove); _onMove = null; }
      canvas.remove();     canvas     = ctx     = null;
      overCanvas.remove(); overCanvas = overCtx = null;
      dust = null;
      frosts.length = 0;
      mouseX = mouseY = -999;
      raf = null; t = 0;
    },

    // Futura integración de actividad de comunidad (0 = calma, 1 = tormenta)
    setIntensity(_v) {},
  };
})();

export { AuroraRenderer };
