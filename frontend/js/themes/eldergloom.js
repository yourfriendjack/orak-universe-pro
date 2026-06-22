// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/eldergloom.js
//  Eldergloom Valley — Valle Olvidado entre Montañas Ancestrales
//
//  bgCanvas  (z:-1)   → cielo crepuscular, siluetas de montañas
//                        multicapa, niebla volumétrica de valle,
//                        luz de linterna parpadeante, brasas flotantes,
//                        polvo ambiental, wisps arcanos púrpura,
//                        rayos de luz volumétrica tras las cimas
//  overCanvas (z:9998) → cursor: anillo ámbar respirante + rastro
//                        de polvo dorado + chispas mágicas
//
//  Interactividad:
//   · Clic → explosión de brasas doradas + anillos arcanos + chispas
// ════════════════════════════════════════════════════════════════

const EldergloomRenderer = (() => {

  let bgCanvas = null,   bgCtx   = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;
  let dust = null, embers = null, wisps = null;

  // ── Cursor ──────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastTrailT = 0, _onMove = null, _onClick = null;
  const trailDots = [], cursorSparks = [];

  // ── Click blooms ────────────────────────────────────────────────────────
  const blooms = [];

  // ════════════════════════════════════════════════════════════════════════
  //  Estrellas — 80 puntos deterministas, solo en el cielo (y < 45%)
  // ════════════════════════════════════════════════════════════════════════
  const STARS = Array.from({ length: 80 }, (_, i) => ({
    x:      (i * 183.71 +  7.30) % 100,
    y:      (i * 113.37 +  3.10) % 44,
    r:       i % 11 === 0 ? 1.20 : i % 5 === 0 ? 0.78 : 0.44,
    phase:   i * 0.6231,
    spd:     0.000280 + (i % 9) * 0.000095,
    warm:    i % 8  === 0,
    mystic:  i % 13 === 0,
  }));

  // ════════════════════════════════════════════════════════════════════════
  //  Niebla volumétrica del valle — 12 nubes deterministas
  // ════════════════════════════════════════════════════════════════════════
  const MIST_PUFFS = Array.from({ length: 12 }, (_, i) => ({
    xBase: (i * 0.112 + 0.04) % 1.0,
    y:      0.56 + (i % 6) * 0.058,
    r:      0.26 + (i % 4) * 0.090,
    alpha:  0.028 + (i % 5) * 0.007,
    speed:  (i % 2 === 0 ? 1 : -1) * (0.000040 + i * 0.000008),
    phase:  i * 1.12,
    warm:   i % 3 === 0,
  }));

  // ════════════════════════════════════════════════════════════════════════
  //  Faroles de la aldea — 20 posiciones fijas en % de pantalla
  // ════════════════════════════════════════════════════════════════════════
  const LANTERNS = Array.from({ length: 20 }, (_, i) => ({
    x:      (i * 0.0618 + 0.06) % 0.97,
    y:      0.64 + (i % 7) * 0.038,
    phase:  i * 0.8472,
    size:   1.2 + (i % 4) * 0.65,
    warm:   i % 5 !== 3,
    deep:   i % 4 === 0,
  }));

  // ════════════════════════════════════════════════════════════════════════
  //  Perfiles de montaña — puntos en % {x, y} del canvas
  //  Función de dibujo usa bezier suavizado entre puntos intermedios
  // ════════════════════════════════════════════════════════════════════════

  // Montañas lejanas — silueta majestuosa, cimas a y=0.22
  const FAR_RIDGE = [
    { x:0.00, y:0.66 }, { x:0.06, y:0.50 }, { x:0.13, y:0.60 },
    { x:0.22, y:0.27 }, { x:0.30, y:0.53 }, { x:0.40, y:0.22 },
    { x:0.50, y:0.46 }, { x:0.60, y:0.32 }, { x:0.70, y:0.54 },
    { x:0.80, y:0.36 }, { x:0.90, y:0.56 }, { x:1.00, y:0.62 },
  ];

  // Montañas medias — más oscuras, cimas a y=0.38
  const MID_RIDGE = [
    { x:0.00, y:0.74 }, { x:0.07, y:0.60 }, { x:0.16, y:0.70 },
    { x:0.26, y:0.44 }, { x:0.36, y:0.64 }, { x:0.46, y:0.38 },
    { x:0.56, y:0.60 }, { x:0.66, y:0.48 }, { x:0.76, y:0.65 },
    { x:0.88, y:0.52 }, { x:1.00, y:0.70 },
  ];

  // Línea de bosque — silueta irregular de copas (straight lines = más jagged)
  const FOREST_RIDGE = [
    { x:0.000, y:0.76 }, { x:0.018, y:0.68 }, { x:0.038, y:0.75 },
    { x:0.056, y:0.66 }, { x:0.076, y:0.73 }, { x:0.095, y:0.64 },
    { x:0.115, y:0.72 }, { x:0.133, y:0.63 }, { x:0.152, y:0.71 },
    { x:0.170, y:0.65 }, { x:0.190, y:0.73 }, { x:0.210, y:0.61 },
    { x:0.228, y:0.69 }, { x:0.248, y:0.63 }, { x:0.268, y:0.71 },
    { x:0.286, y:0.60 }, { x:0.306, y:0.68 }, { x:0.325, y:0.64 },
    { x:0.344, y:0.72 }, { x:0.363, y:0.61 }, { x:0.382, y:0.69 },
    { x:0.400, y:0.65 }, { x:0.420, y:0.73 }, { x:0.440, y:0.62 },
    { x:0.458, y:0.70 }, { x:0.477, y:0.63 }, { x:0.496, y:0.71 },
    { x:0.515, y:0.64 }, { x:0.535, y:0.72 }, { x:0.554, y:0.61 },
    { x:0.572, y:0.69 }, { x:0.592, y:0.65 }, { x:0.611, y:0.73 },
    { x:0.630, y:0.62 }, { x:0.648, y:0.70 }, { x:0.667, y:0.63 },
    { x:0.686, y:0.71 }, { x:0.706, y:0.65 }, { x:0.725, y:0.74 },
    { x:0.745, y:0.62 }, { x:0.763, y:0.70 }, { x:0.782, y:0.64 },
    { x:0.800, y:0.72 }, { x:0.820, y:0.63 }, { x:0.838, y:0.71 },
    { x:0.858, y:0.66 }, { x:0.878, y:0.74 }, { x:0.897, y:0.63 },
    { x:0.916, y:0.71 }, { x:0.936, y:0.67 }, { x:0.955, y:0.75 },
    { x:0.975, y:0.69 }, { x:1.000, y:0.76 },
  ];

  // ════════════════════════════════════════════════════════════════════════
  //  Init — sistemas de partículas
  // ════════════════════════════════════════════════════════════════════════
  function initDust(W, H) {
    dust = Array.from({ length: 110 }, (_, i) => ({
      x:     (i * 217.31 + 30) % W,
      y:     (i * 163.47 + 20) % H,
      size:   0.30 + (i * 7.31 % 1.0) * 0.75,
      vx:     Math.sin(i * 1.31) * 0.042,
      vy:   -(0.038 + (i * 3.71 % 1.0) * 0.110),
      alpha:  0.040 + (i * 5.23 % 1.0) * 0.130,
      phase:  i * 0.6231,
      warm:   i % 3 === 0,
    }));
  }

  function initEmbers(W, H) {
    embers = Array.from({ length: 30 }, (_, i) => ({
      x:      (i * 271.83 + 55) % W,
      y:      H * 0.42 + (i * 193.17 % 1.0) * H * 0.50,
      vx:     Math.sin(i * 2.13) * 0.11,
      vy:   -(0.14 + (i * 4.17 % 1.0) * 0.32),
      size:   0.55 + (i * 6.11 % 1.0) * 0.95,
      alpha:  0.18 + (i * 3.83 % 1.0) * 0.26,
      phase:  i * 0.9231,
      wobble: i * 0.8473,
    }));
  }

  function initWisps(W, H) {
    wisps = Array.from({ length: 12 }, (_, i) => ({
      x:      (i * 183.41 + 80) % W,
      y:      (i * 147.23 + 40) % (H * 0.82),
      vx:     Math.sin(i * 1.72) * 0.075,
      vy:     Math.cos(i * 2.34) * 0.058,
      size:   2.0 + (i * 8.33 % 1.0) * 2.80,
      alpha:  0.20 + (i * 4.71 % 1.0) * 0.28,   // mucho más visibles
      phase:  i * 1.2341,
      wander: i * 0.9123,
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Cielo: noche crepuscular con tinte místico visible
  // ════════════════════════════════════════════════════════════════════════
  function drawBackground(W, H) {
    const sky = bgCtx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0.00, 'rgba(12, 10, 28, 1)');  // violeta-índigo profundo
    sky.addColorStop(0.22, 'rgba(16, 12, 36, 1)');  // noche mística
    sky.addColorStop(0.42, 'rgba(18, 14, 32, 1)');  // horizonte de montañas
    sky.addColorStop(0.62, 'rgba(14, 12, 22, 1)');  // base del valle
    sky.addColorStop(0.82, 'rgba(10,  9, 16, 1)');  // suelo del valle
    sky.addColorStop(1.00, 'rgba( 7,  6, 11, 1)');  // tierra oscura
    bgCtx.fillStyle = sky;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Ambiente: halos visibles + calor de valle + viñeta
  // ════════════════════════════════════════════════════════════════════════
  function drawAmbient(W, H) {
    const pulse = 0.82 + 0.18 * Math.sin(t * 0.00020);
    const drift = Math.sin(t * 0.00014) * 0.032;

    // Gran halo de "luna oculta" detrás de las montañas lejanas
    const moonG = bgCtx.createRadialGradient(W*0.38, H*0.28, 0, W*0.38, H*0.28, W*0.55);
    moonG.addColorStop(0,   `rgba(110, 85, 200, ${0.18 * pulse})`);
    moonG.addColorStop(0.4, `rgba( 75, 58, 150, ${0.10 * pulse})`);
    moonG.addColorStop(1,   'rgba(0,0,0,0)');
    bgCtx.fillStyle = moonG; bgCtx.fillRect(0, 0, W, H);

    // Halos místicos adicionales en el cielo
    [
      [W*(0.70-drift), H*0.18, W*0.38, 0.12, 88, 60, 175],
      [W*(0.15+drift), H*0.32, W*0.30, 0.09, 65, 45, 145],
    ].forEach(([cx, cy, r, str, cr, cg, cb]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,   `rgba(${cr},${cg},${cb},${str*pulse})`);
      g.addColorStop(0.5, `rgba(${cr},${cg},${cb},${str*0.35*pulse})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.fillStyle = g; bgCtx.fillRect(0, 0, W, H);
    });

    // Calor ámbar del valle — resplandor de miles de linternas
    const mist = Math.sin(t * 0.00011) * 0.038;
    [
      [W*(0.50+mist),      H*0.70, W*0.62, 0.16, 200, 130, 52],
      [W*(0.22-mist*0.6),  H*0.78, W*0.42, 0.12, 180, 110, 44],
      [W*(0.78+mist*0.4),  H*0.76, W*0.38, 0.10, 210, 145, 58],
    ].forEach(([cx, cy, r, str, cr, cg, cb]) => {
      const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,   `rgba(${cr},${cg},${cb},${str*pulse})`);
      g.addColorStop(0.55,`rgba(${cr},${cg},${cb},${str*0.28*pulse})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.fillStyle = g; bgCtx.fillRect(0, 0, W, H);
    });

    // Viñeta cinematográfica
    const vig = bgCtx.createRadialGradient(W/2, H*0.40, H*0.14, W/2, H*0.40, W*0.82);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(4,3,8,${0.62*pulse})`);
    bgCtx.fillStyle = vig; bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Estrellas (cálidas + místicas + frías) — más brillantes
  // ════════════════════════════════════════════════════════════════════════
  function drawStars(W, H) {
    bgCtx.save();
    STARS.forEach(s => {
      const sx = s.x / 100 * W, sy = s.y / 100 * H;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.spd + s.phase));
      const al = tw * (0.28 + s.r * 0.22);
      bgCtx.fillStyle = s.warm   ? `rgba(244,181,106,${al})`
                      : s.mystic ? `rgba(180,155,255,${al})`
                      :             `rgba(220,215,205,${al})`;
      bgCtx.beginPath(); bgCtx.arc(sx, sy, s.r, 0, Math.PI*2); bgCtx.fill();
      // Destellos en estrellas grandes
      if (s.r > 1.0) {
        bgCtx.beginPath(); bgCtx.arc(sx, sy, s.r * 2.8, 0, Math.PI*2);
        bgCtx.fillStyle = s.warm ? `rgba(244,181,106,${al*0.18})` : `rgba(200,195,240,${al*0.15})`;
        bgCtx.fill();
      }
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Helper: dibuja una silueta de montaña con bezier suavizado
  // ════════════════════════════════════════════════════════════════════════
  function drawMountainRidge(ridge, W, H, fillStyle, rimStyle) {
    bgCtx.save();
    bgCtx.beginPath();
    bgCtx.moveTo(ridge[0].x*W, ridge[0].y*H);
    for (let i = 1; i < ridge.length - 1; i++) {
      const mx = (ridge[i].x + ridge[i+1].x) / 2 * W;
      const my = (ridge[i].y + ridge[i+1].y) / 2 * H;
      bgCtx.quadraticCurveTo(ridge[i].x*W, ridge[i].y*H, mx, my);
    }
    bgCtx.lineTo(ridge[ridge.length-1].x*W, ridge[ridge.length-1].y*H);
    bgCtx.lineTo(W, H); bgCtx.lineTo(0, H);
    bgCtx.closePath();
    bgCtx.fillStyle = fillStyle; bgCtx.fill();

    if (rimStyle) {
      bgCtx.beginPath();
      bgCtx.moveTo(ridge[0].x*W, ridge[0].y*H);
      for (let i = 1; i < ridge.length - 1; i++) {
        const mx = (ridge[i].x + ridge[i+1].x) / 2 * W;
        const my = (ridge[i].y + ridge[i+1].y) / 2 * H;
        bgCtx.quadraticCurveTo(ridge[i].x*W, ridge[i].y*H, mx, my);
      }
      bgCtx.lineTo(ridge[ridge.length-1].x*W, ridge[ridge.length-1].y*H);
      bgCtx.strokeStyle = rimStyle; bgCtx.lineWidth = 1.6; bgCtx.stroke();
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Helper: bosque con líneas rectas (más dentado)
  // ════════════════════════════════════════════════════════════════════════
  function drawForestRidge(ridge, W, H, fillStyle) {
    bgCtx.save();
    bgCtx.beginPath();
    bgCtx.moveTo(ridge[0].x*W, ridge[0].y*H);
    for (let i = 1; i < ridge.length; i++) {
      bgCtx.lineTo(ridge[i].x*W, ridge[i].y*H);
    }
    bgCtx.lineTo(W, H); bgCtx.lineTo(0, H);
    bgCtx.closePath();
    bgCtx.fillStyle = fillStyle; bgCtx.fill();
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Tres capas de montaña — siluetas oscuras contra cielo luminoso
  // ════════════════════════════════════════════════════════════════════════
  function drawMountains(W, H) {
    const rimPulse = 0.80 + 0.20 * Math.sin(t * 0.00016);

    // Capa lejana — silueta oscura con borde violeta visible (luna detrás)
    drawMountainRidge(FAR_RIDGE, W, H,
      'rgba(8, 7, 18, 1.0)',
      `rgba(120, 90, 200, ${0.30 * rimPulse})`
    );

    // Capa media — más oscura aún, borde ámbar sutil (calor del valle)
    drawMountainRidge(MID_RIDGE, W, H,
      'rgba(5, 4, 12, 1.0)',
      `rgba(180, 130, 60, ${0.18 * rimPulse})`
    );

    // Bosque — negro absoluto, silueta dentada
    drawForestRidge(FOREST_RIDGE, W, H, 'rgba(2, 2, 5, 1.0)');
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Rayos de luz volumétrica desde las cimas (visibles)
  // ════════════════════════════════════════════════════════════════════════
  function drawLightShafts(W, H) {
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    const drift = Math.sin(t * 0.00010) * W * 0.018;
    const pulse  = 0.75 + 0.25 * Math.sin(t * 0.00022);

    [
      [W*0.40+drift, H*0.22, W*0.28, H*0.74, 0.055, '190,148,82'],
      [W*0.64-drift, H*0.30, W*0.20, H*0.70, 0.042, '155,125,210'],
      [W*0.22+drift, H*0.36, W*0.32, H*0.76, 0.030, '170,135,80'],
    ].forEach(([tx, ty, bx, by, al, cr]) => {
      const grad = bgCtx.createLinearGradient(tx, ty, bx, by);
      grad.addColorStop(0,    `rgba(${cr},${al * pulse})`);
      grad.addColorStop(0.50, `rgba(${cr},${al * 0.45 * pulse})`);
      grad.addColorStop(1,    'rgba(0,0,0,0)');
      const spread = (by - ty) * 0.30;
      bgCtx.beginPath();
      bgCtx.moveTo(tx - 4, ty);
      bgCtx.lineTo(tx + 4, ty);
      bgCtx.lineTo(bx + spread, by);
      bgCtx.lineTo(bx - spread, by);
      bgCtx.closePath();
      bgCtx.fillStyle = grad; bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Brillo del horizonte del valle (calor acumulado de linternas)
  // ════════════════════════════════════════════════════════════════════════
  function drawHorizonGlow(W, H) {
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    const pulse = 0.78 + 0.22 * Math.sin(t * 0.00018);
    const g = bgCtx.createLinearGradient(0, H*0.62, 0, H*0.82);
    g.addColorStop(0,   'rgba(0,0,0,0)');
    g.addColorStop(0.3, `rgba(210,138,50,${0.14*pulse})`);
    g.addColorStop(0.6, `rgba(190,120,40,${0.20*pulse})`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    bgCtx.fillStyle = g; bgCtx.fillRect(0, H*0.62, W, H*0.22);
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Niebla volumétrica del valle — visible y cálida
  // ════════════════════════════════════════════════════════════════════════
  function drawValleyMist(W, H) {
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    MIST_PUFFS.forEach(p => {
      const dx   = Math.sin(t * p.speed + p.phase) * W * 0.080;
      const cx   = W * p.xBase + dx;
      const cy   = H * p.y;
      const r    = W * p.r;
      const base = p.alpha * 4.5;   // multiplica x4.5 la alpha original
      const cr   = p.warm ? '200,148,75' : '148,150,175';
      const g    = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,    `rgba(${cr},${Math.min(base, 0.22)})`);
      g.addColorStop(0.45, `rgba(${cr},${Math.min(base * 0.42, 0.09)})`);
      g.addColorStop(1,    'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(cx, cy, r, 0, Math.PI*2);
      bgCtx.fillStyle = g; bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Faroles parpadeantes de la aldea — brillantes y cálidos
  // ════════════════════════════════════════════════════════════════════════
  function drawLanterns(W, H) {
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    LANTERNS.forEach(l => {
      const f1    = 0.72 + 0.28 * Math.sin(t * (0.00185 + l.phase*0.00038) + l.phase);
      const f2    = 0.88 + 0.12 * Math.sin(t * (0.00395 + l.phase*0.00058) + l.phase*1.3);
      const base  = f1 * f2 * (l.deep ? 0.65 : 1.0);   // mucho más brillante
      const lx = l.x * W, ly = l.y * H;
      const cr  = l.warm ? '244,181,106' : '255,160,60';

      // Halo exterior amplio (luz de linterna iluminando el entorno)
      const outer = bgCtx.createRadialGradient(lx, ly, 0, lx, ly, l.size * 38);
      outer.addColorStop(0,   `rgba(${cr},${Math.min(base * 0.55, 0.55)})`);
      outer.addColorStop(0.35,`rgba(${cr},${Math.min(base * 0.22, 0.22)})`);
      outer.addColorStop(0.70,`rgba(${cr},${Math.min(base * 0.06, 0.06)})`);
      outer.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(lx, ly, l.size*38, 0, Math.PI*2);
      bgCtx.fillStyle = outer; bgCtx.fill();

      // Núcleo brillante
      const inner = bgCtx.createRadialGradient(lx, ly, 0, lx, ly, l.size*6);
      inner.addColorStop(0,   `rgba(255,248,215,${Math.min(base * 0.95, 0.95)})`);
      inner.addColorStop(0.4, `rgba(${cr},${Math.min(base * 0.65, 0.65)})`);
      inner.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(lx, ly, l.size*6, 0, Math.PI*2);
      bgCtx.fillStyle = inner; bgCtx.fill();

      // Punto central (la llama)
      bgCtx.beginPath(); bgCtx.arc(lx, ly, l.size*1.2, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(255,255,240,${Math.min(base, 1.0)})`; bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Polvo ambiental (motes flotantes)
  // ════════════════════════════════════════════════════════════════════════
  function drawDust(W, H) {
    if (!dust) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    dust.forEach(p => {
      const tw  = 0.42 + 0.58 * (0.5 + 0.5*Math.sin(t*0.00118+p.phase));
      const cr  = p.warm ? '244,181,106' : '208,198,182';
      bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(${cr},${p.alpha*tw})`; bgCtx.fill();
      p.x += p.vx + Math.sin(t*0.00155 + p.phase)*0.052;
      p.y += p.vy;
      if (p.y < -8)    { p.y = H+8;  p.x = (p.x+71)%W; }
      if (p.x < -8)    p.x = W+8;
      if (p.x > W+8)   p.x = -8;
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Brasas flotantes (partículas de fuego ascendentes)
  // ════════════════════════════════════════════════════════════════════════
  function drawEmbers(W, H) {
    if (!embers) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    embers.forEach(p => {
      p.wobble += 0.013;
      const tw  = 0.38 + 0.62 * (0.5 + 0.5*Math.sin(t*0.00188+p.phase));
      // Halo exterior
      const g = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size*6);
      g.addColorStop(0,   `rgba(255,158,55,${p.alpha*tw*0.68})`);
      g.addColorStop(0.5, `rgba(205,118,48,${p.alpha*tw*0.24})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size*6, 0, Math.PI*2);
      bgCtx.fillStyle = g; bgCtx.fill();
      // Núcleo
      bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(255,210,135,${p.alpha*tw})`; bgCtx.fill();

      p.x += p.vx + Math.sin(p.wobble)*0.17;
      p.y += p.vy;
      if (p.y < H*0.12) { p.y = H*0.82 + Math.random()*H*0.12; p.x = (p.x+83)%W; }
      if (p.x < -8) p.x = W+8;
      if (p.x > W+8) p.x = -8;
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Wisps arcanos (orbes misteriosos púrpura/violeta)
  // ════════════════════════════════════════════════════════════════════════
  function drawWisps(W, H) {
    if (!wisps) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    wisps.forEach(w => {
      w.wander += 0.0055;
      w.vx += Math.cos(w.wander*0.52)*0.009;
      w.vy += Math.sin(w.wander*0.46)*0.007;
      const spd = Math.sqrt(w.vx*w.vx + w.vy*w.vy);
      if (spd > 0.32) { w.vx *= 0.32/spd; w.vy *= 0.32/spd; }
      w.x += w.vx; w.y += w.vy;
      if (w.x < 0)       w.x = W;
      if (w.x > W)       w.x = 0;
      if (w.y < 0)       w.y = H * 0.78;
      if (w.y > H * 0.92) w.y = H * 0.04;

      const tw    = 0.32 + 0.68 * (0.5 + 0.5*Math.sin(t*0.00108+w.phase));
      const alpha = w.alpha * tw;

      const g = bgCtx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.size*13);
      g.addColorStop(0,    `rgba(166,139,255,${alpha*0.82})`);
      g.addColorStop(0.38, `rgba(127,115,217,${alpha*0.30})`);
      g.addColorStop(1,    'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(w.x, w.y, w.size*13, 0, Math.PI*2);
      bgCtx.fillStyle = g; bgCtx.fill();
      bgCtx.beginPath(); bgCtx.arc(w.x, w.y, w.size*0.75, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(200,188,255,${alpha*0.70})`; bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Bloom de clic: anillos dorados/arcanos + partículas
  // ════════════════════════════════════════════════════════════════════════
  function spawnBloom(x, y) {
    blooms.push({
      x, y, life: 1.0,
      particles: Array.from({ length: 32 }, () => {
        const a   = Math.random() * Math.PI * 2;
        const spd = 1.8 + Math.random() * 3.8;
        return {
          x, y,
          vx:   Math.cos(a)*spd,
          vy:   Math.sin(a)*spd,
          size: 0.6 + Math.random()*1.4,
          warm: Math.random() > 0.32,
        };
      }),
    });
  }

  function drawBlooms() {
    if (!blooms.length) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = blooms.length-1; i >= 0; i--) {
      const b = blooms[i], prog = 1 - b.life;

      // Tres anillos expansivos
      for (let ri = 0; ri < 3; ri++) {
        const rp = Math.max(0, prog - ri*0.10);
        if (rp <= 0) continue;
        const rR  = rp * 76 + ri * 14;
        const rA  = Math.max(0, (b.life - ri*0.10) * 0.45);
        const col = ri === 1 ? '166,139,255' : '244,181,106';
        bgCtx.beginPath(); bgCtx.arc(b.x, b.y, rR, 0, Math.PI*2);
        bgCtx.strokeStyle=`rgba(${col},${rA})`; bgCtx.lineWidth=1.1; bgCtx.stroke();
      }

      // Flash central
      const fR = 6 + prog*35;
      const flash = bgCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, fR);
      flash.addColorStop(0,   `rgba(255,242,205,${b.life*0.82})`);
      flash.addColorStop(0.4, `rgba(244,181,106,${b.life*0.50})`);
      flash.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(b.x, b.y, fR, 0, Math.PI*2);
      bgCtx.fillStyle = flash; bgCtx.fill();

      // Partículas voladoras
      b.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.93; p.vy *= 0.93; p.vy += 0.035;
        const col = p.warm ? '255,200,100' : '178,158,255';
        bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        bgCtx.fillStyle = `rgba(${col},${b.life*0.82})`; bgCtx.fill();
      });

      b.life -= 0.020;
      if (b.life <= 0) blooms.splice(i, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor: anillo ámbar respirante + rastro dorado + chispas
  // ════════════════════════════════════════════════════════════════════════
  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    // Anillo respirante ámbar
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.030);
    const ringR   = 15 + breathe * 7;
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, ringR, 0, Math.PI*2);
    overCtx.strokeStyle = `rgba(244,181,106,${0.15*breathe})`; overCtx.lineWidth = 1.0; overCtx.stroke();

    // Halo exterior difuso
    const og = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 54);
    og.addColorStop(0,   'rgba(244,181,106,0.065)');
    og.addColorStop(0.4, 'rgba(200,138,65,0.022)');
    og.addColorStop(1,   'rgba(0,0,0,0)');
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 54, 0, Math.PI*2);
    overCtx.fillStyle = og; overCtx.fill();

    // Halo interior suave
    const ig = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 12);
    ig.addColorStop(0,   'rgba(255,240,195,0.18)');
    ig.addColorStop(0.5, 'rgba(244,181,106,0.07)');
    ig.addColorStop(1,   'rgba(0,0,0,0)');
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 12, 0, Math.PI*2);
    overCtx.fillStyle = ig; overCtx.fill();

    // Punto central
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 1.55, 0, Math.PI*2);
    overCtx.fillStyle = 'rgba(255,248,225,0.55)'; overCtx.fill();

    // Rastro dorado
    for (let i = trailDots.length-1; i >= 0; i--) {
      const d = trailDots[i];
      overCtx.beginPath(); overCtx.arc(d.x, d.y, d.size, 0, Math.PI*2);
      overCtx.fillStyle = `rgba(244,181,106,${d.alpha})`; overCtx.fill();
      d.alpha -= 0.018;
      if (d.alpha <= 0) trailDots.splice(i, 1);
    }

    // Chispas flotantes
    for (let i = cursorSparks.length-1; i >= 0; i--) {
      const s = cursorSparks[i];
      const col = s.mystic ? '166,139,255' : '255,210,128';
      overCtx.beginPath(); overCtx.arc(s.x, s.y, s.size, 0, Math.PI*2);
      overCtx.fillStyle = `rgba(${col},${s.alpha})`; overCtx.fill();
      s.x += s.vx; s.y += s.vy; s.vy += 0.004; s.alpha -= 0.013;
      if (s.alpha <= 0) cursorSparks.splice(i, 1);
    }

    overCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Interacción de clic
  // ════════════════════════════════════════════════════════════════════════
  function handleClick(cx, cy) { spawnBloom(cx, cy); }

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
    drawMountains(W, H);
    drawLightShafts(W, H);
    drawHorizonGlow(W, H);
    drawValleyMist(W, H);
    drawLanterns(W, H);
    drawDust(W, H);
    drawEmbers(W, H);
    drawWisps(W, H);
    drawBlooms();

    drawCursor(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width  = W; bgCanvas.height  = H;
    overCanvas.width = W; overCanvas.height = H;
    initDust(W, H); initEmbers(W, H); initWisps(W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-elder-bg';
      Object.assign(bgCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'-1' });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-elder-over';
      Object.assign(overCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'9998' });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      _onMove = (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        if (t - lastTrailT > 2) {
          lastTrailT = t;
          trailDots.push({ x:mouseX, y:mouseY, size:1.1+Math.random()*0.65, alpha:0.32 });
          if (trailDots.length > 20) trailDots.shift();
        }
        if (Math.random() < 0.038 && cursorSparks.length < 7) {
          const a   = Math.random()*Math.PI*2;
          const spd = 0.55+Math.random()*1.0;
          cursorSparks.push({
            x:mouseX, y:mouseY,
            vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-0.55,
            size:0.75+Math.random()*1.1,
            alpha:0.18+Math.random()*0.14,
            mystic:Math.random() < 0.22,
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
      dust = embers = wisps = null;
      trailDots.length = cursorSparks.length = blooms.length = 0;
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };
})();

export { EldergloomRenderer };
