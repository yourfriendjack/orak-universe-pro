// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/esmeralda.js  v2
//  Esmeralda — Bosque Ancestral entre las Estrellas
//
//  bgCanvas  (z:-1)   → cielo índigo-cósmico, estrellas jade,
//                        rayos de luz filtrada, niebla, Árbol de
//                        Cristal Esmeralda (ramas+hojas+cristales+
//                        orbe del alma), luciérnagas con silueta,
//                        esporas, semillas, bloom de clic
//  overCanvas (z:9998) → cursor: anillo respirante + rastro bio-
//                        luminiscente + hojas flotantes
//
//  Interactividad:
//   · Clic → explosión orgánica de esporas (bloom)
//   · Clic cerca de luciérnaga → huye asustada
// ════════════════════════════════════════════════════════════════

const EsmeraldaRenderer = (() => {

  let bgCanvas = null,   bgCtx   = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;
  let spores = null, seeds = null, fireflies = null;

  // ── Cursor ──────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastLeaf = 0, lastTrailT = 0, _onMove = null, _onClick = null;
  const cursorLeaves = [], trailDots = [];

  // ── Árbol ───────────────────────────────────────────────────────────────
  let branches = [], roots = [];
  let soulX = 0, soulY = 0;

  // ── Bloom de clic ───────────────────────────────────────────────────────
  const blooms = [];

  // ── Campo estelar — 120 estrellas deterministas ─────────────────────────
  const STARS = Array.from({ length: 120 }, (_, i) => ({
    x:    (i * 173.71 +  5.30) % 100,
    y:    (i * 127.37 +  8.10) % 58,
    r:    i % 9 === 0 ? 1.35 : i % 5 === 0 ? 0.90 : 0.54,
    phase: i * 0.7131,
    spd:   0.000360 + (i % 7) * 0.000138,
    jade:  i % 7 === 0,
    gold:  i % 13 === 0,
    violet: i % 17 === 0,
  }));

  // ════════════════════════════════════════════════════════════════════════
  //  Init — partículas
  // ════════════════════════════════════════════════════════════════════════
  function initFireflies(W, H) {
    fireflies = Array.from({ length: 24 }, (_, i) => ({
      x:      (i * 217.31 + 80) % W,
      y:      (i * 163.47 + 40) % (H * 0.82),
      vx:     Math.sin(i * 2.3) * 0.18,
      vy:     Math.cos(i * 1.7) * 0.14,
      angle:  0,
      phase:  i * 0.8231,
      wander: i * 1.234,
      size:   2.4 + (i % 3) * 1.0,
      deep:   i % 4 === 0,
    }));
  }

  function initSpores(W, H) {
    spores = Array.from({ length: 82 }, () => ({
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
    seeds = Array.from({ length: 16 }, () => ({
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

  // ════════════════════════════════════════════════════════════════════════
  //  Árbol de Cristal Esmeralda — LCG determinista
  //  branch guarda el ángulo para los racimos de hojas
  // ════════════════════════════════════════════════════════════════════════
  function buildTree(W, H) {
    branches = []; roots = [];
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 0x100000000;
    };

    const rootX = W * 0.18, rootY = H * 1.02;

    function addBranch(x0, y0, angle, length, width, depth) {
      if (depth <= 0 || length < 6) return;
      const curl = (rnd() - 0.5) * 0.22;
      const finalAngle = angle + curl;
      const cpX = x0 + Math.cos(angle + curl * 0.4) * length * 0.52;
      const cpY = y0 + Math.sin(angle + curl * 0.4) * length * 0.52;
      const x1  = x0 + Math.cos(finalAngle) * length;
      const y1  = y0 + Math.sin(finalAngle) * length;
      branches.push({ x0, y0, x1, y1, cpX, cpY, width, depth,
                      angle: finalAngle, phase: rnd() * Math.PI * 2 });
      if (depth > 1) {
        addBranch(x1, y1, finalAngle - (0.30 + rnd()*0.22), length*(0.62+rnd()*0.09), width*0.70, depth-1);
        addBranch(x1, y1, finalAngle + (0.24 + rnd()*0.20), length*(0.59+rnd()*0.09), width*0.65, depth-1);
        if (depth >= 3 && rnd() < 0.55)
          addBranch(x1, y1, finalAngle - 0.05+rnd()*0.10, length*0.48, width*0.46, depth-2);
      }
    }

    function addRoot(x0, y0, angle, length, width, depth) {
      if (depth <= 0 || length < 5) return;
      const curl = (rnd()-0.5)*0.35;
      const x1   = x0 + Math.cos(angle+curl)*length;
      const y1   = y0 + Math.sin(angle+curl)*length;
      const cpX  = x0 + Math.cos(angle)*length*0.5 + (rnd()-0.5)*length*0.4;
      const cpY  = y0 + Math.sin(angle)*length*0.5 + rnd()*length*0.25;
      roots.push({ x0,y0,x1,y1,cpX,cpY,width,depth, phase:rnd()*Math.PI*2 });
      if (depth > 1) {
        addRoot(x1,y1,angle-0.38-rnd()*0.25,length*0.65,width*0.70,depth-1);
        addRoot(x1,y1,angle+0.30+rnd()*0.22,length*0.60,width*0.65,depth-1);
      }
    }

    addBranch(rootX, rootY, -Math.PI*0.52, H*0.30, 17, 6);
    addRoot(rootX,          rootY, Math.PI*0.62, H*0.11, 6, 3);
    addRoot(rootX,          rootY, Math.PI*0.80, H*0.09, 5, 3);
    addRoot(rootX,          rootY, Math.PI*0.96, H*0.08, 4, 2);
    addRoot(rootX + W*0.06, rootY, Math.PI*0.55, H*0.10, 5, 3);

    // Orbe del alma: 62% a lo largo del tronco
    soulX = rootX + Math.cos(-Math.PI*0.52) * H * 0.30 * 0.62;
    soulY = rootY + Math.sin(-Math.PI*0.52) * H * 0.30 * 0.62;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Cielo cósmico: índigo arriba → bosque oscuro abajo
  // ════════════════════════════════════════════════════════════════════════
  function drawBackground(W, H) {
    const sky = bgCtx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0.00, 'rgba(2,  3, 14, 1)');   // espacio índigo
    sky.addColorStop(0.18, 'rgba(4,  5, 20, 1)');   // noche cósmica
    sky.addColorStop(0.38, 'rgba(3,  9,  8, 1)');   // transición
    sky.addColorStop(0.62, 'rgba(4, 15,  7, 1)');   // bosque noche
    sky.addColorStop(0.82, 'rgba(7, 22, 10, 1)');   // copa
    sky.addColorStop(1.00, 'rgba(2, 10,  4, 1)');   // suelo
    bgCtx.fillStyle = sky;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Ambiente: niebla violeta cósmica + halos jade + vigneta
  // ════════════════════════════════════════════════════════════════════════
  function drawAmbient(W, H) {
    const pulse = 0.80 + 0.20 * Math.sin(t * 0.00030);
    const drift = Math.sin(t * 0.00018) * 0.04;

    // Halos violeta/índigo en zona estelar (parte alta)
    [
      [W * 0.38,             H * 0.08, W * 0.52, 0.038],
      [W * (0.72 + drift),   H * 0.14, W * 0.36, 0.028],
      [W * (0.18 - drift),   H * 0.05, W * 0.28, 0.022],
    ].forEach(([cx, cy, r, str]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(90, 55, 185, ${str * pulse})`);
      g.addColorStop(0.5, `rgba(55, 30, 120, ${str * 0.38 * pulse})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = g; bgCtx.fillRect(0, 0, W, H);
    });

    // Halo principal del Árbol (jade profundo)
    const tg = bgCtx.createRadialGradient(W*0.18, H*0.66, 0, W*0.18, H*0.66, W*0.55);
    tg.addColorStop(0, `rgba(28, 125, 58, ${0.055 * pulse})`);
    tg.addColorStop(0.4, `rgba(14, 80, 36, ${0.022 * pulse})`);
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    bgCtx.fillStyle = tg; bgCtx.fillRect(0, 0, W, H);

    // Luces secundarias de bosque (dorado cálido + jade)
    [
      [W*(0.74+drift),       H*0.52, W*0.38, 0.030, 38, 140, 68],
      [W*(0.46-drift*0.6),   H*0.80, W*0.45, 0.026, 38, 140, 68],
      [W*0.88,               H*0.32, W*0.28, 0.020, 38, 140, 68],
      [W*0.58,               H*0.22, W*0.22, 0.018, 80, 100, 42],  // dorado verde
    ].forEach(([cx, cy, r, str, cr, cg, cb]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${str*pulse})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = g; bgCtx.fillRect(0, 0, W, H);
    });

    // Niebla rasa (suelo del bosque)
    const mist = Math.sin(t * 0.00014) * 0.05;
    [
      [W*(0.50+mist),      H*0.80, W*0.60, 0.052],
      [W*(0.76-mist*0.7),  H*0.88, W*0.45, 0.040],
      [W*(0.22+mist*0.4),  H*0.93, W*0.38, 0.034],
    ].forEach(([cx, cy, r, str]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(45,140,75,${str*pulse})`);
      g.addColorStop(0.6, `rgba(22,85,44,${str*0.38*pulse})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = g; bgCtx.fillRect(0, 0, W, H);
    });

    // Viñeta
    const vig = bgCtx.createRadialGradient(W/2, H/2, H*0.22, W/2, H/2, W*0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(1,3,8,${0.42*pulse})`);
    bgCtx.fillStyle = vig; bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Rayos de luz filtrada entre las copas
  // ════════════════════════════════════════════════════════════════════════
  function drawLightRays(W, H) {
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    const drift = Math.sin(t * 0.00012) * W * 0.022;
    [
      [W*0.30, W*0.36, 0.016],
      [W*0.48, W*0.55, 0.012],
      [W*0.65, W*0.72, 0.010],
      [W*0.80, W*0.86, 0.009],
    ].forEach(([tx, bx, al]) => {
      const grad = bgCtx.createLinearGradient(tx+drift, 0, bx+drift, H*0.70);
      grad.addColorStop(0,   `rgba(75, 200, 105, ${al})`);
      grad.addColorStop(0.6, `rgba(40, 140,  70, ${al*0.38})`);
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.beginPath();
      bgCtx.moveTo(tx+drift - 2,          0);
      bgCtx.lineTo(tx+drift + 2,          0);
      bgCtx.lineTo(bx+drift + (bx-tx)*0.40, H*0.70);
      bgCtx.lineTo(bx+drift - (bx-tx)*0.40, H*0.70);
      bgCtx.closePath();
      bgCtx.fillStyle = grad;
      bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Estrellas (jade + dorado + violeta + blanco frío)
  // ════════════════════════════════════════════════════════════════════════
  function drawStars(W, H) {
    bgCtx.save();
    STARS.forEach(s => {
      const sx = s.x/100*W, sy = s.y/100*H;
      const tw = 0.28 + 0.72 * (0.5 + 0.5*Math.sin(t*s.spd+s.phase));
      const al = tw * (0.18 + s.r*0.16);
      bgCtx.fillStyle = s.jade   ? `rgba(100,240,155,${al})`
                      : s.gold   ? `rgba(220,210,140,${al})`
                      : s.violet ? `rgba(170,130,255,${al})`
                      :             `rgba(185,235,205,${al})`;
      bgCtx.beginPath();
      bgCtx.arc(sx, sy, s.r, 0, Math.PI*2);
      bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Orbe del Alma (corazón del Árbol)
  // ════════════════════════════════════════════════════════════════════════
  function drawSoulOrb() {
    const pulse = 0.78 + 0.22 * Math.sin(t * 0.00115);
    const sx = soulX, sy = soulY, R = 11;

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';

    // Halo lejano
    const far = bgCtx.createRadialGradient(sx, sy, R*0.8, sx, sy, R*6.5);
    far.addColorStop(0,   `rgba(58, 210, 98,  ${0.056*pulse})`);
    far.addColorStop(0.5, `rgba(28, 148, 62,  ${0.020*pulse})`);
    far.addColorStop(1,    'rgba(0,0,0,0)');
    bgCtx.beginPath(); bgCtx.arc(sx, sy, R*6.5, 0, Math.PI*2);
    bgCtx.fillStyle = far; bgCtx.fill();

    // Corona cercana
    const near = bgCtx.createRadialGradient(sx, sy, 0, sx, sy, R*2.3);
    near.addColorStop(0,    `rgba(210,255,225,${0.92*pulse})`);
    near.addColorStop(0.35, `rgba(85, 232,125,${0.58*pulse})`);
    near.addColorStop(0.75, `rgba(38, 168, 78,${0.22*pulse})`);
    near.addColorStop(1,     'rgba(0,0,0,0)');
    bgCtx.beginPath(); bgCtx.arc(sx, sy, R*2.3, 0, Math.PI*2);
    bgCtx.fillStyle = near; bgCtx.fill();

    // Núcleo sólido
    bgCtx.beginPath(); bgCtx.arc(sx, sy, R, 0, Math.PI*2);
    bgCtx.fillStyle = `rgba(218,255,232,${0.90*pulse})`; bgCtx.fill();

    // 6 rayos de energía con curva cuadrática
    for (let i = 0; i < 6; i++) {
      const ra  = t*0.00038 + (i/6)*Math.PI*2;
      const ra2 = ra + 0.40 + 0.12*Math.sin(t*0.00078+i);
      const rL  = R*(1.8 + 0.65*Math.sin(t*0.00098+i*1.4));
      const rx0 = sx + Math.cos(ra)*R*1.1,  ry0 = sy + Math.sin(ra)*R*1.1;
      const rx1 = sx + Math.cos(ra2)*R*rL,  ry1 = sy + Math.sin(ra2)*R*rL;
      const cpx = sx + Math.cos((ra+ra2)*0.5)*R*rL*0.44;
      const cpy = sy + Math.sin((ra+ra2)*0.5)*R*rL*0.44;
      bgCtx.beginPath();
      bgCtx.moveTo(rx0, ry0);
      bgCtx.quadraticCurveTo(cpx, cpy, rx1, ry1);
      bgCtx.strokeStyle = `rgba(85,228,128,${(0.12+0.07*Math.sin(t*0.00128+i))*pulse})`;
      bgCtx.lineWidth = 0.8; bgCtx.lineCap = 'round'; bgCtx.stroke();
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Árbol de Cristal Esmeralda
  //  Corteza + vena jade + cristal shimmer + racimos de hojas + puntas
  // ════════════════════════════════════════════════════════════════════════
  function drawLeafCluster(x, y, branchAngle, size, pulse) {
    for (let li = 0; li < 7; li++) {
      const sway = Math.sin(t*0.00055 + li*0.9 + x*0.001) * 0.08;
      const la   = branchAngle + (li - 3)*0.34 + sway;
      const lx   = x + Math.cos(la)*size*0.90;
      const ly   = y + Math.sin(la)*size*0.90;
      bgCtx.save();
      bgCtx.translate(lx, ly);
      bgCtx.rotate(la + Math.PI/2);
      bgCtx.beginPath();
      bgCtx.moveTo(0, -size);
      bgCtx.bezierCurveTo( size*0.88, -size*0.30,  size*0.88, size*0.52, 0, size*0.92);
      bgCtx.bezierCurveTo(-size*0.88,  size*0.52, -size*0.88, -size*0.30, 0, -size);
      bgCtx.closePath();
      bgCtx.fillStyle = `rgba(40, 175, 80, ${0.32 * pulse})`;
      bgCtx.fill();
      bgCtx.beginPath();
      bgCtx.moveTo(0, -size*0.72); bgCtx.lineTo(0, size*0.72);
      bgCtx.strokeStyle = `rgba(90, 230, 120, ${0.18*pulse})`; bgCtx.lineWidth = 0.3; bgCtx.stroke();
      bgCtx.restore();
    }
  }

  function drawTree(W, H) {
    if (!branches.length) return;
    const MAX_D = 6;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    bgCtx.lineCap = 'round';

    // — Raíces —
    roots.forEach(r => {
      const df = r.depth/3, pulse = 0.60+0.40*Math.sin(t*0.00112+r.phase);
      bgCtx.beginPath(); bgCtx.moveTo(r.x0,r.y0); bgCtx.quadraticCurveTo(r.cpX,r.cpY,r.x1,r.y1);
      bgCtx.strokeStyle = `rgba(20,90,45,${0.22*df*pulse})`; bgCtx.lineWidth = r.width*2.5; bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.moveTo(r.x0,r.y0); bgCtx.quadraticCurveTo(r.cpX,r.cpY,r.x1,r.y1);
      bgCtx.strokeStyle = `rgba(35,148,68,${0.30*df*pulse})`; bgCtx.lineWidth = r.width; bgCtx.stroke();
    });

    // — Ramas de gruesas a finas —
    const sorted = [...branches].sort((a,b) => b.width-a.width);
    sorted.forEach(b => {
      const df    = (MAX_D+1-b.depth)/MAX_D;
      const pulse = 0.65+0.35*Math.sin(t*0.00098+b.phase);

      // Corteza oscura
      bgCtx.beginPath(); bgCtx.moveTo(b.x0,b.y0); bgCtx.quadraticCurveTo(b.cpX,b.cpY,b.x1,b.y1);
      bgCtx.strokeStyle = `rgba(10,50,22,${0.68*pulse})`; bgCtx.lineWidth = b.width*2.8; bgCtx.stroke();

      // Vena de energía jade
      bgCtx.beginPath(); bgCtx.moveTo(b.x0,b.y0); bgCtx.quadraticCurveTo(b.cpX,b.cpY,b.x1,b.y1);
      bgCtx.strokeStyle = `rgba(42,178,85,${(0.38+0.40*df)*pulse})`; bgCtx.lineWidth = b.width*1.1; bgCtx.stroke();

      // Núcleo brillante (puntas)
      if (b.depth <= 2) {
        bgCtx.beginPath(); bgCtx.moveTo(b.x0,b.y0); bgCtx.quadraticCurveTo(b.cpX,b.cpY,b.x1,b.y1);
        bgCtx.strokeStyle = `rgba(88,230,128,${0.48*df*pulse})`; bgCtx.lineWidth = b.width*0.38; bgCtx.stroke();
      }

      // Shimmer de cristal (planos de refracción en ramas gruesas)
      if (b.width > 5) {
        const brA  = Math.atan2(b.y1-b.y0, b.x1-b.x0);
        const perp = brA + Math.PI/2;
        const midX = (b.x0+b.cpX+b.x1)/3;
        const midY = (b.y0+b.cpY+b.y1)/3;
        const sLen = b.width*1.6;
        const sp   = 0.5+0.5*Math.sin(t*0.00240+b.phase*2.1);
        bgCtx.beginPath();
        bgCtx.moveTo(midX-Math.cos(perp)*sLen, midY-Math.sin(perp)*sLen);
        bgCtx.lineTo(midX+Math.cos(perp)*sLen, midY+Math.sin(perp)*sLen);
        bgCtx.strokeStyle = `rgba(175,255,208,${0.18*sp*Math.min(1,b.width/14)})`;
        bgCtx.lineWidth = 0.5; bgCtx.stroke();
      }
    });

    // — Racimos de hojas en las puntas (frondoso) —
    branches.filter(b => b.depth === 1).forEach(b => {
      const pulse = 0.58+0.42*Math.sin(t*0.00095+b.phase);
      drawLeafCluster(b.x1, b.y1, b.angle, b.width*4.2, pulse);

      // Nodo luminoso en la punta
      const gR = b.width*5.0;
      const g  = bgCtx.createRadialGradient(b.x1,b.y1,0,b.x1,b.y1,gR);
      g.addColorStop(0, `rgba(155,255,190,${0.70*pulse})`);
      g.addColorStop(0.4,`rgba(72,212,115,${0.36*pulse})`);
      g.addColorStop(1,  'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(b.x1,b.y1,gR,0,Math.PI*2);
      bgCtx.fillStyle = g; bgCtx.fill();
      bgCtx.beginPath(); bgCtx.arc(b.x1,b.y1,b.width*0.62,0,Math.PI*2);
      bgCtx.fillStyle = `rgba(200,255,220,${0.88*pulse})`; bgCtx.fill();
    });

    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Luciérnagas con silueta de insecto
  //  Cuerpo + alas translúcidas + abdomen bioluminiscente + antenas
  // ════════════════════════════════════════════════════════════════════════
  function drawFireflyShape(ctx, x, y, angle, bodyH, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const bW = bodyH * 0.30;

    // Alas (dos curvas bezier translúcidas)
    ctx.beginPath();
    ctx.moveTo(0, -bodyH*0.10);
    ctx.bezierCurveTo(-bW*5.5, -bodyH*1.45, -bW*6.5, bodyH*0.30, -bW*0.75, bodyH*0.15);
    ctx.closePath();
    ctx.fillStyle = `rgba(100,232,145,${alpha*0.20})`;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -bodyH*0.10);
    ctx.bezierCurveTo(bW*5.5, -bodyH*1.45, bW*6.5, bodyH*0.30, bW*0.75, bodyH*0.15);
    ctx.closePath();
    ctx.fillStyle = `rgba(100,232,145,${alpha*0.20})`;
    ctx.fill();

    // Cuerpo (elipse oscura)
    ctx.beginPath();
    ctx.ellipse(0, 0, bW, bodyH, 0, 0, Math.PI*2);
    ctx.fillStyle = `rgba(18,62,28,${alpha*0.92})`;
    ctx.fill();

    // Cabeza
    ctx.beginPath();
    ctx.ellipse(0, -bodyH*0.70, bW*0.88, bW*0.88, 0, 0, Math.PI*2);
    ctx.fillStyle = `rgba(12,42,18,${alpha*0.88})`;
    ctx.fill();

    // Abdomen bioluminiscente (la parte que brilla)
    const abdG = ctx.createRadialGradient(0,bodyH*0.55,0, 0,bodyH*0.55,bodyH*1.6);
    abdG.addColorStop(0,   `rgba(138,255,168,${alpha*0.92})`);
    abdG.addColorStop(0.35,`rgba(68,212,108, ${alpha*0.44})`);
    abdG.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(0, bodyH*0.55, bodyH*1.6, 0, Math.PI*2);
    ctx.fillStyle = abdG; ctx.fill();

    // Antenas
    ctx.beginPath();
    ctx.moveTo(-bW*0.38, -bodyH*0.88); ctx.lineTo(-bW*1.6, -bodyH*1.90);
    ctx.moveTo( bW*0.38, -bodyH*0.88); ctx.lineTo( bW*1.6, -bodyH*1.90);
    ctx.strokeStyle = `rgba(78,158,95,${alpha*0.48})`; ctx.lineWidth = 0.40; ctx.stroke();

    ctx.restore();
  }

  function drawFireflies(W, H) {
    if (!fireflies) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    fireflies.forEach(f => {
      f.wander += 0.008;
      f.vx += Math.cos(f.wander*0.65)*0.015;
      f.vy += Math.sin(f.wander*0.52)*0.012;
      const spd = Math.sqrt(f.vx*f.vx+f.vy*f.vy);
      if (spd > 0.05) f.angle = Math.atan2(f.vy, f.vx) + Math.PI/2;
      if (spd > 0.60) { f.vx *= 0.60/spd; f.vy *= 0.60/spd; }
      f.x += f.vx; f.y += f.vy;
      if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
      if (f.y < 0) f.y = H*0.82; if (f.y > H*0.94) f.y = H*0.05;

      const tw    = 0.35+0.65*(0.5+0.5*Math.sin(t*(0.00092+f.phase*0.00030)+f.phase));
      const alpha = (f.deep?0.44:0.72)*tw;
      const bodyH = f.size*2.2;

      // Halo exterior atmosférico
      const g = bgCtx.createRadialGradient(f.x,f.y+bodyH*0.55,0, f.x,f.y,f.size*15);
      g.addColorStop(0,  `rgba(85,235,125,${alpha*0.50})`);
      g.addColorStop(0.3,`rgba(48,188, 88,${alpha*0.18})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(f.x,f.y,f.size*15,0,Math.PI*2);
      bgCtx.fillStyle = g; bgCtx.fill();

      drawFireflyShape(bgCtx, f.x, f.y, f.angle, bodyH, alpha);
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Esporas y semillas
  // ════════════════════════════════════════════════════════════════════════
  function drawSpores(W, H) {
    if (!spores) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    spores.forEach(p => {
      const tw = 0.50+0.50*Math.sin(t*0.00135+p.phase);
      if (p.glow) {
        const g = bgCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*5);
        g.addColorStop(0,`rgba(70,210,108,${p.alpha*tw*1.3})`); g.addColorStop(1,'rgba(0,0,0,0)');
        bgCtx.beginPath(); bgCtx.arc(p.x,p.y,p.size*5,0,Math.PI*2); bgCtx.fillStyle=g; bgCtx.fill();
      }
      bgCtx.beginPath(); bgCtx.arc(p.x,p.y,p.size,0,Math.PI*2);
      bgCtx.fillStyle=`rgba(66,208,106,${p.alpha*tw})`; bgCtx.fill();
      p.x+=p.vx+Math.sin(t*0.0018+p.phase)*0.07; p.y+=p.vy;
      if(p.y<-6){p.y=H+6;p.x=Math.random()*W;} if(p.x<-6)p.x=W+6; if(p.x>W+6)p.x=-6;
    });
    bgCtx.restore();
  }

  function drawOneSeed(x, y, angle, size, alpha) {
    bgCtx.save(); bgCtx.translate(x,y); bgCtx.rotate(angle); bgCtx.globalAlpha=alpha;
    bgCtx.beginPath(); bgCtx.ellipse(0,0,size*0.35,size*0.75,0,0,Math.PI*2);
    bgCtx.fillStyle='rgba(152,248,178,0.90)'; bgCtx.fill();
    bgCtx.beginPath(); bgCtx.moveTo(0,size*0.75);
    bgCtx.bezierCurveTo(size*0.28,size*1.5,size*0.45,size*2.1,size*0.08,size*2.8);
    bgCtx.strokeStyle='rgba(88,210,128,0.48)'; bgCtx.lineWidth=0.55; bgCtx.lineCap='round'; bgCtx.stroke();
    bgCtx.restore();
  }

  function drawSeeds(W, H) {
    if (!seeds) return;
    seeds.forEach(s => {
      s.wobble+=0.016; s.x+=s.vx+Math.sin(s.wobble)*0.13; s.y+=s.vy; s.angle+=s.spin;
      if(s.y<-22){s.y=H+22;s.x=Math.random()*W;} if(s.x<-12)s.x=W+12; if(s.x>W+12)s.x=-12;
      drawOneSeed(s.x,s.y,s.angle,s.size,(0.6+0.4*Math.sin(t*0.00076+s.wobble))*s.alpha);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Bloom de clic: explosión orgánica de esporas + anillos
  // ════════════════════════════════════════════════════════════════════════
  function spawnBloom(x, y) {
    blooms.push({
      x, y, life: 1.0,
      particles: Array.from({ length: 22 }, () => {
        const a = Math.random()*Math.PI*2, spd = 1.8+Math.random()*3.2;
        return { x, y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, size:0.5+Math.random()*1.5 };
      }),
    });
  }

  function drawBlooms() {
    if (!blooms.length) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = blooms.length-1; i >= 0; i--) {
      const b = blooms[i], prog = 1-b.life;

      // Tres anillos expansivos desfasados
      for (let ri = 0; ri < 3; ri++) {
        const rp = Math.max(0, prog - ri*0.12);
        if (rp <= 0) continue;
        const rR = rp*68 + ri*10;
        const rA = Math.max(0,(b.life-ri*0.12)*0.52);
        bgCtx.beginPath(); bgCtx.arc(b.x,b.y,rR,0,Math.PI*2);
        bgCtx.strokeStyle=`rgba(48,200,90,${rA})`; bgCtx.lineWidth=1.2; bgCtx.stroke();
      }

      // Flash central
      const fR = 5+prog*28;
      const flash = bgCtx.createRadialGradient(b.x,b.y,0,b.x,b.y,fR);
      flash.addColorStop(0,  `rgba(200,255,220,${b.life*0.72})`);
      flash.addColorStop(0.5,`rgba(58,200, 98, ${b.life*0.52})`);
      flash.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(b.x,b.y,fR,0,Math.PI*2);
      bgCtx.fillStyle=flash; bgCtx.fill();

      // Esporas volando
      b.particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.vx*=0.92; p.vy*=0.92;
        bgCtx.beginPath(); bgCtx.arc(p.x,p.y,p.size,0,Math.PI*2);
        bgCtx.fillStyle=`rgba(70,215,108,${b.life*0.82})`; bgCtx.fill();
      });

      b.life -= 0.025;
      if (b.life <= 0) blooms.splice(i,1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor: anillo respirante + rastro + hojas
  // ════════════════════════════════════════════════════════════════════════
  function drawLeafOverlay(ctx, x, y, angle, size, alpha) {
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.globalAlpha=alpha;
    ctx.beginPath();
    ctx.moveTo(0,-size);
    ctx.bezierCurveTo( size*0.90,-size*0.30, size*0.90,size*0.50, 0,size*0.95);
    ctx.bezierCurveTo(-size*0.90, size*0.50,-size*0.90,-size*0.30, 0,-size);
    ctx.closePath();
    ctx.fillStyle=`rgba(50,195,95,${alpha*0.85})`; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-size*0.78); ctx.lineTo(0,size*0.78);
    ctx.strokeStyle=`rgba(128,255,160,${alpha*0.35})`; ctx.lineWidth=0.38; ctx.stroke();
    ctx.restore();
  }

  function drawCursor(W, H) {
    overCtx.clearRect(0,0,W,H);
    if (mouseX < 0) return;

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    // Anillo respirante orgánico
    const breathe = 0.5+0.5*Math.sin(t*0.038);
    const ringR   = 18+breathe*8;
    overCtx.beginPath(); overCtx.arc(mouseX,mouseY,ringR,0,Math.PI*2);
    overCtx.strokeStyle=`rgba(55,200,95,${0.14*breathe})`; overCtx.lineWidth=1.0; overCtx.stroke();

    // Halo exterior
    const og = overCtx.createRadialGradient(mouseX,mouseY,0,mouseX,mouseY,48);
    og.addColorStop(0,  'rgba(55,200,100,0.08)'); og.addColorStop(0.45,'rgba(35,155,70,0.03)'); og.addColorStop(1,'rgba(0,0,0,0)');
    overCtx.beginPath(); overCtx.arc(mouseX,mouseY,48,0,Math.PI*2); overCtx.fillStyle=og; overCtx.fill();

    // Halo interior
    const ig = overCtx.createRadialGradient(mouseX,mouseY,0,mouseX,mouseY,14);
    ig.addColorStop(0,  'rgba(120,255,160,0.18)'); ig.addColorStop(0.40,'rgba(55,200,100,0.08)'); ig.addColorStop(1,'rgba(0,0,0,0)');
    overCtx.beginPath(); overCtx.arc(mouseX,mouseY,14,0,Math.PI*2); overCtx.fillStyle=ig; overCtx.fill();

    // Punto central
    overCtx.beginPath(); overCtx.arc(mouseX,mouseY,1.8,0,Math.PI*2);
    overCtx.fillStyle='rgba(165,255,192,0.55)'; overCtx.fill();

    // Rastro bioluminiscente
    for (let i = trailDots.length-1; i >= 0; i--) {
      const d = trailDots[i];
      overCtx.beginPath(); overCtx.arc(d.x,d.y,d.size,0,Math.PI*2);
      overCtx.fillStyle=`rgba(72,218,108,${d.alpha})`; overCtx.fill();
      d.alpha -= 0.024;
      if (d.alpha <= 0) trailDots.splice(i,1);
    }

    // Hojas flotantes
    for (let i = cursorLeaves.length-1; i >= 0; i--) {
      const l = cursorLeaves[i];
      drawLeafOverlay(overCtx,l.x,l.y,l.angle,l.size,l.alpha);
      l.x+=l.vx; l.y+=l.vy; l.vy+=0.008; l.angle+=l.spin; l.alpha-=0.011;
      if (l.alpha <= 0) cursorLeaves.splice(i,1);
    }

    overCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Interacción de clic
  // ════════════════════════════════════════════════════════════════════════
  function handleClick(cx, cy) {
    // Siempre crea bloom orgánico
    spawnBloom(cx, cy);

    // Si hay luciérnagas cerca, huyen asustadas
    if (fireflies) {
      fireflies.forEach(f => {
        const dx=cx-f.x, dy=cy-f.y;
        if (dx*dx+dy*dy < 1600) { // radio 40px
          const escA = Math.atan2(f.y-cy, f.x-cx);
          f.vx = Math.cos(escA)*3.8; f.vy = Math.sin(escA)*3.8;
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LOOP
  // ════════════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W = bgCanvas.width, H = bgCanvas.height;

    bgCtx.clearRect(0,0,W,H);
    drawBackground(W,H);
    drawAmbient(W,H);
    drawLightRays(W,H);
    drawStars(W,H);
    drawTree(W,H);
    drawSoulOrb();
    drawFireflies(W,H);
    drawSpores(W,H);
    drawSeeds(W,H);
    drawBlooms();

    drawCursor(W,H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width=W; bgCanvas.height=H;
    overCanvas.width=W; overCanvas.height=H;
    initFireflies(W,H); initSpores(W,H); initSeeds(W,H);
    buildTree(W,H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-esm-bg';
      Object.assign(bgCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'-1' });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-esm-over';
      Object.assign(overCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'9998' });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      _onMove = (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        const now = performance.now();
        // Rastro
        if (t - lastTrailT > 2) {
          lastTrailT = t;
          trailDots.push({ x:mouseX, y:mouseY, size:1.4+Math.random()*0.8, alpha:0.38 });
          if (trailDots.length > 28) trailDots.shift();
        }
        // Hojas
        if (now - lastLeaf > 230 && cursorLeaves.length < 7) {
          lastLeaf = now;
          const a = Math.random()*Math.PI*2, spd = 0.8+Math.random()*1.2;
          cursorLeaves.push({
            x:mouseX, y:mouseY, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-0.8,
            angle:Math.random()*Math.PI*2, spin:(Math.random()-0.5)*0.06,
            size:3+Math.random()*3.5, alpha:0.24+Math.random()*0.14,
          });
        }
      };
      _onClick = (e) => handleClick(e.clientX, e.clientY);

      document.addEventListener('mousemove',  _onMove,  { passive:true });
      document.addEventListener('click',      _onClick);
      document.addEventListener('mouseleave', () => { mouseX=-999; mouseY=-999; });
      window.addEventListener('resize', resize);
      t = 0; frame();
    },

    stop() {
      if (!bgCanvas) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (_onMove)  { document.removeEventListener('mousemove', _onMove);  _onMove  = null; }
      if (_onClick) { document.removeEventListener('click',     _onClick); _onClick = null; }
      bgCanvas.remove();   bgCanvas   = bgCtx   = null;
      overCanvas.remove(); overCanvas = overCtx = null;
      fireflies = spores = seeds = null;
      branches=[]; roots=[];
      cursorLeaves.length = trailDots.length = blooms.length = 0;
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };
})();

export { EsmeraldaRenderer };
