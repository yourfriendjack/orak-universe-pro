// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/dark-fantasy.js
//  Dark Fantasy — Abismo del Pacto Olvidado
//
//  bgCanvas  (z:-1)   → cielo de tormenta arcana en espiral,
//                        eclipse oscuro con corona de sangre,
//                        torres góticas en 3 capas de profundidad,
//                        círculo de runas rotando en el suelo,
//                        ceniza arcana cayendo, espíritus espectrales,
//                        rayos arcanos ocasionales
//  overCanvas (z:9998) → cursor: anillo eléctrico chispeante + trail
//                        de energía + chispas de hechizo
//
//  Interactividad:
//   · Clic → explosión arcana: anillos violeta + tentáculos de energía
// ════════════════════════════════════════════════════════════════

const DarkFantasyRenderer = (() => {

  let bgCanvas = null, bgCtx = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;
  let ash = null, spirits = null;

  // ── Cursor ──────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastTrailT = 0, _onMove = null, _onClick = null;
  const trailDots = [], cursorSparks = [];

  // ── Blooms de clic ──────────────────────────────────────────────────────
  const blooms = [];

  // ── Rayos activos ───────────────────────────────────────────────────────
  const bolts = [];
  let nextBolt = 380 + Math.floor(Math.random() * 260);

  // ════════════════════════════════════════════════════════════════════════
  //  Torres góticas — 3 capas: lejana, media, cercana
  // ════════════════════════════════════════════════════════════════════════
  const SPIRES_FAR = [
    { cx:0.05, top:0.50, bw:0.018 }, { cx:0.14, top:0.38, bw:0.014 },
    { cx:0.24, top:0.46, bw:0.016 }, { cx:0.36, top:0.34, bw:0.013 },
    { cx:0.48, top:0.40, bw:0.017 }, { cx:0.60, top:0.32, bw:0.014 },
    { cx:0.72, top:0.44, bw:0.016 }, { cx:0.84, top:0.36, bw:0.013 },
    { cx:0.94, top:0.48, bw:0.015 },
  ];
  const SPIRES_MID = [
    { cx:0.09, top:0.60, bw:0.026 }, { cx:0.20, top:0.48, bw:0.022 },
    { cx:0.33, top:0.56, bw:0.028 }, { cx:0.46, top:0.44, bw:0.024 },
    { cx:0.58, top:0.52, bw:0.026 }, { cx:0.70, top:0.46, bw:0.022 },
    { cx:0.82, top:0.58, bw:0.025 }, { cx:0.92, top:0.50, bw:0.020 },
  ];
  const SPIRES_NEAR = [
    { cx:0.03, top:0.68, bw:0.040 }, { cx:0.16, top:0.60, bw:0.036 },
    { cx:0.30, top:0.66, bw:0.042 }, { cx:0.44, top:0.56, bw:0.038 },
    { cx:0.57, top:0.62, bw:0.044 }, { cx:0.70, top:0.58, bw:0.036 },
    { cx:0.83, top:0.65, bw:0.040 }, { cx:0.96, top:0.70, bw:0.034 },
  ];

  // ════════════════════════════════════════════════════════════════════════
  //  Nubes de tormenta — órbitas lentas
  // ════════════════════════════════════════════════════════════════════════
  const CLOUDS = Array.from({ length: 7 }, (_, i) => ({
    orbitX:  0.38 + (i % 3) * 0.18,
    orbitY:  0.22 + (i % 4) * 0.09,
    radius:  0.28 + (i % 3) * 0.14,
    rX:      0.32 + (i % 4) * 0.10,
    rY:      0.14 + (i % 3) * 0.06,
    speed:   (i % 2 === 0 ? 1 : -1) * (0.000028 + i * 0.000006),
    phase:   i * 0.9271,
    alpha:   0.042 + (i % 4) * 0.012,
    blood:   i % 4 === 0,
  }));

  // ════════════════════════════════════════════════════════════════════════
  //  Init partículas
  // ════════════════════════════════════════════════════════════════════════
  function initAsh(W, H) {
    ash = Array.from({ length: 140 }, (_, i) => ({
      x:     (i * 211.73 + 14) % W,
      y:     (i * 157.31 +  8) % H,
      size:   0.28 + (i * 6.71 % 1.0) * 0.72,
      vx:     (Math.sin(i * 1.83) * 0.38),
      vy:      0.25 + (i * 3.51 % 1.0) * 0.55,   // cae hacia abajo
      alpha:  0.038 + (i * 4.97 % 1.0) * 0.110,
      phase:  i * 0.7341,
      blood:  i % 7 === 0,
    }));
  }

  function initSpirits(W, H) {
    spirits = Array.from({ length: 9 }, (_, i) => ({
      x:      (i * 193.47 + 60) % W,
      y:      (i * 141.83 + 30) % (H * 0.80),
      vx:     Math.sin(i * 1.62) * 0.088,
      vy:     Math.cos(i * 2.41) * 0.064,
      size:   3.2 + (i * 7.53 % 1.0) * 3.80,
      alpha:  0.28 + (i * 4.21 % 1.0) * 0.36,
      phase:  i * 1.3721,
      wander: i * 1.0431,
      blood:  i % 5 === 0,
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Generador de rayo arcano
  // ════════════════════════════════════════════════════════════════════════
  function spawnBolt(W, H) {
    const startX = W * (0.20 + Math.random() * 0.60);
    const startY = H * (0.12 + Math.random() * 0.20);
    const endX   = startX + (Math.random() - 0.5) * W * 0.18;
    const endY   = H * (0.58 + Math.random() * 0.28);
    const pts    = [{ x: startX, y: startY }];
    let cx = startX;
    const steps = 14;
    for (let i = 1; i < steps; i++) {
      cx += (Math.random() - 0.5) * 55;
      pts.push({ x: cx, y: startY + (endY - startY) * i / steps });
    }
    pts.push({ x: endX, y: endY });
    bolts.push({ pts, life: 1.0, blood: Math.random() < 0.25 });
    nextBolt = t + 340 + Math.floor(Math.random() * 300);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Cielo: void abisal con degradado profundo
  // ════════════════════════════════════════════════════════════════════════
  function drawBackground(W, H) {
    const sky = bgCtx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0.00, 'rgba(4,  2, 12, 1)');   // negro-violeta absoluto
    sky.addColorStop(0.28, 'rgba(8,  4, 22, 1)');   // abismo oscuro
    sky.addColorStop(0.52, 'rgba(12, 6, 28, 1)');   // profundidad arcana
    sky.addColorStop(0.74, 'rgba(8,  3, 18, 1)');   // suelo del reino
    sky.addColorStop(1.00, 'rgba(3,  1,  8, 1)');   // tierra de obsidiana
    bgCtx.fillStyle = sky;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Nubes de tormenta en espiral lenta
  // ════════════════════════════════════════════════════════════════════════
  function drawStormClouds(W, H) {
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    CLOUDS.forEach(c => {
      const angle = t * c.speed + c.phase;
      const cx = W * (c.orbitX + Math.cos(angle) * 0.12);
      const cy = H * (c.orbitY + Math.sin(angle * 0.7) * 0.06);
      const rX = W * (c.rX + Math.sin(t * 0.000055 + c.phase) * 0.04);
      const rY = H * (c.rY + Math.cos(t * 0.000042 + c.phase) * 0.02);

      bgCtx.save();
      bgCtx.translate(cx, cy);
      bgCtx.scale(rX / 80, rY / 80);
      const g = bgCtx.createRadialGradient(0, 0, 0, 0, 0, 80);
      if (c.blood) {
        g.addColorStop(0,   `rgba(120,15,35,${c.alpha * 1.4})`);
        g.addColorStop(0.5, `rgba(80,10,25,${c.alpha * 0.6})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
      } else {
        g.addColorStop(0,   `rgba(100,50,200,${c.alpha})`);
        g.addColorStop(0.5, `rgba(60,30,140,${c.alpha * 0.45})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
      }
      bgCtx.beginPath(); bgCtx.arc(0, 0, 80, 0, Math.PI * 2);
      bgCtx.fillStyle = g; bgCtx.fill();
      bgCtx.restore();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Eclipse oscuro con corona de sangre/violeta
  // ════════════════════════════════════════════════════════════════════════
  function drawEclipse(W, H) {
    const pulse  = 0.80 + 0.20 * Math.sin(t * 0.00024);
    const ex     = W * 0.72;
    const ey     = H * 0.22;
    const moonR  = W * 0.062;

    bgCtx.save();

    // Corona exterior (resplandor arcano alrededor del eclipse)
    const corona = bgCtx.createRadialGradient(ex, ey, moonR * 0.85, ex, ey, moonR * 2.8);
    corona.addColorStop(0,   `rgba(160, 20, 50, ${0.28 * pulse})`);
    corona.addColorStop(0.3, `rgba(120, 15, 40, ${0.16 * pulse})`);
    corona.addColorStop(0.6, `rgba(80,  40, 160, ${0.08 * pulse})`);
    corona.addColorStop(1,   'rgba(0,0,0,0)');
    bgCtx.beginPath(); bgCtx.arc(ex, ey, moonR * 2.8, 0, Math.PI * 2);
    bgCtx.fillStyle = corona; bgCtx.fill();

    // Anillo de fuego (borde brillante del eclipse)
    bgCtx.beginPath(); bgCtx.arc(ex, ey, moonR, 0, Math.PI * 2);
    bgCtx.strokeStyle = `rgba(200, 60, 80, ${0.55 * pulse})`;
    bgCtx.lineWidth = moonR * 0.12;
    bgCtx.stroke();

    // Destellos en el anillo — puntos de luz escapando
    for (let i = 0; i < 6; i++) {
      const a  = (i / 6) * Math.PI * 2 + t * 0.00015;
      const fx = ex + Math.cos(a) * moonR;
      const fy = ey + Math.sin(a) * moonR;
      bgCtx.beginPath(); bgCtx.arc(fx, fy, moonR * 0.09, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(255, 180, 160, ${0.60 * pulse})`; bgCtx.fill();
    }

    // Cuerpo oscuro del eclipse (astro que bloquea la luna)
    bgCtx.beginPath(); bgCtx.arc(ex, ey, moonR * 0.90, 0, Math.PI * 2);
    bgCtx.fillStyle = 'rgba(3, 1, 8, 1)'; bgCtx.fill();

    // Viñeta de energía en el centro del disco
    const center = bgCtx.createRadialGradient(ex, ey, 0, ex, ey, moonR * 0.88);
    center.addColorStop(0,   `rgba(60, 10, 80, ${0.18 * pulse})`);
    center.addColorStop(0.6, `rgba(20,  4, 30, ${0.08 * pulse})`);
    center.addColorStop(1,   'rgba(0,0,0,0)');
    bgCtx.beginPath(); bgCtx.arc(ex, ey, moonR * 0.88, 0, Math.PI * 2);
    bgCtx.fillStyle = center; bgCtx.fill();

    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Torres góticas en 3 capas de profundidad
  // ════════════════════════════════════════════════════════════════════════
  function drawSpireLayer(spires, W, H, fill, rimColor, rimAlpha) {
    const rimPulse = 0.78 + 0.22 * Math.sin(t * 0.00018);
    spires.forEach(s => {
      const cx     = s.cx * W;
      const tipY   = s.top * H;
      const baseY  = H;
      const halfBW = s.bw * W * 0.5;
      const halfTip = halfBW * 0.08;  // punta muy fina

      bgCtx.save();
      bgCtx.beginPath();
      bgCtx.moveTo(cx, tipY);                          // vértice superior
      bgCtx.lineTo(cx + halfTip, tipY + H * 0.025);   // justo bajo la punta
      bgCtx.lineTo(cx + halfBW,  baseY);               // base derecha
      bgCtx.lineTo(cx - halfBW,  baseY);               // base izquierda
      bgCtx.lineTo(cx - halfTip, tipY + H * 0.025);   // justo bajo la punta
      bgCtx.closePath();
      bgCtx.fillStyle = fill; bgCtx.fill();

      // Borde violeta — luz del eclipse sobre el borde izquierdo
      bgCtx.beginPath();
      bgCtx.moveTo(cx, tipY);
      bgCtx.lineTo(cx - halfTip, tipY + H * 0.025);
      bgCtx.lineTo(cx - halfBW,  baseY);
      bgCtx.strokeStyle = `rgba(${rimColor},${rimAlpha * rimPulse})`;
      bgCtx.lineWidth = 1.2; bgCtx.stroke();
      bgCtx.restore();
    });
  }

  function drawSpires(W, H) {
    // Capa lejana — más pequeña, borde violeta tenue
    drawSpireLayer(SPIRES_FAR,  W, H, 'rgba(5,3,14,1.0)',  '160,80,240', 0.22);
    // Capa media — mediana, borde violeta medio
    drawSpireLayer(SPIRES_MID,  W, H, 'rgba(3,2,10,1.0)',  '140,60,210', 0.30);
    // Capa cercana — la más oscura y grande, borde rojo-violeta
    drawSpireLayer(SPIRES_NEAR, W, H, 'rgba(2,1, 6,1.0)',  '180,30,55',  0.18);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Círculo de runas arcanas rotando en el suelo
  // ════════════════════════════════════════════════════════════════════════
  function drawRuneCircle(W, H) {
    const cx    = W * 0.50;
    const cy    = H * 0.88;
    const pulse = 0.70 + 0.30 * Math.sin(t * 0.00030);
    const R1    = W * 0.14;   // anillo exterior
    const R2    = W * 0.090;  // anillo medio
    const R3    = W * 0.050;  // anillo interior

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';

    // Resplandor de suelo debajo del círculo
    const glow = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, R1 * 1.6);
    glow.addColorStop(0,   `rgba(130,40,200,${0.18 * pulse})`);
    glow.addColorStop(0.5, `rgba(80,20,140,${0.08 * pulse})`);
    glow.addColorStop(1,   'rgba(0,0,0,0)');
    bgCtx.beginPath(); bgCtx.arc(cx, cy, R1 * 1.6, 0, Math.PI * 2);
    bgCtx.fillStyle = glow; bgCtx.fill();

    // Anillo exterior — rota lento horario
    const rot1 = t * 0.000110;
    bgCtx.save(); bgCtx.translate(cx, cy); bgCtx.rotate(rot1);
    bgCtx.beginPath(); bgCtx.arc(0, 0, R1, 0, Math.PI * 2);
    bgCtx.strokeStyle = `rgba(160,70,240,${0.28 * pulse})`; bgCtx.lineWidth = 1.5; bgCtx.stroke();
    // 8 nodos en el anillo exterior
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      bgCtx.beginPath(); bgCtx.arc(Math.cos(a)*R1, Math.sin(a)*R1, 3.5, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(200,140,255,${0.55 * pulse})`; bgCtx.fill();
    }
    bgCtx.restore();

    // Anillo medio — rota rápido anti-horario
    const rot2 = -t * 0.000220;
    bgCtx.save(); bgCtx.translate(cx, cy); bgCtx.rotate(rot2);
    bgCtx.beginPath(); bgCtx.arc(0, 0, R2, 0, Math.PI * 2);
    bgCtx.strokeStyle = `rgba(190,60,80,${0.22 * pulse})`; bgCtx.lineWidth = 1.2; bgCtx.stroke();
    // 6 líneas radiales internas
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      bgCtx.beginPath();
      bgCtx.moveTo(Math.cos(a)*R3, Math.sin(a)*R3);
      bgCtx.lineTo(Math.cos(a)*R2, Math.sin(a)*R2);
      bgCtx.strokeStyle = `rgba(180,50,70,${0.20 * pulse})`; bgCtx.lineWidth = 0.9; bgCtx.stroke();
    }
    bgCtx.restore();

    // Anillo interior — rota medio horario
    const rot3 = t * 0.000165;
    bgCtx.save(); bgCtx.translate(cx, cy); bgCtx.rotate(rot3);
    bgCtx.beginPath(); bgCtx.arc(0, 0, R3, 0, Math.PI * 2);
    bgCtx.strokeStyle = `rgba(220,160,255,${0.35 * pulse})`; bgCtx.lineWidth = 1.0; bgCtx.stroke();
    // Triángulo inscrito
    bgCtx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI/2;
      i === 0
        ? bgCtx.moveTo(Math.cos(a)*R3, Math.sin(a)*R3)
        : bgCtx.lineTo(Math.cos(a)*R3, Math.sin(a)*R3);
    }
    bgCtx.closePath();
    bgCtx.strokeStyle = `rgba(220,160,255,${0.30 * pulse})`; bgCtx.lineWidth = 0.8; bgCtx.stroke();
    bgCtx.restore();

    // Núcleo pulsante central
    const core = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, R3 * 0.55);
    core.addColorStop(0, `rgba(200,140,255,${0.65 * pulse})`);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    bgCtx.beginPath(); bgCtx.arc(cx, cy, R3 * 0.55, 0, Math.PI*2);
    bgCtx.fillStyle = core; bgCtx.fill();

    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Ceniza arcana cayendo
  // ════════════════════════════════════════════════════════════════════════
  function drawAsh(W, H) {
    if (!ash) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    ash.forEach(p => {
      const tw = 0.40 + 0.60 * (0.5 + 0.5 * Math.sin(t * 0.00132 + p.phase));
      const cr = p.blood ? '180,30,55' : '160,110,240';
      bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(${cr},${p.alpha * tw})`; bgCtx.fill();

      // Mueve hacia abajo (ceniza cae)
      p.x += p.vx + Math.sin(t * 0.00122 + p.phase) * 0.45;
      p.y += p.vy;

      if (p.y > H + 8)   { p.y = -8;  p.x = (p.x + 67) % W; }
      if (p.x < -8)  p.x = W + 8;
      if (p.x > W + 8) p.x = -8;
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Espíritus espectrales — grandes y dramáticos
  // ════════════════════════════════════════════════════════════════════════
  function drawSpirits(W, H) {
    if (!spirits) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    spirits.forEach(s => {
      s.wander += 0.0048;
      s.vx += Math.cos(s.wander * 0.55) * 0.010;
      s.vy += Math.sin(s.wander * 0.43) * 0.008;
      const spd = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
      if (spd > 0.38) { s.vx *= 0.38/spd; s.vy *= 0.38/spd; }
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0)         s.x = W;
      if (s.x > W)         s.x = 0;
      if (s.y < 0)         s.y = H * 0.75;
      if (s.y > H * 0.90)  s.y = H * 0.06;

      const tw    = 0.30 + 0.70 * (0.5 + 0.5 * Math.sin(t * 0.00096 + s.phase));
      const alpha = s.alpha * tw;
      const cr    = s.blood ? '220,50,80' : '190,110,255';
      const cr2   = s.blood ? '160,20,50' : '150,70,230';

      // Halo exterior grande
      const g = bgCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 18);
      g.addColorStop(0,    `rgba(${cr},${alpha * 0.95})`);
      g.addColorStop(0.42, `rgba(${cr2},${alpha * 0.38})`);
      g.addColorStop(1,    'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(s.x, s.y, s.size*18, 0, Math.PI*2);
      bgCtx.fillStyle = g; bgCtx.fill();

      // Núcleo brillante
      bgCtx.beginPath(); bgCtx.arc(s.x, s.y, s.size * 0.90, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(235,215,255,${alpha * 0.88})`; bgCtx.fill();
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Rayos arcanos
  // ════════════════════════════════════════════════════════════════════════
  function drawBolts(W, H) {
    if (t >= nextBolt) spawnBolt(W, H);
    if (!bolts.length) return;

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      const cr = b.blood ? '255,80,100' : '200,160,255';

      // Flash ambiental muy sutil cuando el rayo está en su pico
      if (b.life > 0.75) {
        bgCtx.fillStyle = `rgba(120,60,200,${(b.life - 0.75) * 0.025})`;
        bgCtx.fillRect(0, 0, W, H);
      }

      // Trazo principal del rayo
      bgCtx.beginPath();
      bgCtx.moveTo(b.pts[0].x, b.pts[0].y);
      for (let j = 1; j < b.pts.length; j++) bgCtx.lineTo(b.pts[j].x, b.pts[j].y);
      bgCtx.strokeStyle = `rgba(${cr},${b.life * 0.82})`;
      bgCtx.lineWidth   = 1.5 + b.life * 1.0;
      bgCtx.shadowColor = `rgba(${cr},${b.life * 0.55})`;
      bgCtx.shadowBlur  = 12 * b.life;
      bgCtx.stroke();

      // Trazo de núcleo blanco
      bgCtx.beginPath();
      bgCtx.moveTo(b.pts[0].x, b.pts[0].y);
      for (let j = 1; j < b.pts.length; j++) bgCtx.lineTo(b.pts[j].x, b.pts[j].y);
      bgCtx.strokeStyle = `rgba(240,230,255,${b.life * 0.55})`;
      bgCtx.lineWidth   = 0.7;
      bgCtx.shadowBlur  = 0;
      bgCtx.stroke();

      b.life -= 0.042;
      if (b.life <= 0) bolts.splice(i, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Bloom de clic: onda arcana + tentáculos de energía
  // ════════════════════════════════════════════════════════════════════════
  function spawnBloom(x, y) {
    blooms.push({
      x, y, life: 1.0,
      particles: Array.from({ length: 36 }, () => {
        const a   = Math.random() * Math.PI * 2;
        const spd = 2.0 + Math.random() * 4.2;
        return {
          x, y,
          vx:    Math.cos(a) * spd,
          vy:    Math.sin(a) * spd,
          size:  0.6 + Math.random() * 1.6,
          blood: Math.random() < 0.30,
        };
      }),
    });
  }

  function drawBlooms() {
    if (!blooms.length) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i], prog = 1 - b.life;

      // 4 anillos expansivos (arcanos)
      for (let ri = 0; ri < 4; ri++) {
        const rp = Math.max(0, prog - ri * 0.09);
        if (rp <= 0) continue;
        const rR  = rp * 82 + ri * 12;
        const rA  = Math.max(0, (b.life - ri*0.09) * 0.42);
        const col = ri % 2 === 0 ? '190,90,255' : '220,40,70';
        bgCtx.beginPath(); bgCtx.arc(b.x, b.y, rR, 0, Math.PI*2);
        bgCtx.strokeStyle = `rgba(${col},${rA})`; bgCtx.lineWidth = 1.2; bgCtx.stroke();
      }

      // Flash central
      const fR    = 7 + prog * 40;
      const flash = bgCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, fR);
      flash.addColorStop(0,   `rgba(235,205,255,${b.life * 0.90})`);
      flash.addColorStop(0.4, `rgba(180,80,255,${b.life * 0.55})`);
      flash.addColorStop(1,   'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(b.x, b.y, fR, 0, Math.PI*2);
      bgCtx.fillStyle = flash; bgCtx.fill();

      // Partículas
      b.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.92; p.vy *= 0.92; p.vy += 0.028;
        const col = p.blood ? '220,50,80' : '200,130,255';
        bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        bgCtx.fillStyle = `rgba(${col},${b.life * 0.88})`; bgCtx.fill();
      });

      b.life -= 0.020;
      if (b.life <= 0) blooms.splice(i, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor: anillo eléctrico + trail arcano + chispas
  // ════════════════════════════════════════════════════════════════════════
  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    const breathe = 0.5 + 0.5 * Math.sin(t * 0.032);
    const jitter  = Math.sin(t * 0.58) * 1.2;   // efecto eléctrico
    const ringR   = 14 + breathe * 8 + jitter;

    // Anillo exterior difuso
    const og = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 58);
    og.addColorStop(0,   'rgba(180,90,255,0.072)');
    og.addColorStop(0.4, 'rgba(140,50,220,0.026)');
    og.addColorStop(1,   'rgba(0,0,0,0)');
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 58, 0, Math.PI*2);
    overCtx.fillStyle = og; overCtx.fill();

    // Anillo eléctrico — con pequeñas irregularidades
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, ringR, 0, Math.PI*2);
    overCtx.strokeStyle = `rgba(200,120,255,${0.20 * breathe + 0.05})`;
    overCtx.lineWidth = 1.1; overCtx.stroke();

    // Segundo anillo interior (más brillante, tamaño fijo)
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 7, 0, Math.PI*2);
    overCtx.strokeStyle = `rgba(220,160,255,${0.12 * breathe})`;
    overCtx.lineWidth = 0.8; overCtx.stroke();

    // Punto central
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 1.6, 0, Math.PI*2);
    overCtx.fillStyle = 'rgba(240,220,255,0.62)'; overCtx.fill();

    // Trail arcano
    for (let i = trailDots.length - 1; i >= 0; i--) {
      const d = trailDots[i];
      overCtx.beginPath(); overCtx.arc(d.x, d.y, d.size, 0, Math.PI*2);
      overCtx.fillStyle = `rgba(190,100,255,${d.alpha})`; overCtx.fill();
      d.alpha -= 0.017;
      if (d.alpha <= 0) trailDots.splice(i, 1);
    }

    // Chispas de hechizo
    for (let i = cursorSparks.length - 1; i >= 0; i--) {
      const s = cursorSparks[i];
      const col = s.blood ? '240,60,90' : '210,150,255';
      overCtx.beginPath(); overCtx.arc(s.x, s.y, s.size, 0, Math.PI*2);
      overCtx.fillStyle = `rgba(${col},${s.alpha})`; overCtx.fill();
      s.x += s.vx; s.y += s.vy; s.vy += 0.005; s.alpha -= 0.014;
      if (s.alpha <= 0) cursorSparks.splice(i, 1);
    }

    overCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Loop principal
  // ════════════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W = bgCanvas.width, H = bgCanvas.height;

    bgCtx.clearRect(0, 0, W, H);
    drawBackground(W, H);
    drawStormClouds(W, H);
    drawEclipse(W, H);
    drawBolts(W, H);
    drawSpires(W, H);
    drawRuneCircle(W, H);
    drawAsh(W, H);
    drawSpirits(W, H);
    drawBlooms();

    drawCursor(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width   = W; bgCanvas.height   = H;
    overCanvas.width = W; overCanvas.height = H;
    initAsh(W, H); initSpirits(W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-df-bg';
      Object.assign(bgCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'-1' });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-df-over';
      Object.assign(overCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'9998' });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      _onMove = (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        if (t - lastTrailT > 2) {
          lastTrailT = t;
          trailDots.push({ x:mouseX, y:mouseY, size:1.0 + Math.random()*0.7, alpha:0.30 });
          if (trailDots.length > 22) trailDots.shift();
        }
        if (Math.random() < 0.040 && cursorSparks.length < 8) {
          const a   = Math.random() * Math.PI * 2;
          const spd = 0.60 + Math.random() * 1.1;
          cursorSparks.push({
            x:mouseX, y:mouseY,
            vx:Math.cos(a)*spd, vy:Math.sin(a)*spd - 0.60,
            size:0.70 + Math.random() * 1.2,
            alpha:0.20 + Math.random() * 0.14,
            blood:Math.random() < 0.20,
          });
        }
      };
      _onClick = (e) => spawnBloom(e.clientX, e.clientY);

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
      ash = spirits = null;
      trailDots.length = cursorSparks.length = blooms.length = bolts.length = 0;
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };
})();

export { DarkFantasyRenderer };
