// frontend/js/themes/cloudcore.js
const CloudcoreRenderer = (() => {
  'use strict';

  // ── State ─────────────────────────────────────────────────────
  let bgCanvas, bgCtx, overCanvas, overCtx;
  let raf, t = 0;
  let clouds = [], dustMotes = [], spawnPuffs = [], stars = [], birdGroups = [];
  let rainDrops = [], islands = [];
  let rainPhase = 0, rainAlpha = 0;  // lluvia aparece en transición noche→amanecer
  let mouseX = -999, mouseY = -999, trail = [];
  let _onMove = null, _onClick = null;

  // ── Sky cycle (9000 frames ≈ 2.5 min @ 60fps) ────────────────
  const CYCLE = 9000;

  // Keyframes: phase, [topR,topG,topB], [botR,botG,botB]
  const SKY = [
    { p: 0.00, top: [70,  95, 160], bot: [255, 150,  90] }, // amanecer
    { p: 0.22, top: [30, 110, 200], bot: [200, 235, 255] }, // mediodía
    { p: 0.52, top: [40,  80, 150], bot: [255, 180,  55] }, // hora dorada
    { p: 0.72, top: [25,  35,  90], bot: [200,  85,  45] }, // atardecer
    { p: 0.85, top: [ 8,  12,  38], bot: [ 50,  25,  55] }, // noche
    { p: 1.00, top: [70,  95, 160], bot: [255, 150,  90] }, // (wrap → amanecer)
  ];

  function lerpRGB(a, b, f) {
    return [
      Math.round(a[0] + (b[0]-a[0])*f),
      Math.round(a[1] + (b[1]-a[1])*f),
      Math.round(a[2] + (b[2]-a[2])*f),
    ];
  }

  function getSkyColors(phase) {
    const p = phase % 1;
    let a = SKY[SKY.length-2], b = SKY[SKY.length-1];
    for (let i = 0; i < SKY.length-1; i++) {
      if (p >= SKY[i].p && p < SKY[i+1].p) { a = SKY[i]; b = SKY[i+1]; break; }
    }
    const span = b.p - a.p;
    const f    = span > 0 ? (p - a.p) / span : 0;
    const top  = lerpRGB(a.top, b.top, f);
    const bot  = lerpRGB(a.bot, b.bot, f);
    return { top: `rgb(${top})`, bot: `rgb(${bot})` };
  }

  // 0 = neutro | >0 = cálido (hora dorada) | <0 = frío (noche)
  function getTint(phase) {
    const p = phase % 1;
    if (p >= 0.52 && p < 0.64) return (p - 0.52) / 0.12;
    if (p >= 0.64 && p < 0.72) return 1 - (p - 0.64) / 0.08;
    if (p >= 0.82) return -0.6;
    if (p < 0.04)  return -0.6;
    return 0;
  }

  // Posición del sol / luna a lo largo del arco del cielo
  function getSunPos(phase, W, H) {
    const p   = phase % 1;
    const ang = p * Math.PI * 2 - Math.PI * 0.5;
    const cx  = W * 0.5  + Math.cos(ang) * W * 0.42;
    const cy  = H * 0.22 - Math.sin(ang) * H * 0.28;
    return { x: cx, y: cy };
  }

  // ── Nubes ─────────────────────────────────────────────────────
  // Cada nube = cluster de elipses superpuestas
  const PUFFS = [
    { dx:  0.00, dy:  0.00, rx: 1.00, ry: 0.74 },
    { dx: -0.80, dy:  0.22, rx: 0.75, ry: 0.58 },
    { dx:  0.80, dy:  0.22, rx: 0.75, ry: 0.58 },
    { dx: -0.42, dy: -0.38, rx: 0.65, ry: 0.50 },
    { dx:  0.42, dy: -0.38, rx: 0.65, ry: 0.50 },
    { dx: -1.30, dy:  0.38, rx: 0.50, ry: 0.40 },
    { dx:  1.30, dy:  0.38, rx: 0.50, ry: 0.40 },
    { dx:  0.00, dy: -0.60, rx: 0.44, ry: 0.36 },
  ];

  // Templates de nube por capa (posiciones en fracción de pantalla)
  const CLOUD_DEFS = [
    // layer 0 — lejos: pequeñas, lentas, semi-transparentes
    { layer:0, fx:0.07, fy:0.13, sc:0.52, spd:5e-5 },
    { layer:0, fx:0.33, fy:0.07, sc:0.44, spd:4e-5 },
    { layer:0, fx:0.58, fy:0.17, sc:0.58, spd:6e-5 },
    { layer:0, fx:0.78, fy:0.10, sc:0.40, spd:4e-5 },
    { layer:0, fx:0.50, fy:0.04, sc:0.48, spd:5e-5 },
    // layer 1 — medio
    { layer:1, fx:0.14, fy:0.27, sc:0.80, spd:1.1e-4 },
    { layer:1, fx:0.40, fy:0.31, sc:0.90, spd:9e-5  },
    { layer:1, fx:0.66, fy:0.24, sc:0.74, spd:1.2e-4 },
    { layer:1, fx:0.84, fy:0.29, sc:0.84, spd:8e-5  },
    { layer:1, fx:0.24, fy:0.21, sc:0.70, spd:1.3e-4 },
    // layer 2 — cerca: grandes, rápidas, opacas
    { layer:2, fx:0.09, fy:0.50, sc:1.20, spd:2.2e-4 },
    { layer:2, fx:0.44, fy:0.55, sc:1.40, spd:1.8e-4 },
    { layer:2, fx:0.72, fy:0.47, sc:1.10, spd:2.0e-4 },
    { layer:2, fx:0.90, fy:0.58, sc:1.30, spd:2.5e-4 },
  ];

  function initClouds(W, H) {
    clouds = CLOUD_DEFS.map(d => ({
      ...d,
      px:          d.fx * W,
      py:          d.fy * H,
      breathPhase: Math.random() * Math.PI * 2,
    }));
  }

  function drawCloudShape(ctx, cx, cy, R, tint) {
    const wr = Math.min(255, 252 + Math.round(tint * 3));
    const wg = Math.min(255, 248 - Math.round(Math.max(0, tint) * 28));
    const wb = Math.min(255, 245 - Math.round(Math.max(0, tint) * 58));

    // Sombra inferior azul-gris
    ctx.fillStyle = `rgba(80,110,168,0.17)`;
    ctx.beginPath();
    for (const p of PUFFS) {
      ctx.ellipse(cx + p.dx*R, cy + p.dy*R + R*0.18, p.rx*R*1.06, p.ry*R*0.55, 0, 0, Math.PI*2);
    }
    ctx.fill();

    // Cuerpo principal
    ctx.fillStyle = `rgb(${wr},${wg},${wb})`;
    ctx.beginPath();
    for (const p of PUFFS) {
      ctx.ellipse(cx + p.dx*R, cy + p.dy*R, p.rx*R, p.ry*R, 0, 0, Math.PI*2);
    }
    ctx.fill();

    // Highlight brillante en los puffs superiores
    ctx.fillStyle = `rgba(255,255,255,0.68)`;
    ctx.beginPath();
    for (const p of PUFFS) {
      if (p.dy <= 0) {
        ctx.ellipse(cx + p.dx*R, cy + p.dy*R - R*0.09, p.rx*R*0.60, p.ry*R*0.42, 0, 0, Math.PI*2);
      }
    }
    ctx.fill();
  }

  function drawClouds(W, H, tint) {
    const ALPHAS = [0.54, 0.78, 0.93];
    for (const c of clouds) {
      // drift
      c.px += c.spd * W;
      if (c.px > W + 220 * c.sc) c.px = -220 * c.sc;

      // respiración suave
      const breath = 1 + 0.018 * Math.sin(t * 0.005 + c.breathPhase);
      const R      = 58 * c.sc * breath;

      bgCtx.save();
      bgCtx.globalAlpha = ALPHAS[c.layer];
      drawCloudShape(bgCtx, c.px, c.py, R, tint);
      bgCtx.restore();
    }
  }

  // ── Sol / Luna ────────────────────────────────────────────────
  function drawCelestialBody(W, H, phase) {
    const { x, y } = getSunPos(phase, W, H);
    const p        = phase % 1;
    const isNight  = p >= 0.84;
    const tint     = getTint(phase);

    bgCtx.save();

    if (isNight) {
      // Luna — disco blanco-azulado con brillo suave
      const gm = bgCtx.createRadialGradient(x, y, 0, x, y, 70);
      gm.addColorStop(0, 'rgba(200,220,255,0.18)');
      gm.addColorStop(1, 'rgba(200,220,255,0)');
      bgCtx.fillStyle = gm;
      bgCtx.beginPath(); bgCtx.arc(x, y, 70, 0, Math.PI*2); bgCtx.fill();

      bgCtx.fillStyle = '#ddeeff';
      bgCtx.beginPath(); bgCtx.arc(x, y, 18, 0, Math.PI*2); bgCtx.fill();
    } else {
      // Sol — corona exterior, anillo medio y disco brillante
      const cr1 = tint > 0 ? '255,200,80' : '255,238,200';
      const cr2 = tint > 0 ? '255,160,40' : '255,220,160';

      const go = bgCtx.createRadialGradient(x, y, 0, x, y, 130);
      go.addColorStop(0, `rgba(${cr1},0.22)`);
      go.addColorStop(1, `rgba(${cr1},0)`);
      bgCtx.fillStyle = go;
      bgCtx.beginPath(); bgCtx.arc(x, y, 130, 0, Math.PI*2); bgCtx.fill();

      const pulse = 1 + 0.04 * Math.sin(t * 0.025);
      const gc = bgCtx.createRadialGradient(x, y, 18*pulse, x, y, 54*pulse);
      gc.addColorStop(0, `rgba(${cr2},0.88)`);
      gc.addColorStop(1, `rgba(${cr2},0)`);
      bgCtx.fillStyle = gc;
      bgCtx.beginPath(); bgCtx.arc(x, y, 54*pulse, 0, Math.PI*2); bgCtx.fill();

      bgCtx.fillStyle = tint > 0 ? '#fff8a0' : '#fffff5';
      bgCtx.beginPath(); bgCtx.arc(x, y, 22, 0, Math.PI*2); bgCtx.fill();
    }

    bgCtx.restore();
  }

  // ── Rayos crepusculares ───────────────────────────────────────
  function drawGodRays(W, H, phase) {
    const p = phase % 1;
    // Solo durante el día, más intensos en hora dorada
    if (p >= 0.80 && p < 0.99) return;

    const { x, y } = getSunPos(phase, W, H);
    const tint      = getTint(phase);
    const cr        = tint > 0 ? '255,200,100' : '255,240,220';
    const intensity = 0.045 + tint * 0.025;

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 8; i++) {
      const baseAngle = (i / 8) * Math.PI * 2;
      const pulse     = intensity * (0.7 + 0.3 * Math.sin(t * 0.004 + i * 1.1));
      const len       = W * 0.70;
      const spread    = 0.10;

      const g = bgCtx.createLinearGradient(x, y,
        x + Math.cos(baseAngle) * len,
        y + Math.sin(baseAngle) * len);
      g.addColorStop(0,   `rgba(${cr},${pulse})`);
      g.addColorStop(0.4, `rgba(${cr},${pulse * 0.35})`);
      g.addColorStop(1,   `rgba(${cr},0)`);

      bgCtx.beginPath();
      bgCtx.moveTo(x, y);
      bgCtx.lineTo(
        x + Math.cos(baseAngle - spread) * len,
        y + Math.sin(baseAngle - spread) * len);
      bgCtx.lineTo(
        x + Math.cos(baseAngle + spread) * len,
        y + Math.sin(baseAngle + spread) * len);
      bgCtx.closePath();
      bgCtx.fillStyle = g;
      bgCtx.fill();
    }

    bgCtx.restore();
  }

  // ── Estrellas (solo fase nocturna) ────────────────────────────
  function initStars(W, H) {
    stars = Array.from({ length: 90 }, () => ({
      x:       Math.random() * W,
      y:       Math.random() * H * 0.55,
      r:       0.5 + Math.random() * 1.6,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function drawStars(W, H, phase) {
    const p = phase % 1;
    let alpha = 0;
    if (p >= 0.82 && p < 0.92) alpha = (p - 0.82) / 0.10;
    else if (p >= 0.92)        alpha = 1;
    else if (p < 0.04)         alpha = Math.max(0, 1 - p / 0.04);
    if (alpha <= 0) return;

    bgCtx.save();
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * 0.018 + s.twinkle);
      bgCtx.fillStyle = `rgba(255,255,255,${alpha * tw})`;
      bgCtx.beginPath();
      bgCtx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      bgCtx.fill();
    }
    bgCtx.restore();
  }

  // ── Pájaros ───────────────────────────────────────────────────
  // 4 bandadas: 2 hacia la derecha, 2 hacia la izquierda, en distintas alturas
  const FLOCK_DEFS = [
    { count: 6, yFrac: 0.11, spd: 3.8e-4, size: 5.0, dir:  1, flapHz: 0.09 },
    { count: 9, yFrac: 0.19, spd: 2.8e-4, size: 3.5, dir: -1, flapHz: 0.07 },
    { count: 5, yFrac: 0.07, spd: 2.2e-4, size: 3.0, dir:  1, flapHz: 0.08 },
    { count: 7, yFrac: 0.15, spd: 3.2e-4, size: 4.5, dir: -1, flapHz: 0.10 },
  ];

  function makeBird(i, size) {
    // Formación en V: líder al frente, pares atrás en diagonal
    if (i === 0) return { dx: 0,  dy: 0,  fo: 0 };
    const row  = Math.ceil(i / 2);
    const side = i % 2 === 1 ? -1 : 1;
    return {
      dx: side * row * size * 4.2,
      dy: row  * size * 2.4,
      fo: row  * 0.18 + Math.random() * 0.12,  // leve desfase de aleteo por fila
    };
  }

  function initBirds(W, H) {
    birdGroups = FLOCK_DEFS.map(d => ({
      ...d,
      // Stagger: cada bandada empieza en distinto punto del recorrido
      x:         d.dir > 0 ? Math.random() * W * 1.5 - W * 0.2
                            : W * 0.2 + Math.random() * W * 1.5,
      y:         d.yFrac * H,
      flapPhase: Math.random() * Math.PI * 2,
      birds:     Array.from({ length: d.count }, (_, i) => makeBird(i, d.size)),
    }));
  }

  function drawBirdWing(ctx, x, y, size, flap) {
    // Dos curvitas de bezier formando la W clásica del pájaro en vuelo
    const wh = flap * size * 0.42;
    ctx.beginPath();
    ctx.moveTo(x - size, y + size * 0.12);
    ctx.quadraticCurveTo(x - size * 0.45, y - wh, x, y);
    ctx.quadraticCurveTo(x + size * 0.45, y - wh, x + size, y + size * 0.12);
    ctx.stroke();
  }

  function drawBirds(W, H, phase) {
    // Desvanecer durante noche
    const p = phase % 1;
    let alpha = 1;
    if (p >= 0.76 && p < 0.86) alpha = 1 - (p - 0.76) / 0.10;
    else if (p >= 0.86 && p < 0.99) alpha = 0;
    else if (p < 0.04) alpha = p / 0.04;
    if (alpha <= 0) return;

    bgCtx.save();
    bgCtx.lineCap = 'round';

    for (const g of birdGroups) {
      // Avanzar bandada
      g.x += g.dir * g.spd * W;
      if (g.dir >  0 && g.x >  W + 300) g.x = -300;
      if (g.dir < -0 && g.x < -300)     g.x =  W + 300;

      // Color de silueta cambia con el ciclo: azul-oscuro de día, naranja en atardecer
      const tint    = getTint(phase);
      const r       = Math.round(25  + Math.max(0, tint) * 80);
      const gC      = Math.round(40  + Math.max(0, tint) * 40);
      const b       = Math.round(65  - Math.max(0, tint) * 40);
      bgCtx.strokeStyle = `rgba(${r},${gC},${b},${alpha * 0.80})`;

      for (const bird of g.birds) {
        const bx   = g.x + bird.dx;
        const by   = g.y + bird.dy;
        const flap = Math.sin(t * g.flapHz + g.flapPhase + bird.fo);
        bgCtx.lineWidth = g.size * 0.30;
        drawBirdWing(bgCtx, bx, by, g.size, flap);
      }
    }

    bgCtx.restore();
  }

  // ── Islas flotantes ───────────────────────────────────────────
  const ISLAND_DEFS = [
    { fx: 0.18, fy: 0.62, w: 110, h: 38, spd: 1.4e-4, bobPhase: 0.0 },
    { fx: 0.55, fy: 0.70, w: 160, h: 50, spd: 1.0e-4, bobPhase: 1.8 },
    { fx: 0.80, fy: 0.58, w:  85, h: 28, spd: 1.8e-4, bobPhase: 3.4 },
  ];

  function initIslands(W, H) {
    islands = ISLAND_DEFS.map(d => ({
      ...d,
      x: d.fx * W,
      y: d.fy * H,
    }));
  }

  function drawIsland(x, y, w, h, tint) {
    // Paleta cristal: azul-cian en mediodía, dorado-cian en atardecer
    const cR = Math.round(100 + Math.max(0, tint) * 80);
    const cG = Math.round(200 + Math.max(0, tint) * 30);
    const cB = 255;

    // ── Sombra difusa bajo la isla ──
    const shad = bgCtx.createRadialGradient(x, y + h * 0.75, 0, x, y + h * 0.75, w * 0.62);
    shad.addColorStop(0, 'rgba(30,70,160,0.20)');
    shad.addColorStop(1, 'rgba(30,70,160,0)');
    bgCtx.fillStyle = shad;
    bgCtx.beginPath();
    bgCtx.ellipse(x, y + h * 0.82, w * 0.56, h * 0.18, 0, 0, Math.PI * 2);
    bgCtx.fill();

    // ── Base cristalina (polígono angular) ──
    const pts = [
      [x - w*0.50, y + h*0.08],
      [x - w*0.38, y + h*0.42],
      [x,          y + h*0.52],
      [x + w*0.38, y + h*0.42],
      [x + w*0.50, y + h*0.08],
      [x + w*0.24, y - h*0.06],
      [x - w*0.24, y - h*0.06],
    ];

    // Relleno translúcido
    bgCtx.beginPath();
    bgCtx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i++) bgCtx.lineTo(...pts[i]);
    bgCtx.closePath();
    bgCtx.fillStyle = `rgba(${cR},${cG},${cB},0.18)`;
    bgCtx.fill();

    // Faceta superior más luminosa
    bgCtx.beginPath();
    bgCtx.moveTo(...pts[6]); bgCtx.lineTo(...pts[5]);
    bgCtx.lineTo(...pts[4]); bgCtx.lineTo(...pts[0]);
    bgCtx.closePath();
    bgCtx.fillStyle = 'rgba(255,255,255,0.16)';
    bgCtx.fill();

    // Borde nítido cristalino
    bgCtx.strokeStyle = `rgba(${cR + 40},${cG + 20},255,0.55)`;
    bgCtx.lineWidth = 1.2;
    bgCtx.beginPath();
    bgCtx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i++) bgCtx.lineTo(...pts[i]);
    bgCtx.closePath();
    bgCtx.stroke();

    // Línea de faceta interna
    bgCtx.strokeStyle = 'rgba(255,255,255,0.22)';
    bgCtx.lineWidth = 0.8;
    bgCtx.beginPath();
    bgCtx.moveTo(...pts[6]); bgCtx.lineTo(x, y + h * 0.18); bgCtx.lineTo(...pts[5]);
    bgCtx.stroke();

    // ── Cristales inclinados (geodo, no montañas) ──
    // Cada cristal se dibuja con rotate para inclinar en distintas direcciones
    const crystals = [
      { ox: -w*0.08, len: h*1.10, hw: w*0.095, angle: -0.38 },  // inclinado izquierda
      { ox:  w*0.12, len: h*0.90, hw: w*0.080, angle:  0.28 },  // inclinado derecha
      { ox: -w*0.26, len: h*0.75, hw: w*0.065, angle: -0.62 },  // muy inclinado izq
      { ox:  w*0.28, len: h*0.70, hw: w*0.060, angle:  0.55 },  // muy inclinado der
      { ox:  0,      len: h*0.82, hw: w*0.055, angle:  0.08 },  // casi vertical, leve sesgo
    ];

    const base = y - h * 0.04;

    for (const c of crystals) {
      const sx = x + c.ox;

      bgCtx.save();
      bgCtx.translate(sx, base);
      bgCtx.rotate(c.angle);

      // Relleno translúcido
      bgCtx.beginPath();
      bgCtx.moveTo(-c.hw, 0);
      bgCtx.lineTo(0, -c.len);
      bgCtx.lineTo(c.hw, 0);
      bgCtx.closePath();
      bgCtx.fillStyle = `rgba(${cR - 10},${cG + 10},${cB},0.24)`;
      bgCtx.fill();

      // Faceta brillante (mitad izquierda)
      bgCtx.beginPath();
      bgCtx.moveTo(-c.hw, 0);
      bgCtx.lineTo(0, -c.len);
      bgCtx.lineTo(0, 0);
      bgCtx.closePath();
      bgCtx.fillStyle = 'rgba(255,255,255,0.20)';
      bgCtx.fill();

      // Borde nítido
      bgCtx.strokeStyle = `rgba(${cR + 50},${cG + 30},255,0.58)`;
      bgCtx.lineWidth = 1.0;
      bgCtx.beginPath();
      bgCtx.moveTo(-c.hw, 0);
      bgCtx.lineTo(0, -c.len);
      bgCtx.lineTo(c.hw, 0);
      bgCtx.closePath();
      bgCtx.stroke();

      bgCtx.restore();
    }

    // ── Glow interior pulsante ──
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.025 + x * 0.008);
    const glow  = bgCtx.createRadialGradient(x, y - h * 0.35, 0, x, y - h * 0.35, w * 0.38);
    glow.addColorStop(0, `rgba(${cR},${cG},255,${0.14 * pulse})`);
    glow.addColorStop(1, `rgba(${cR},${cG},255,0)`);
    bgCtx.fillStyle = glow;
    bgCtx.beginPath();
    bgCtx.ellipse(x, y - h * 0.35, w * 0.38, h * 0.80, 0, 0, Math.PI * 2);
    bgCtx.fill();

    // ── Destellos en las puntas (posición real rotada) ──
    const sPulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.03 + x * 0.005));
    bgCtx.fillStyle = `rgba(255,255,255,${sPulse * 0.88})`;
    for (const c of crystals) {
      // Punta real = base + vector rotado de longitud c.len
      const tx = (x + c.ox) - Math.sin(c.angle) * c.len;
      const ty = base        - Math.cos(c.angle) * c.len;
      bgCtx.beginPath();
      bgCtx.arc(tx, ty, 1.8 * sPulse, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }

  function drawIslands(W, H, tint) {
    for (const isl of islands) {
      // Bob suave vertical
      const bob = Math.sin(t * 0.006 + isl.bobPhase) * 5;
      // Drift horizontal lento
      isl.x += isl.spd * W;
      if (isl.x > W + isl.w + 50) isl.x = -isl.w - 50;

      bgCtx.save();
      bgCtx.globalAlpha = 0.88;
      drawIsland(isl.x, isl.y + bob, isl.w, isl.h, tint);
      bgCtx.restore();
    }
  }

  // ── Lluvia ────────────────────────────────────────────────────
  // Aparece solo en la transición noche→amanecer (phase 0.88–0.05)
  function initRain(W, H) {
    rainDrops = Array.from({ length: 200 }, () => ({
      x:   Math.random() * W,
      y:   Math.random() * H,
      len: 8  + Math.random() * 14,
      spd: 6  + Math.random() * 8,
      alpha: 0.25 + Math.random() * 0.35,
    }));
  }

  function drawRain(W, H, phase) {
    const p = phase % 1;
    // Lluvia visible solo en 0.86–0.99 y 0.0–0.06
    let target = 0;
    if (p >= 0.86 && p < 0.93)      target = (p - 0.86) / 0.07;
    else if (p >= 0.93 && p < 0.99) target = 1;
    else if (p < 0.06)              target = Math.max(0, 1 - p / 0.06);

    rainAlpha += (target - rainAlpha) * 0.04;
    if (rainAlpha < 0.01) return;

    bgCtx.save();
    bgCtx.strokeStyle = `rgba(180,210,255,1)`;
    bgCtx.lineCap = 'round';

    for (const d of rainDrops) {
      d.y += d.spd;
      d.x -= d.spd * 0.15;  // leve ángulo con el viento
      if (d.y > H + 20) { d.y = -20; d.x = Math.random() * W; }
      if (d.x < -5)     d.x = W + 5;

      bgCtx.globalAlpha = rainAlpha * d.alpha;
      bgCtx.lineWidth   = 0.8;
      bgCtx.beginPath();
      bgCtx.moveTo(d.x, d.y);
      bgCtx.lineTo(d.x - d.len * 0.15, d.y + d.len);
      bgCtx.stroke();
    }

    bgCtx.restore();
  }

  // ── Arcoíris ─────────────────────────────────────────────────
  // Aparece justo después de la lluvia, en amanecer (phase 0.02–0.18)
  function drawRainbow(W, H, phase) {
    const p = phase % 1;
    let alpha = 0;
    if (p >= 0.01 && p < 0.06)       alpha = (p - 0.01) / 0.05;
    else if (p >= 0.06 && p < 0.14)  alpha = 1;
    else if (p >= 0.14 && p < 0.22)  alpha = 1 - (p - 0.14) / 0.08;
    if (alpha <= 0.01) return;

    const cx = W * 0.5;
    const cy = H * 0.92;  // centro del arco debajo de la pantalla
    const bands = [
      { r: W * 0.72, color: '255,60,60'   },  // rojo
      { r: W * 0.66, color: '255,140,0'   },  // naranja
      { r: W * 0.60, color: '255,230,0'   },  // amarillo
      { r: W * 0.54, color: '60,200,60'   },  // verde
      { r: W * 0.48, color: '40,140,255'  },  // azul
      { r: W * 0.42, color: '120,60,220'  },  // índigo
      { r: W * 0.36, color: '200,60,220'  },  // violeta
    ];

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';

    for (const band of bands) {
      bgCtx.beginPath();
      bgCtx.arc(cx, cy, band.r, Math.PI, Math.PI * 2);
      bgCtx.strokeStyle = `rgba(${band.color},${alpha * 0.14})`;
      bgCtx.lineWidth   = W * 0.022;
      bgCtx.stroke();
    }

    bgCtx.restore();
  }

  // ── Polvo de luz ──────────────────────────────────────────────
  function initDust(W, H) {
    dustMotes = Array.from({ length: 55 }, () => ({
      x:         Math.random() * W,
      y:         Math.random() * H,
      r:         0.9 + Math.random() * 2.1,
      vy:       -0.14 - Math.random() * 0.24,
      vx:        (Math.random() - 0.5) * 0.14,
      wavePhase: Math.random() * Math.PI * 2,
      alpha:     0.28 + Math.random() * 0.38,
    }));
  }

  function drawDust(W, H) {
    bgCtx.save();
    for (const d of dustMotes) {
      d.y += d.vy;
      d.x += d.vx + 0.07 * Math.sin(t * 0.007 + d.wavePhase);
      if (d.y < -5)  { d.y = H + 5; d.x = Math.random() * W; }
      if (d.x < -5)  d.x = W + 5;
      if (d.x > W+5) d.x = -5;

      const g = bgCtx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 2.2);
      g.addColorStop(0, `rgba(255,248,220,${d.alpha})`);
      g.addColorStop(1, `rgba(255,240,200,0)`);
      bgCtx.fillStyle = g;
      bgCtx.beginPath();
      bgCtx.arc(d.x, d.y, d.r * 2.2, 0, Math.PI*2);
      bgCtx.fill();
    }
    bgCtx.restore();
  }

  // ── Puffs de clic (nube que nace en el cursor) ────────────────
  function spawnPuff(x, y) {
    spawnPuffs.push({ x, y, life: 0, maxLife: 100 });
  }

  function drawSpawnPuffs(tint) {
    for (let i = spawnPuffs.length - 1; i >= 0; i--) {
      const sp = spawnPuffs[i];
      sp.life++;
      const progress = sp.life / sp.maxLife;
      const sc       = progress * 1.15;
      const alpha    = progress < 0.3
        ? progress / 0.3
        : 1 - (progress - 0.3) / 0.7;
      if (sp.life >= sp.maxLife) { spawnPuffs.splice(i, 1); continue; }

      bgCtx.save();
      bgCtx.globalAlpha = alpha * 0.88;
      drawCloudShape(bgCtx, sp.x, sp.y, 58 * sc, tint);
      bgCtx.restore();
    }
  }

  // ── Cursor ────────────────────────────────────────────────────
  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    trail.push({ x: mouseX, y: mouseY, a: 0.55 });
    if (trail.length > 20) trail.shift();

    for (let i = 0; i < trail.length - 1; i++) {
      const p  = trail[i];
      p.a     *= 0.87;
      const r  = 1.2 + i * 0.22;
      overCtx.beginPath();
      overCtx.arc(p.x, p.y, r, 0, Math.PI*2);
      overCtx.fillStyle = `rgba(255,255,255,${p.a})`;
      overCtx.fill();
    }

    // Anillo suave de luz
    const g = overCtx.createRadialGradient(mouseX, mouseY, 7, mouseX, mouseY, 24);
    g.addColorStop(0,   'rgba(255,255,255,0)');
    g.addColorStop(0.65,'rgba(210,235,255,0.22)');
    g.addColorStop(1,   'rgba(210,235,255,0)');
    overCtx.fillStyle = g;
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 24, 0, Math.PI*2);
    overCtx.fill();
  }

  // ── Sky ───────────────────────────────────────────────────────
  function drawSky(W, H, phase) {
    const { top, bot } = getSkyColors(phase);
    const g = bgCtx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,   top);
    g.addColorStop(0.7, bot);
    g.addColorStop(1,   bot);
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ── Loop ──────────────────────────────────────────────────────
  function frame() {
    t++;
    const W     = bgCanvas.width, H = bgCanvas.height;
    const phase = (t % CYCLE) / CYCLE;
    const tint  = getTint(phase);

    bgCtx.clearRect(0, 0, W, H);

    drawSky(W, H, phase);
    drawStars(W, H, phase);
    drawGodRays(W, H, phase);
    drawCelestialBody(W, H, phase);
    drawClouds(W, H, tint);
    drawIslands(W, H, tint);
    drawBirds(W, H, phase);
    drawRain(W, H, phase);
    drawRainbow(W, H, phase);
    drawSpawnPuffs(tint);
    drawDust(W, H);
    drawCursor(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width  = W; bgCanvas.height  = H;
    overCanvas.width = W; overCanvas.height = H;
    initClouds(W, H);
    initBirds(W, H);
    initIslands(W, H);
    initRain(W, H);
    initDust(W, H);
    initStars(W, H);
  }

  // ── API ───────────────────────────────────────────────────────
  const CloudcoreRenderer = {
    start() {
      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-cc-bg';
      Object.assign(bgCanvas.style, {
        position: 'fixed', inset: '0',
        width: '100%', height: '100%',
        zIndex: '-1', pointerEvents: 'none',
      });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-cc-over';
      Object.assign(overCanvas.style, {
        position: 'fixed', inset: '0',
        width: '100%', height: '100%',
        zIndex: '9998', pointerEvents: 'none',
      });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();
      window.addEventListener('resize', resize);

      _onMove  = e => { mouseX = e.clientX; mouseY = e.clientY; };
      _onClick = e => spawnPuff(e.clientX, e.clientY);
      document.addEventListener('mousemove', _onMove);
      document.addEventListener('click',     _onClick);

      raf = requestAnimationFrame(frame);
    },

    stop() {
      if (!bgCanvas) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (_onMove)  { document.removeEventListener('mousemove', _onMove);  _onMove  = null; }
      if (_onClick) { document.removeEventListener('click',     _onClick); _onClick = null; }
      bgCanvas.remove();   bgCanvas   = bgCtx   = null;
      overCanvas.remove(); overCanvas = overCtx = null;
      clouds = []; dustMotes = []; spawnPuffs = []; stars = []; birdGroups = [];
      rainDrops = []; islands = []; rainAlpha = 0;
      trail  = [];
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };

  return CloudcoreRenderer;
})();

export { CloudcoreRenderer };
