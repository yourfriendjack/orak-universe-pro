// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/rubi.js
//  Rubí — gema legendaria viva
//
//  bgCanvas  (z:-1)   → atmósfera, estrellas, polvo de cristal,
//                        columnas de luz (veins), Corazón Rubí,
//                        destellos de faceta espontáneos
//  overCanvas (z:9998) → cursor: halo carmesí + chispas de 4 puntas
//
//  Corazón Rubí: octágono facetado con rotación lenta, brillo
//  interno giratorio, 6 rayos de plasma, halo lejano + corona.
// ════════════════════════════════════════════════════════════════

const RubiRenderer = (() => {

  let bgCanvas = null,   bgCtx   = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;
  let dust = null, petals = null;

  // ── Cursor ──────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastSparkle = 0, _onMove = null;
  const sparkles = [];

  // ── Destellos de faceta espontáneos ─────────────────────────────────────
  const flashes = [];
  let nextFlashIn = 200;

  // ── Corazón Rubí ────────────────────────────────────────────────────────
  const HEART_XF = 0.72;
  const HEART_YF = 0.30;
  const HEART_R  = 52;

  // ── Campo estelar — 140 estrellas con plata + rosa + cálido ────────────
  const STARS = Array.from({ length: 140 }, (_, i) => ({
    x:      (i * 173.71 + 5.30) % 100,
    y:      (i * 127.37 + 8.10) % 90,
    r:      i % 9 === 0 ? 1.45 : i % 5 === 0 ? 1.05 : i % 3 === 0 ? 0.78 : 0.48,
    phase:  i * 0.7131,
    spd:    0.000400 + (i % 7) * 0.000145,
    silver: i % 7 === 0,
    rose:   i % 5 === 0 && i % 7 !== 0,
    warm:   i % 9 === 0,
  }));

  // ── Columnas de luz verticales (veins) ─────────────────────────────────
  const VEINS = [
    { r:188, g:22,  b:55,  baseX:.18, a1:.045, f1:.0038, s1:.00030, alpha:.55, halfW:.052 },
    { r:210, g:40,  b:80,  baseX:.44, a1:.038, f1:.0030, s1:.00024, alpha:.42, halfW:.045 },
    { r:228, g:72,  b:112, baseX:.64, a1:.052, f1:.0044, s1:.00038, alpha:.30, halfW:.040 },
    { r:152, g:10,  b:38,  baseX:.30, a1:.035, f1:.0034, s1:.00026, alpha:.24, halfW:.036 },
    { r:198, g:50,  b:90,  baseX:.82, a1:.045, f1:.0040, s1:.00034, alpha:.20, halfW:.033 },
    { r:140, g:6,   b:28,  baseX:.54, a1:.032, f1:.0026, s1:.00020, alpha:.16, halfW:.030 },
  ];

  // ── Polvo de cristal — 80 partículas: carmesí / rosa / plata / deep ─────
  function initDust(W, H) {
    dust = Array.from({ length: 80 }, () => {
      const roll = Math.random();
      return {
        x:     Math.random() * W,
        y:     Math.random() * H,
        size:  0.28 + Math.random() * 1.05,
        vx:    (Math.random() - 0.5) * 0.042,
        vy:   -0.012 - Math.random() * 0.030,
        alpha: 0.06 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
        type:  roll < 0.38 ? 'crimson'
             : roll < 0.65 ? 'rose'
             : roll < 0.82 ? 'silver'
             :                'deep',
      };
    });
  }

  // ── Pétalos de rosa — 40 partículas con rotación y caída suave ──────────
  function makePetal(W, H, randomY) {
    const deep = Math.random() < 0.42;
    return {
      x:          Math.random() * W,
      y:          randomY ? Math.random() * H : -12,
      rx:         2.4 + Math.random() * 2.2,       // 2.4-4.6px mitad-ancho
      ry:         5.2 + Math.random() * 4.6,       // 5.2-9.8px mitad-alto
      angle:      Math.random() * Math.PI * 2,
      spin:       (Math.random() < 0.5 ? 1 : -1) * (0.003 + Math.random() * 0.005),
      vx:         (Math.random() - 0.5) * 0.10,
      vy:         0.22 + Math.random() * 0.36,
      swayPhase:  Math.random() * Math.PI * 2,
      alpha:      0.10 + Math.random() * 0.18,
      cr: deep ? 198 + Math.floor(Math.random() * 22) : 232 + Math.floor(Math.random() * 18),
      cg: deep ?  38 + Math.floor(Math.random() * 28) :  85 + Math.floor(Math.random() * 42),
      cb: deep ?  68 + Math.floor(Math.random() * 28) : 115 + Math.floor(Math.random() * 38),
    };
  }

  function initPetals(W, H) {
    petals = Array.from({ length: 40 }, () => makePetal(W, H, true));
  }

  function drawPetals(W, H) {
    if (!petals) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    petals.forEach(p => {
      bgCtx.save();
      bgCtx.translate(p.x, p.y);
      bgCtx.rotate(p.angle);

      const grad = bgCtx.createRadialGradient(0, -p.ry * 0.12, 0, 0, 0, p.ry);
      grad.addColorStop(0.00, `rgba(255, 228, 238, ${p.alpha})`);
      grad.addColorStop(0.35, `rgba(${p.cr}, ${p.cg}, ${p.cb}, ${p.alpha * 0.82})`);
      grad.addColorStop(0.70, `rgba(${p.cr}, ${p.cg}, ${p.cb}, ${p.alpha * 0.32})`);
      grad.addColorStop(1.00,  'rgba(0,0,0,0)');

      bgCtx.beginPath();
      bgCtx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
      bgCtx.fillStyle = grad;
      bgCtx.fill();
      bgCtx.restore();

      p.x    += p.vx + Math.sin(t * 0.0052 + p.swayPhase) * 0.12;
      p.y    += p.vy;
      p.angle += p.spin;

      if (p.y > H + 14) {
        const next = makePetal(W, H, false);
        next.x = Math.random() * W;
        Object.assign(p, next);
      }
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Atmósfera interna: refracción difusa carmesí
  // ════════════════════════════════════════════════════════════════════════
  function drawAtmosphere(W, H) {
    const pulse = 0.78 + 0.22 * Math.sin(t * 0.00034);
    const shift = Math.sin(t * 0.00026) * 0.04; // desplazamiento lento de luz

    // Fuente primaria desde el Corazón
    const hx = W * (HEART_XF + shift * 0.3);
    const hy = H * (HEART_YF - shift * 0.2);
    const main = bgCtx.createRadialGradient(hx, hy, 0, hx, hy, W * 0.62);
    main.addColorStop(0.00, `rgba(202, 28, 65, ${0.072 * pulse})`);
    main.addColorStop(0.30, `rgba(165, 18, 48, ${0.038 * pulse})`);
    main.addColorStop(0.65, `rgba(120, 8,  30, ${0.015 * pulse})`);
    main.addColorStop(1.00,  'rgba(0,0,0,0)');
    bgCtx.fillStyle = main;
    bgCtx.fillRect(0, 0, W, H);

    // Puntos de refracción secundarios (luz dispersa dentro de la gema)
    [
      [W * 0.16, H * 0.22, W * 0.38, 0.040],
      [W * 0.80, H * 0.70, W * 0.32, 0.030],
      [W * 0.38, H * 0.78, W * 0.44, 0.025],
    ].forEach(([cx, cy, r, str]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0.00, `rgba(180, 20, 52, ${str * pulse})`);
      g.addColorStop(0.50, `rgba(138, 10, 32, ${str * 0.44 * pulse})`);
      g.addColorStop(1.00,  'rgba(0,0,0,0)');
      bgCtx.fillStyle = g;
      bgCtx.fillRect(0, 0, W, H);
    });

    // Viñeta obsidiana profunda
    const vig = bgCtx.createRadialGradient(W / 2, H / 2, H * 0.24, W / 2, H / 2, W * 0.76);
    vig.addColorStop(0,  'rgba(0,0,0,0)');
    vig.addColorStop(1,  `rgba(4, 0, 1, ${0.40 * pulse})`);
    bgCtx.fillStyle = vig;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Estrellas con plata y difracción
  // ════════════════════════════════════════════════════════════════════════
  function drawStars(W, H) {
    const excl = (HEART_R * 1.45) ** 2;
    const nx = W * HEART_XF, ny = H * HEART_YF;

    bgCtx.save();
    STARS.forEach(s => {
      const sx = s.x / 100 * W;
      const sy = s.y / 100 * H;
      const dx = sx - nx, dy = sy - ny;
      if (dx * dx + dy * dy < excl) return;

      const tw = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * s.spd + s.phase));
      const al = tw * (0.22 + s.r * 0.18);

      bgCtx.fillStyle = s.silver ? `rgba(222,215,228,${al})`
                      : s.rose   ? `rgba(255,168,195,${al})`
                      : s.warm   ? `rgba(255,210,198,${al})`
                      :             `rgba(255,195,210,${al})`;
      bgCtx.beginPath();
      bgCtx.arc(sx, sy, s.r, 0, Math.PI * 2);
      bgCtx.fill();

      // Difracción de 4 rayos para estrellas plata brillantes
      if (s.silver && s.r > 1.0 && tw > 0.68) {
        const len = s.r * 3.6 * tw;
        bgCtx.globalAlpha  = tw * 0.18;
        bgCtx.strokeStyle  = 'rgba(222,215,228,1)';
        bgCtx.lineWidth    = 0.4;
        bgCtx.beginPath();
        bgCtx.moveTo(sx - len, sy); bgCtx.lineTo(sx + len, sy);
        bgCtx.moveTo(sx, sy - len); bgCtx.lineTo(sx, sy + len);
        bgCtx.stroke();
        bgCtx.globalAlpha = 1;
      }
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Polvo de cristal
  // ════════════════════════════════════════════════════════════════════════
  function drawDust(W, H) {
    if (!dust) return;
    bgCtx.save();
    dust.forEach(p => {
      const tw = 0.55 + 0.45 * Math.sin(t * 0.00124 + p.phase);
      bgCtx.fillStyle =
        p.type === 'crimson' ? `rgba(200, 38, 68, ${p.alpha * tw})`
      : p.type === 'rose'    ? `rgba(235, 90, 132, ${p.alpha * tw})`
      : p.type === 'silver'  ? `rgba(212, 202, 218, ${p.alpha * tw})`
      :                         `rgba(132, 8, 26, ${p.alpha * tw})`;
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
  //  BG — Columnas de luz verticales
  // ════════════════════════════════════════════════════════════════════════
  function drawVein(vein, W, H) {
    const { r, g, b, baseX, a1, f1, s1, alpha, halfW } = vein;
    const pulse  = 0.58 + 0.42 * Math.sin(t * 0.00060 + baseX * 5.5);
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
  //  BG — CORAZÓN RUBÍ
  //  Gema octagonal facetada con rotación, brillo interno giratorio
  //  y 6 rayos de plasma que emanan desde la piedra.
  // ════════════════════════════════════════════════════════════════════════
  function drawHeart(W, H) {
    const cx  = W * HEART_XF;
    const cy  = H * HEART_YF;
    const r   = HEART_R;
    const rot = t * 0.00055;
    const bv  = 1 + 0.16 * Math.sin(t * 0.00112);

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';

    // — Halo lejano —
    const farHalo = bgCtx.createRadialGradient(cx, cy, r * 1.45, cx, cy, r * 7.2);
    farHalo.addColorStop(0.00, `rgba(202, 30, 68, ${0.058 * bv})`);
    farHalo.addColorStop(0.32, `rgba(165, 18, 48, ${0.026 * bv})`);
    farHalo.addColorStop(0.68, `rgba(120, 8,  32, ${0.008 * bv})`);
    farHalo.addColorStop(1.00,  'rgba(0,0,0,0)');
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, r * 7.2, 0, Math.PI * 2);
    bgCtx.fillStyle = farHalo;
    bgCtx.fill();

    // — Corona cercana —
    const nearHalo = bgCtx.createRadialGradient(cx, cy, r * 0.80, cx, cy, r * 2.6);
    nearHalo.addColorStop(0.00, `rgba(222, 42, 82, ${0.34 * bv})`);
    nearHalo.addColorStop(0.42, `rgba(185, 25, 58, ${0.18 * bv})`);
    nearHalo.addColorStop(0.82, `rgba(145, 12, 38, ${0.058 * bv})`);
    nearHalo.addColorStop(1.00,  'rgba(0,0,0,0)');
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, r * 2.6, 0, Math.PI * 2);
    bgCtx.fillStyle = nearHalo;
    bgCtx.fill();

    // === GEM — translate + rotate ===
    bgCtx.save();
    bgCtx.translate(cx, cy);
    bgCtx.rotate(rot);

    const FACETS  = 8;
    const innerR  = r * 0.48;    // tabla (table face)
    const lightAng = -Math.PI * 0.32; // fuente de luz fija

    // — Facetas del pabellón (triángulos corona → borde) —
    for (let i = 0; i < FACETS; i++) {
      const a0  = (i / FACETS) * Math.PI * 2;
      const a1  = ((i + 1) / FACETS) * Math.PI * 2;
      const aMid = (a0 + a1) * 0.5;

      const dot  = 0.5 + 0.5 * Math.cos(aMid - lightAng - rot);
      const br   = 0.30 + 0.70 * dot;

      const fr = Math.round(118 + 102 * br);
      const fg = Math.round(8   +  22 * br);
      const fb = Math.round(24  +  42 * br);

      bgCtx.beginPath();
      bgCtx.moveTo(0, 0);
      bgCtx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      bgCtx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      bgCtx.closePath();
      bgCtx.fillStyle = `rgba(${fr},${fg},${fb},${0.58 + 0.32 * br})`;
      bgCtx.fill();

      // Arista brillante
      const edgeBr = Math.max(0, 0.42 + 0.58 * Math.cos(a0 - lightAng - rot));
      bgCtx.beginPath();
      bgCtx.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      bgCtx.lineTo(Math.cos(a0) * r,      Math.sin(a0) * r);
      bgCtx.strokeStyle = `rgba(255, 200, 218, ${edgeBr * 0.52})`;
      bgCtx.lineWidth   = 0.8;
      bgCtx.stroke();
    }

    // — Tabla (cara superior — octágono interno) —
    bgCtx.beginPath();
    for (let i = 0; i < FACETS; i++) {
      const a = (i / FACETS) * Math.PI * 2;
      i === 0
        ? bgCtx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR)
        : bgCtx.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    }
    bgCtx.closePath();

    const tableGrad = bgCtx.createRadialGradient(
      -innerR * 0.28, -innerR * 0.24, 0,
       innerR * 0.06,  innerR * 0.06, innerR
    );
    tableGrad.addColorStop(0.00, `rgba(255, 238, 245, ${0.95 * bv})`);
    tableGrad.addColorStop(0.18, `rgba(255, 158, 188, ${0.82 * bv})`);
    tableGrad.addColorStop(0.50, `rgba(222, 45,  88,  ${0.72 * bv})`);
    tableGrad.addColorStop(0.80, `rgba(162, 15,  42,  ${0.62 * bv})`);
    tableGrad.addColorStop(1.00, `rgba(100, 5,   22,  ${0.52 * bv})`);
    bgCtx.fillStyle = tableGrad;
    bgCtx.fill();

    // Borde de la tabla
    bgCtx.strokeStyle = `rgba(255, 218, 232, ${0.38 * bv})`;
    bgCtx.lineWidth   = 1.0;
    bgCtx.stroke();

    // — Reflejo interno giratorio (como luz capturada en la gema) —
    const flashAng = rot * 3.8;
    const fx = Math.cos(flashAng) * innerR * 0.50;
    const fy = Math.sin(flashAng) * innerR * 0.50;
    const flashG = bgCtx.createRadialGradient(fx, fy, 0, fx, fy, innerR * 0.40);
    flashG.addColorStop(0, `rgba(255,245,250,${0.50 * bv})`);
    flashG.addColorStop(1,  'rgba(0,0,0,0)');
    bgCtx.beginPath();
    bgCtx.arc(fx, fy, innerR * 0.40, 0, Math.PI * 2);
    bgCtx.fillStyle = flashG;
    bgCtx.fill();

    // — Rim especular —
    bgCtx.beginPath();
    for (let i = 0; i < FACETS; i++) {
      const a = (i / FACETS) * Math.PI * 2;
      i === 0
        ? bgCtx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        : bgCtx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    bgCtx.closePath();
    const rim = bgCtx.createLinearGradient(-r, -r, r * 0.35, r * 0.35);
    rim.addColorStop(0.00, `rgba(255, 230, 240, ${0.42 * bv})`);
    rim.addColorStop(0.50, `rgba(220, 80,  115, ${0.16 * bv})`);
    rim.addColorStop(1.00,  'rgba(0,0,0,0)');
    bgCtx.strokeStyle = rim;
    bgCtx.lineWidth   = 1.5;
    bgCtx.stroke();

    // — 6 rayos de plasma que emanan del corazón —
    for (let i = 0; i < 6; i++) {
      const a0  = rot * 0.80 + (i / 6) * Math.PI * 2;
      const a1  = a0 + 0.50 + 0.14 * Math.sin(t * 0.00080 + i);
      const sr  = r * (1.14 + 0.32 * Math.sin(t * 0.00092 + i * 1.3));
      const sx0 = Math.cos(a0) * sr,  sy0 = Math.sin(a0) * sr;
      const sx1 = Math.cos(a1) * sr * 1.58, sy1 = Math.sin(a1) * sr * 1.58;
      const scx = Math.cos((a0 + a1) * 0.5) * sr * 0.48;
      const scy = Math.sin((a0 + a1) * 0.5) * sr * 0.48;
      const sa  = (0.10 + 0.08 * Math.sin(t * 0.00128 + i)) * bv;

      bgCtx.beginPath();
      bgCtx.moveTo(sx0, sy0);
      bgCtx.quadraticCurveTo(scx, scy, sx1, sy1);
      bgCtx.strokeStyle = `rgba(220, 60, 100, ${sa})`;
      bgCtx.lineWidth   = 1.2;
      bgCtx.lineCap     = 'round';
      bgCtx.stroke();
    }

    bgCtx.restore(); // undo translate+rotate
    bgCtx.restore(); // undo globalCompositeOperation
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Destellos de faceta espontáneos (estrellas de 4 puntas)
  // ════════════════════════════════════════════════════════════════════════
  function draw4Star(ctx, x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255, 198, 215, 1)';
    ctx.lineCap     = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * size * 0.52, Math.sin(a) * size * 0.52);
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.44);
    grd.addColorStop(0, 'rgba(255,222,235,0.90)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.restore();
  }

  function updateFlashes(W, H) {
    nextFlashIn--;
    if (nextFlashIn <= 0 && flashes.length < 5) {
      flashes.push({
        x:       W * (0.06 + Math.random() * 0.88),
        y:       H * (0.05 + Math.random() * 0.80),
        size:    0,
        maxSize: 8 + Math.random() * 14,
        alpha:   0.48 + Math.random() * 0.32,
        life:    1.0,
      });
      nextFlashIn = 220 + Math.floor(Math.random() * 340);
    }
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.size = Math.min(f.maxSize, f.size + f.maxSize * 0.09);
      draw4Star(bgCtx, f.x, f.y, f.size, f.alpha * f.life);
      f.life -= 0.034;
      if (f.life <= 0) flashes.splice(i, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor: halo carmesí + chispas de 4 puntas
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

    const outerGlow = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 46);
    outerGlow.addColorStop(0.00, 'rgba(215, 55, 88, 0.09)');
    outerGlow.addColorStop(0.45, 'rgba(175, 28, 58, 0.03)');
    outerGlow.addColorStop(1.00,  'rgba(0,0,0,0)');
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 46, 0, Math.PI * 2);
    overCtx.fillStyle = outerGlow;
    overCtx.fill();

    const innerGlow = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 13);
    innerGlow.addColorStop(0.00, 'rgba(255, 205, 218, 0.20)');
    innerGlow.addColorStop(0.40, 'rgba(215, 55,  88,  0.10)');
    innerGlow.addColorStop(1.00,  'rgba(0,0,0,0)');
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 13, 0, Math.PI * 2);
    overCtx.fillStyle = innerGlow;
    overCtx.fill();

    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 1.8, 0, Math.PI * 2);
    overCtx.fillStyle = 'rgba(255, 205, 218, 0.55)';
    overCtx.fill();

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
    drawPetals(W, H);
    VEINS.forEach(v => drawVein(v, W, H));
    drawHeart(W, H);
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
    initPetals(W, H);
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
      dust = null; petals = null;
      sparkles.length = flashes.length = 0;
      mouseX = mouseY = -999;
      raf = null; t = 0;
    },
  };
})();

export { RubiRenderer };
