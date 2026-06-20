// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/esmeralda.js
//  Esmeralda — Bosque Ancestral Vivo
//
//  bgCanvas  (z:-1)   → cielo de bosque, estrellas jade, niebla,
//                        Árbol Ancestral (ramas + raíces + tips),
//                        luciérnagas errantes, esporas ascendentes,
//                        semillas flotantes
//  overCanvas (z:9998) → cursor bioluminiscente + hojas flotantes
//
//  Árbol Ancestral: LCG determinista → misma forma en cada sesión.
//  Ramas depth-5 con corteza oscura + vena de energía jade + nodos
//  luminosos en las puntas. Raíces con curvas orgánicas.
// ════════════════════════════════════════════════════════════════

const EsmeraldaRenderer = (() => {

  let bgCanvas = null,   bgCtx   = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;
  let spores = null, seeds = null, fireflies = null;

  // ── Cursor ──────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastLeaf = 0, _onMove = null;
  const cursorLeaves = [];

  // ── Árbol Ancestral (pre-computado en resize) ────────────────────────────
  let branches = [], roots = [];

  // ── Campo estelar — 110 estrellas (jade / dorado / blanco frio) ─────────
  const STARS = Array.from({ length: 110 }, (_, i) => ({
    x:    (i * 173.71 +  5.30) % 100,
    y:    (i * 127.37 +  8.10) % 52,   // solo cielo superior
    r:    i % 9 === 0 ? 1.30 : i % 5 === 0 ? 0.88 : 0.52,
    phase: i * 0.7131,
    spd:   0.000380 + (i % 7) * 0.000140,
    jade:  i % 7 === 0,
    gold:  i % 13 === 0,
  }));

  // ════════════════════════════════════════════════════════════════════════
  //  Init — partículas y árbol
  // ════════════════════════════════════════════════════════════════════════
  function initFireflies(W, H) {
    fireflies = Array.from({ length: 26 }, (_, i) => ({
      x:      (i * 217.31 + 80) % W,
      y:      (i * 163.47 + 40) % (H * 0.82),
      vx:     Math.sin(i * 2.3) * 0.18,
      vy:     Math.cos(i * 1.7) * 0.14,
      phase:  i * 0.8231,
      wander: i * 1.234,
      size:   2.0 + (i % 3) * 0.9,
      deep:   i % 4 === 0,
    }));
  }

  function initSpores(W, H) {
    spores = Array.from({ length: 78 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      size:  0.4 + Math.random() * 1.1,
      vx:    (Math.random() - 0.5) * 0.055,
      vy:   -(0.08 + Math.random() * 0.22),
      alpha: 0.08 + Math.random() * 0.24,
      phase: Math.random() * Math.PI * 2,
      glow:  Math.random() < 0.22,
    }));
  }

  function initSeeds(W, H) {
    seeds = Array.from({ length: 18 }, () => ({
      x:      Math.random() * W,
      y:      Math.random() * H,
      vx:     (Math.random() - 0.5) * 0.07,
      vy:    -(0.05 + Math.random() * 0.10),
      angle:  Math.random() * Math.PI * 2,
      spin:   (Math.random() - 0.5) * 0.014,
      wobble: Math.random() * Math.PI * 2,
      size:   2.8 + Math.random() * 2.2,
      alpha:  0.30 + Math.random() * 0.22,
    }));
  }

  // ── Árbol Ancestral — LCG determinista (misma forma siempre) ────────────
  function buildTree(W, H) {
    branches = [];
    roots    = [];

    let seed = 42;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0x100000000;
    };

    const rootX = W * 0.16;
    const rootY = H * 1.02;

    function addBranch(x0, y0, angle, length, width, depth) {
      if (depth <= 0 || length < 7) return;
      const curl = (rnd() - 0.5) * 0.22;
      const cpX  = x0 + Math.cos(angle + curl * 0.4) * length * 0.52;
      const cpY  = y0 + Math.sin(angle + curl * 0.4) * length * 0.52;
      const x1   = x0 + Math.cos(angle + curl) * length;
      const y1   = y0 + Math.sin(angle + curl) * length;
      branches.push({ x0, y0, x1, y1, cpX, cpY, width, depth, phase: rnd() * Math.PI * 2 });
      if (depth > 1) {
        addBranch(x1, y1, angle - (0.32 + rnd()*0.20), length * (0.63 + rnd()*0.09), width * 0.70, depth - 1);
        addBranch(x1, y1, angle + (0.26 + rnd()*0.18), length * (0.60 + rnd()*0.09), width * 0.65, depth - 1);
        if (depth >= 3 && rnd() < 0.42)
          addBranch(x1, y1, angle - 0.05 + rnd()*0.10, length * 0.48, width * 0.46, depth - 2);
      }
    }

    function addRoot(x0, y0, angle, length, width, depth) {
      if (depth <= 0 || length < 5) return;
      const curl = (rnd() - 0.5) * 0.35;
      const x1   = x0 + Math.cos(angle + curl) * length;
      const y1   = y0 + Math.sin(angle + curl) * length;
      const cpX  = x0 + Math.cos(angle) * length * 0.5 + (rnd()-0.5)*length*0.4;
      const cpY  = y0 + Math.sin(angle) * length * 0.5 + rnd()*length*0.25;
      roots.push({ x0, y0, x1, y1, cpX, cpY, width, depth, phase: rnd() * Math.PI * 2 });
      if (depth > 1) {
        addRoot(x1, y1, angle - 0.38 - rnd()*0.25, length*0.65, width*0.70, depth-1);
        addRoot(x1, y1, angle + 0.30 + rnd()*0.22, length*0.60, width*0.65, depth-1);
      }
    }

    // Tronco principal (ligeramente inclinado a la derecha)
    addBranch(rootX, rootY, -Math.PI * 0.52, H * 0.30, 16, 5);

    // Cuatro sistemas de raíces
    addRoot(rootX,          rootY, Math.PI * 0.62, H * 0.11, 6, 3);
    addRoot(rootX,          rootY, Math.PI * 0.80, H * 0.09, 5, 3);
    addRoot(rootX,          rootY, Math.PI * 0.96, H * 0.08, 4, 2);
    addRoot(rootX + W*0.06, rootY, Math.PI * 0.55, H * 0.10, 5, 3);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Fondo: cielo oscuro → suelo de bosque
  // ════════════════════════════════════════════════════════════════════════
  function drawBackground(W, H) {
    const sky = bgCtx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0.00, 'rgba(1, 5, 2, 1)');
    sky.addColorStop(0.30, 'rgba(2, 9, 4, 1)');
    sky.addColorStop(0.62, 'rgba(4, 15, 7, 1)');
    sky.addColorStop(0.82, 'rgba(7, 22, 10, 1)');
    sky.addColorStop(1.00, 'rgba(10, 28, 14, 1)');
    bgCtx.fillStyle = sky;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Luz ambiental: niebla, halo del árbol, vigneta
  // ════════════════════════════════════════════════════════════════════════
  function drawAmbient(W, H) {
    const pulse = 0.80 + 0.20 * Math.sin(t * 0.00030);
    const drift = Math.sin(t * 0.00018) * 0.04;

    // Halo principal desde la base del Árbol
    const treeGlow = bgCtx.createRadialGradient(W*0.16, H*0.68, 0, W*0.16, H*0.68, W*0.55);
    treeGlow.addColorStop(0.00, `rgba(30, 130, 60, ${0.054 * pulse})`);
    treeGlow.addColorStop(0.40, `rgba(15,  85, 38, ${0.022 * pulse})`);
    treeGlow.addColorStop(1.00, 'rgba(0,0,0,0)');
    bgCtx.fillStyle = treeGlow;
    bgCtx.fillRect(0, 0, W, H);

    // Puntos de luz secundaria (profundidad de bosque)
    [
      [W * (0.72 + drift),        H * 0.54, W * 0.38, 0.032],
      [W * (0.45 - drift * 0.6),  H * 0.81, W * 0.45, 0.028],
      [W * 0.88,                  H * 0.34, W * 0.28, 0.022],
    ].forEach(([cx, cy, r, str]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0.0, `rgba(38, 140, 68, ${str * pulse})`);
      g.addColorStop(0.5, `rgba(18,  88, 42, ${str * 0.38 * pulse})`);
      g.addColorStop(1.0, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = g;
      bgCtx.fillRect(0, 0, W, H);
    });

    // Niebla rasa en la parte baja
    const mistDrift = Math.sin(t * 0.00014) * 0.05;
    [
      [W * (0.48 + mistDrift),       H * 0.80, W * 0.60, 0.054],
      [W * (0.76 - mistDrift * 0.7), H * 0.87, W * 0.45, 0.042],
      [W * (0.22 + mistDrift * 0.4), H * 0.92, W * 0.38, 0.035],
    ].forEach(([cx, cy, r, str]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0.0, `rgba(45, 140, 75, ${str * pulse})`);
      g.addColorStop(0.6, `rgba(22,  85, 44, ${str * 0.38 * pulse})`);
      g.addColorStop(1.0, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = g;
      bgCtx.fillRect(0, 0, W, H);
    });

    // Viñeta
    const vig = bgCtx.createRadialGradient(W/2, H/2, H*0.22, W/2, H/2, W*0.74);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(1, 4, 2, ${0.38 * pulse})`);
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
      const al = tw * (0.18 + s.r * 0.16);
      bgCtx.fillStyle = s.jade ? `rgba(100,240,155,${al})`
                      : s.gold ? `rgba(220,210,140,${al})`
                      :           `rgba(185,235,205,${al})`;
      bgCtx.beginPath();
      bgCtx.arc(sx, sy, s.r, 0, Math.PI * 2);
      bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — ÁRBOL ANCESTRAL
  //  Corteza oscura + vena de energía jade + nodos luminosos en puntas
  // ════════════════════════════════════════════════════════════════════════
  function drawTree(W, H) {
    if (!branches.length) return;
    const MAX_DEPTH = 5;

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    bgCtx.lineCap = 'round';

    // — Raíces —
    roots.forEach(r => {
      const df    = r.depth / 3;
      const pulse = 0.60 + 0.40 * Math.sin(t * 0.00110 + r.phase);

      bgCtx.beginPath();
      bgCtx.moveTo(r.x0, r.y0);
      bgCtx.quadraticCurveTo(r.cpX, r.cpY, r.x1, r.y1);
      bgCtx.strokeStyle = `rgba(20, 90, 45, ${0.22 * df * pulse})`;
      bgCtx.lineWidth   = r.width * 2.5;
      bgCtx.stroke();

      bgCtx.beginPath();
      bgCtx.moveTo(r.x0, r.y0);
      bgCtx.quadraticCurveTo(r.cpX, r.cpY, r.x1, r.y1);
      bgCtx.strokeStyle = `rgba(35, 145, 68, ${0.30 * df * pulse})`;
      bgCtx.lineWidth   = r.width;
      bgCtx.stroke();
    });

    // — Ramas: de gruesas a finas —
    const sorted = [...branches].sort((a, b) => b.width - a.width);
    sorted.forEach(b => {
      const df    = (MAX_DEPTH + 1 - b.depth) / MAX_DEPTH;
      const pulse = 0.65 + 0.35 * Math.sin(t * 0.00095 + b.phase);

      // Corteza (ancho, oscuro)
      bgCtx.beginPath();
      bgCtx.moveTo(b.x0, b.y0);
      bgCtx.quadraticCurveTo(b.cpX, b.cpY, b.x1, b.y1);
      bgCtx.strokeStyle = `rgba(12, 55, 25, ${0.65 * pulse})`;
      bgCtx.lineWidth   = b.width * 2.8;
      bgCtx.stroke();

      // Vena de energía (jade)
      bgCtx.beginPath();
      bgCtx.moveTo(b.x0, b.y0);
      bgCtx.quadraticCurveTo(b.cpX, b.cpY, b.x1, b.y1);
      bgCtx.strokeStyle = `rgba(42, 175, 85, ${(0.35 + 0.40 * df) * pulse})`;
      bgCtx.lineWidth   = b.width * 1.1;
      bgCtx.stroke();

      // Núcleo brillante solo en ramas finas (puntas)
      if (b.depth <= 2) {
        bgCtx.beginPath();
        bgCtx.moveTo(b.x0, b.y0);
        bgCtx.quadraticCurveTo(b.cpX, b.cpY, b.x1, b.y1);
        bgCtx.strokeStyle = `rgba(88, 228, 128, ${0.45 * df * pulse})`;
        bgCtx.lineWidth   = b.width * 0.4;
        bgCtx.stroke();
      }
    });

    // — Nodos luminosos en las puntas (depth 1) —
    branches.filter(b => b.depth === 1).forEach(b => {
      const pulse = 0.55 + 0.45 * Math.sin(t * 0.00140 + b.phase);
      const gR    = b.width * 5.5;

      const g = bgCtx.createRadialGradient(b.x1, b.y1, 0, b.x1, b.y1, gR);
      g.addColorStop(0.00, `rgba(155, 255, 190, ${0.72 * pulse})`);
      g.addColorStop(0.40, `rgba(72,  210, 115, ${0.38 * pulse})`);
      g.addColorStop(1.00, 'rgba(0,0,0,0)');
      bgCtx.beginPath();
      bgCtx.arc(b.x1, b.y1, gR, 0, Math.PI * 2);
      bgCtx.fillStyle = g;
      bgCtx.fill();

      bgCtx.beginPath();
      bgCtx.arc(b.x1, b.y1, b.width * 0.65, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(200, 255, 220, ${0.85 * pulse})`;
      bgCtx.fill();
    });

    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Luciérnagas errantes
  // ════════════════════════════════════════════════════════════════════════
  function drawFireflies(W, H) {
    if (!fireflies) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    fireflies.forEach(f => {
      // Movimiento browniano suave
      f.wander += 0.008;
      f.vx += Math.cos(f.wander * 0.65) * 0.015;
      f.vy += Math.sin(f.wander * 0.52) * 0.012;
      const spd = Math.sqrt(f.vx*f.vx + f.vy*f.vy);
      if (spd > 0.58) { f.vx *= 0.58/spd; f.vy *= 0.58/spd; }
      f.x += f.vx; f.y += f.vy;
      if (f.x < 0)       f.x = W;
      if (f.x > W)       f.x = 0;
      if (f.y < 0)       f.y = H * 0.82;
      if (f.y > H*0.94)  f.y = H * 0.05;

      const tw    = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.00090 + f.phase * 0.00030) + f.phase));
      const alpha = (f.deep ? 0.44 : 0.72) * tw;

      const g = bgCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 12);
      g.addColorStop(0.00, `rgba(88, 235, 128, ${alpha * 0.55})`);
      g.addColorStop(0.30, `rgba(50, 190,  90, ${alpha * 0.22})`);
      g.addColorStop(1.00, 'rgba(0,0,0,0)');
      bgCtx.beginPath();
      bgCtx.arc(f.x, f.y, f.size * 12, 0, Math.PI * 2);
      bgCtx.fillStyle = g;
      bgCtx.fill();

      bgCtx.beginPath();
      bgCtx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(175, 255, 200, ${alpha * 0.95})`;
      bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Esporas ascendentes
  // ════════════════════════════════════════════════════════════════════════
  function drawSpores(W, H) {
    if (!spores) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    spores.forEach(p => {
      const tw = 0.50 + 0.50 * Math.sin(t * 0.00135 + p.phase);
      if (p.glow) {
        const g = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
        g.addColorStop(0, `rgba(72, 210, 110, ${p.alpha * tw * 1.3})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
        bgCtx.fillStyle = g;
        bgCtx.fill();
      }
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(68, 208, 108, ${p.alpha * tw})`;
      bgCtx.fill();

      p.x += p.vx + Math.sin(t * 0.0018 + p.phase) * 0.07;
      p.y += p.vy;
      if (p.y < -6)    { p.y = H + 6; p.x = Math.random() * W; }
      if (p.x < -6)    { p.x = W + 6; }
      if (p.x > W + 6) { p.x = -6; }
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Semillas flotantes (cuerpo + filamento)
  // ════════════════════════════════════════════════════════════════════════
  function drawOneSeed(x, y, angle, size, alpha) {
    bgCtx.save();
    bgCtx.translate(x, y);
    bgCtx.rotate(angle);
    bgCtx.globalAlpha = alpha;

    bgCtx.beginPath();
    bgCtx.ellipse(0, 0, size * 0.35, size * 0.75, 0, 0, Math.PI * 2);
    bgCtx.fillStyle = 'rgba(155, 248, 180, 0.88)';
    bgCtx.fill();

    bgCtx.beginPath();
    bgCtx.moveTo(0, size * 0.75);
    bgCtx.bezierCurveTo(size*0.28, size*1.5, size*0.45, size*2.1, size*0.08, size*2.8);
    bgCtx.strokeStyle = 'rgba(90, 210, 130, 0.48)';
    bgCtx.lineWidth   = 0.55;
    bgCtx.lineCap     = 'round';
    bgCtx.stroke();

    bgCtx.restore();
  }

  function drawSeeds(W, H) {
    if (!seeds) return;
    seeds.forEach(s => {
      s.wobble += 0.016;
      s.x += s.vx + Math.sin(s.wobble) * 0.13;
      s.y += s.vy;
      s.angle += s.spin;
      if (s.y < -22) { s.y = H + 22; s.x = Math.random() * W; }
      if (s.x < -12) s.x = W + 12;
      if (s.x > W+12) s.x = -12;
      const tw = 0.6 + 0.4 * Math.sin(t * 0.00076 + s.wobble);
      drawOneSeed(s.x, s.y, s.angle, s.size, s.alpha * tw);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor: halo bioluminiscente + hojas flotantes
  // ════════════════════════════════════════════════════════════════════════
  function drawLeaf(ctx, x, y, angle, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;

    // Forma bezier de hoja: punta arriba, base redondeada
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo( size*0.90, -size*0.30,  size*0.90, size*0.50, 0, size*0.95);
    ctx.bezierCurveTo(-size*0.90,  size*0.50, -size*0.90, -size*0.30, 0, -size);
    ctx.closePath();
    ctx.fillStyle = `rgba(55, 195, 100, ${alpha * 0.85})`;
    ctx.fill();

    // Nervio central
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.80);
    ctx.lineTo(0,  size * 0.80);
    ctx.strokeStyle = `rgba(130, 255, 165, ${alpha * 0.38})`;
    ctx.lineWidth   = 0.40;
    ctx.stroke();

    ctx.restore();
  }

  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    const outerGlow = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 48);
    outerGlow.addColorStop(0.00, 'rgba(55, 200, 100, 0.08)');
    outerGlow.addColorStop(0.45, 'rgba(35, 155,  70, 0.03)');
    outerGlow.addColorStop(1.00, 'rgba(0,0,0,0)');
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 48, 0, Math.PI * 2);
    overCtx.fillStyle = outerGlow;
    overCtx.fill();

    const innerGlow = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 14);
    innerGlow.addColorStop(0.00, 'rgba(120, 255, 160, 0.18)');
    innerGlow.addColorStop(0.40, 'rgba(55, 200,  100, 0.08)');
    innerGlow.addColorStop(1.00, 'rgba(0,0,0,0)');
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 14, 0, Math.PI * 2);
    overCtx.fillStyle = innerGlow;
    overCtx.fill();

    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, 1.8, 0, Math.PI * 2);
    overCtx.fillStyle = 'rgba(165, 255, 192, 0.55)';
    overCtx.fill();

    // Hojas flotantes que salen del cursor
    for (let i = cursorLeaves.length - 1; i >= 0; i--) {
      const l = cursorLeaves[i];
      drawLeaf(overCtx, l.x, l.y, l.angle, l.size, l.alpha);
      l.x     += l.vx;
      l.y     += l.vy;
      l.vy    += 0.008;   // gravedad suave
      l.angle += l.spin;
      l.alpha -= 0.011;
      if (l.alpha <= 0) cursorLeaves.splice(i, 1);
    }

    overCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LOOP
  // ════════════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W = bgCanvas.width, H = bgCanvas.height;

    bgCtx.clearRect(0, 0, W, H);
    drawBackground(W, H);
    drawAmbient(W, H);
    drawStars(W, H);
    drawTree(W, H);
    drawFireflies(W, H);
    drawSpores(W, H);
    drawSeeds(W, H);

    drawCursor(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width   = W; bgCanvas.height   = H;
    overCanvas.width = W; overCanvas.height = H;
    initFireflies(W, H);
    initSpores(W, H);
    initSeeds(W, H);
    buildTree(W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-esm-bg';
      Object.assign(bgCanvas.style, {
        position: 'fixed', inset: '0',
        pointerEvents: 'none', zIndex: '-1',
      });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-esm-over';
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
        if (now - lastLeaf > 225 && cursorLeaves.length < 7) {
          lastLeaf = now;
          const a   = Math.random() * Math.PI * 2;
          const spd = 0.8 + Math.random() * 1.2;
          cursorLeaves.push({
            x: mouseX, y: mouseY,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd - 0.8,
            angle: Math.random() * Math.PI * 2,
            spin:  (Math.random() - 0.5) * 0.06,
            size:  3 + Math.random() * 3,
            alpha: 0.22 + Math.random() * 0.14,
          });
        }
      };
      document.addEventListener('mousemove',  _onMove, { passive: true });
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
      fireflies = spores = seeds = null;
      branches = []; roots = [];
      cursorLeaves.length = 0;
      mouseX = mouseY = -999;
      raf = null; t = 0;
    },
  };
})();

export { EsmeraldaRenderer };
