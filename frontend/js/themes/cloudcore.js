// frontend/js/themes/cloudcore.js
// El cielo respira, recuerda y responde sin explicarse.
const CloudcoreRenderer = (() => {
  'use strict';

  // ── Canvases ──────────────────────────────────────────────────
  let bgCanvas, bgCtx, overCanvas, overCtx;
  let raf, t = 0;
  let _onMove = null, _onClick = null;

  // ── Elementos del mundo ───────────────────────────────────────
  let clouds = [], dustMotes = [], stars = [], birdGroups = [];
  let rainDrops = [], spawnPuffs = [];
  let rainAlpha = 0;

  // ── Sistema de energía (0–100) ────────────────────────────────
  // Sube con interacción, baja con inactividad.
  // Controla apertura del cielo, densidad de nubes y presencia de aves.
  let energy    = 50;
  let mouseIdle = 0;
  let mouseX = -999, mouseY = -999;
  let trail  = [];

  // ── Capa de memoria ───────────────────────────────────────────
  // Ecos de clics pasados — reaparecen como orbes apenas visibles.
  let memoryOrbs = [];

  // ── Evento diario (uno por sesión/día) ────────────────────────
  let dailyEvent     = null;
  let dailyEventDone = false;

  // ── Eventos raros ─────────────────────────────────────────────
  let rareEvent    = null;
  let rareCooldown = 900;   // frames de espera antes del primer chequeo

  // ── Sistema de silencio ───────────────────────────────────────
  // 0 = activo, 1 = silencio profundo. El vacío es intencional.
  let silence = 0;

  // ── Constantes ────────────────────────────────────────────────
  const CYCLE       = 9000;   // frames por ciclo de día
  const RARE_CHANCE = 0.004;  // probabilidad por chequeo

  // ═══════════════════════════════════════════════════════════════
  //  CICLO DEL CIELO
  // ═══════════════════════════════════════════════════════════════
  const SKY = [
    { p: 0.00, top: [70,  95, 160], bot: [255, 150,  90] },
    { p: 0.22, top: [30, 110, 200], bot: [200, 235, 255] },
    { p: 0.52, top: [40,  80, 150], bot: [255, 180,  55] },
    { p: 0.72, top: [25,  35,  90], bot: [200,  85,  45] },
    { p: 0.85, top: [ 8,  12,  38], bot: [ 50,  25,  55] },
    { p: 1.00, top: [70,  95, 160], bot: [255, 150,  90] },
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
    return {
      top: `rgb(${lerpRGB(a.top, b.top, f)})`,
      bot: `rgb(${lerpRGB(a.bot, b.bot, f)})`,
    };
  }

  function getTint(phase) {
    const p = phase % 1;
    if (p >= 0.52 && p < 0.64) return (p - 0.52) / 0.12;
    if (p >= 0.64 && p < 0.72) return 1 - (p - 0.64) / 0.08;
    if (p >= 0.82) return -0.6;
    if (p < 0.04)  return -0.6;
    return 0;
  }

  function getSunPos(phase, W, H) {
    const ang = (phase % 1) * Math.PI * 2 - Math.PI * 0.5;
    return {
      x: W * 0.5  + Math.cos(ang) * W * 0.42,
      y: H * 0.22 - Math.sin(ang) * H * 0.28,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  SISTEMA DE ENERGÍA
  // ═══════════════════════════════════════════════════════════════
  function updateEnergy() {
    mouseIdle++;
    if (mouseIdle < 80) {
      energy  = Math.min(100, energy + 0.055);
      silence = Math.max(0, silence - 0.006);
    } else {
      energy  = Math.max(0,   energy  - 0.007);
      silence = Math.min(1,   silence + (mouseIdle > 400 ? 0.0008 : 0));
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  CAPA DE MEMORIA
  // ═══════════════════════════════════════════════════════════════
  function addMemory(x, y) {
    memoryOrbs.push({ x, y, born: t, life: 5000 + Math.random() * 2000 });
    if (memoryOrbs.length > 18) memoryOrbs.shift();
  }

  function drawMemoryLayer() {
    for (let i = memoryOrbs.length - 1; i >= 0; i--) {
      const m   = memoryOrbs[i];
      const age = t - m.born;
      if (age > m.life) { memoryOrbs.splice(i, 1); continue; }
      if (age < 1200) continue;   // latencia: el eco tarda en aparecer

      const prog  = (age - 1200) / (m.life - 1200);
      const alpha = (prog < 0.1 ? prog / 0.1 : prog > 0.8 ? (1 - (prog - 0.8) / 0.2) : 1) * 0.10;
      const pulse = 0.6 + 0.4 * Math.sin(t * 0.018 + m.x * 0.01);

      const g = bgCtx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 20);
      g.addColorStop(0, `rgba(210,235,255,${alpha * pulse})`);
      g.addColorStop(1, `rgba(210,235,255,0)`);
      bgCtx.fillStyle = g;
      bgCtx.beginPath();
      bgCtx.arc(m.x, m.y, 20, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  EVENTO DIARIO
  // ═══════════════════════════════════════════════════════════════
  function getDailyType() {
    try {
      const today  = new Date().toDateString();
      const stored = localStorage.getItem('orak-cc-daily');
      if (stored) {
        const { date, type } = JSON.parse(stored);
        if (date === today) return type;
      }
      const types = ['butterfly', 'letter', 'cloud-symbol', 'memory-rainbow'];
      const type  = types[Math.floor(Math.random() * types.length)];
      localStorage.setItem('orak-cc-daily', JSON.stringify({ date: today, type }));
      return type;
    } catch { return 'butterfly'; }
  }

  const LETTER_TEXTS = [
    '...el cielo aún recuerda...',
    '...escribiste aquí...',
    '...aún hay tiempo...',
    '...el mundo te escucha...',
    '...esto también pasará...',
  ];

  function triggerDailyEvent(W, H) {
    const type = getDailyType();
    dailyEventDone = true;

    switch (type) {
      case 'butterfly':
        dailyEvent = {
          type, frame: 0, maxFrame: 750,
          x: -70, y: H * (0.10 + Math.random() * 0.28),
          speed: W * 0.0013, wingPhase: 0, pathPhase: 0, trail: [],
        };
        break;

      case 'letter':
        dailyEvent = {
          type, frame: 0, maxFrame: 520,
          x: W + 30, y: H * (0.18 + Math.random() * 0.28),
          speed: -W * 0.00075, alpha: 0,
          text: LETTER_TEXTS[Math.floor(Math.random() * LETTER_TEXTS.length)],
        };
        break;

      case 'cloud-symbol':
        if (clouds.length > 0) {
          dailyEvent = {
            type, frame: 0, maxFrame: 650,
            cloudIdx: Math.floor(Math.random() * clouds.length),
            alpha: 0,
          };
        }
        break;

      case 'memory-rainbow':
        dailyEvent = { type, frame: 0, maxFrame: 420, alpha: 0 };
        break;
    }
  }

  // Mariposa — cruza el cielo con estela prismática
  function drawButterfly(W, H) {
    if (!dailyEvent || dailyEvent.type !== 'butterfly') return;
    const ev = dailyEvent;
    ev.frame++;
    ev.x         += ev.speed;
    ev.y         += Math.sin(ev.pathPhase) * 0.65;
    ev.pathPhase += 0.038;
    ev.wingPhase += 0.13;

    // Estela
    ev.trail.push({ x: ev.x, y: ev.y, a: 0.50 });
    if (ev.trail.length > 55) ev.trail.shift();

    bgCtx.save();
    for (let i = 0; i < ev.trail.length; i++) {
      const pt  = ev.trail[i];
      pt.a     *= 0.965;
      const hue = (i * 5 + t * 0.4) % 360;
      bgCtx.fillStyle = `hsla(${hue},72%,82%,${pt.a})`;
      bgCtx.beginPath();
      bgCtx.arc(pt.x, pt.y, 1.3, 0, Math.PI * 2);
      bgCtx.fill();
    }

    // Alas (dos pares, escala flap)
    const flap = Math.abs(Math.sin(ev.wingPhase));
    const ws   = 10;
    bgCtx.translate(ev.x, ev.y);

    bgCtx.fillStyle = 'rgba(215,195,255,0.72)';
    bgCtx.beginPath();
    bgCtx.ellipse(-ws * 0.65, -ws * 0.18, ws * flap, ws * 0.72, -0.28, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.beginPath();
    bgCtx.ellipse( ws * 0.65, -ws * 0.18, ws * flap, ws * 0.72,  0.28, 0, Math.PI * 2);
    bgCtx.fill();

    bgCtx.fillStyle = 'rgba(175,145,245,0.52)';
    bgCtx.beginPath();
    bgCtx.ellipse(-ws * 0.40, ws * 0.30, ws * 0.60 * flap, ws * 0.46, -0.48, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.beginPath();
    bgCtx.ellipse( ws * 0.40, ws * 0.30, ws * 0.60 * flap, ws * 0.46,  0.48, 0, Math.PI * 2);
    bgCtx.fill();

    // Cuerpo
    bgCtx.fillStyle = 'rgba(85,65,145,0.88)';
    bgCtx.beginPath();
    bgCtx.ellipse(0, 0, 1.8, ws * 0.40, 0, 0, Math.PI * 2);
    bgCtx.fill();

    bgCtx.restore();
    if (ev.x > W + 90 || ev.frame >= ev.maxFrame) dailyEvent = null;
  }

  // Carta flotante — fragmento de texto que deriva por el cielo
  function drawLetter() {
    if (!dailyEvent || dailyEvent.type !== 'letter') return;
    const ev = dailyEvent;
    ev.frame++;
    ev.x += ev.speed;
    const prog = ev.frame / ev.maxFrame;
    ev.alpha   = prog < 0.12 ? prog / 0.12 : prog > 0.85 ? 1 - (prog - 0.85) / 0.15 : 1;

    bgCtx.save();
    bgCtx.globalAlpha  = ev.alpha * 0.35;
    bgCtx.font         = 'italic 13px Georgia, serif';
    bgCtx.fillStyle    = '#e8f2ff';
    bgCtx.shadowColor  = 'rgba(180,215,255,0.55)';
    bgCtx.shadowBlur   = 9;
    bgCtx.fillText(ev.text, ev.x, ev.y);
    bgCtx.restore();

    if (ev.frame >= ev.maxFrame) dailyEvent = null;
  }

  // Símbolo en nube — una nube se detiene y revela un ojo
  function drawCloudSymbol() {
    if (!dailyEvent || dailyEvent.type !== 'cloud-symbol') return;
    const ev    = dailyEvent;
    ev.frame++;
    const prog  = ev.frame / ev.maxFrame;
    ev.alpha    = prog < 0.15 ? prog / 0.15 : prog > 0.80 ? 1 - (prog - 0.80) / 0.20 : 1;

    const cloud = clouds[ev.cloudIdx];
    if (!cloud) { dailyEvent = null; return; }

    const pulse = 0.65 + 0.35 * Math.sin(t * 0.045);
    bgCtx.save();
    bgCtx.globalAlpha = ev.alpha * 0.60 * pulse;

    // Ojo: contorno + pupila
    bgCtx.strokeStyle = 'rgba(210,228,255,0.92)';
    bgCtx.lineWidth   = 1.3;
    bgCtx.beginPath();
    bgCtx.arc(cloud.px, cloud.py, 15, 0, Math.PI * 2);
    bgCtx.stroke();

    bgCtx.fillStyle = 'rgba(180,210,255,0.45)';
    bgCtx.beginPath();
    bgCtx.arc(cloud.px, cloud.py, 5.5, 0, Math.PI * 2);
    bgCtx.fill();

    // Detener la nube durante el evento
    if (ev.frame < ev.maxFrame - 80) cloud.px -= cloud.spd * (bgCanvas?.width ?? 1440);

    bgCtx.restore();
    if (ev.frame >= ev.maxFrame) dailyEvent = null;
  }

  // Arcoíris de memoria — aparece sin lluvia, por cambio de estado interno
  function drawMemoryRainbow(W, H) {
    if (!dailyEvent || dailyEvent.type !== 'memory-rainbow') return;
    const ev   = dailyEvent;
    ev.frame++;
    const prog = ev.frame / ev.maxFrame;
    ev.alpha   = prog < 0.15 ? prog / 0.15 : prog > 0.75 ? 1 - (prog - 0.75) / 0.25 : 1;

    const cx = W * 0.5, cy = H * 0.92;
    const bands = [
      { r: W*0.65, color:'255,80,80'  }, { r:W*0.59, color:'255,150,0'  },
      { r: W*0.53, color:'240,220,0'  }, { r:W*0.47, color:'80,200,80'  },
      { r: W*0.41, color:'60,150,255' }, { r:W*0.35, color:'130,70,230' },
      { r: W*0.29, color:'200,80,220' },
    ];
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (const b of bands) {
      bgCtx.beginPath();
      bgCtx.arc(cx, cy, b.r, Math.PI, Math.PI * 2);
      bgCtx.strokeStyle = `rgba(${b.color},${ev.alpha * 0.17})`;
      bgCtx.lineWidth   = W * 0.022;
      bgCtx.stroke();
    }
    bgCtx.restore();
    if (ev.frame >= ev.maxFrame) dailyEvent = null;
  }

  // ═══════════════════════════════════════════════════════════════
  //  EVENTOS RAROS
  // ═══════════════════════════════════════════════════════════════
  const RARE_TYPES = ['still-cloud', 'golden-bird', 'sky-crack', 'wrong-rainbow'];

  function generateCrack(sx, sy) {
    const pts = [{ x: sx, y: sy }];
    let x = sx, y = sy;
    for (let i = 0; i < 11; i++) {
      x += (Math.random() - 0.5) * 48;
      y += 16 + Math.random() * 20;
      pts.push({ x, y });
    }
    return pts;
  }

  function tryRareEvent(W, H) {
    rareCooldown--;
    if (rareCooldown > 0 || rareEvent?.active) return;
    if (Math.random() > RARE_CHANCE) { rareCooldown = 600; return; }

    const type = RARE_TYPES[Math.floor(Math.random() * RARE_TYPES.length)];
    rareCooldown = 1800;

    switch (type) {
      case 'still-cloud':
        rareEvent = { type, active:true, frame:0, maxFrame:450,
          cloudIdx: Math.floor(Math.random() * clouds.length) };
        break;
      case 'golden-bird':
        rareEvent = { type, active:true, frame:0, maxFrame:380, trail:[] };
        break;
      case 'sky-crack':
        rareEvent = { type, active:true, frame:0, maxFrame:220,
          points: generateCrack(W * 0.28 + Math.random() * W * 0.44, H * 0.06) };
        break;
      case 'wrong-rainbow':
        rareEvent = { type, active:true, frame:0, maxFrame:320 };
        break;
    }
  }

  function drawRareEvent(W, H) {
    if (!rareEvent?.active) return;
    rareEvent.frame++;
    const { type, frame, maxFrame } = rareEvent;
    const prog  = frame / maxFrame;
    const alpha = prog < 0.10 ? prog / 0.10 : prog > 0.85 ? 1 - (prog - 0.85) / 0.15 : 1;

    switch (type) {

      case 'still-cloud': {
        const c = clouds[rareEvent.cloudIdx];
        if (!c) break;
        const g = bgCtx.createRadialGradient(c.px, c.py, 0, c.px, c.py, 90 * c.sc);
        g.addColorStop(0, `rgba(230,245,255,${alpha * 0.24})`);
        g.addColorStop(1, `rgba(230,245,255,0)`);
        bgCtx.save();
        bgCtx.fillStyle = g;
        bgCtx.beginPath();
        bgCtx.arc(c.px, c.py, 90 * c.sc, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.restore();
        // Compensar el drift mientras está activo
        if (frame < maxFrame - 70) c.px -= c.spd * W;
        break;
      }

      case 'golden-bird': {
        const g = birdGroups[0];
        if (!g) break;
        rareEvent.trail.push({ x: g.x, y: g.y, a: 0.65 });
        if (rareEvent.trail.length > 65) rareEvent.trail.shift();
        bgCtx.save();
        for (let i = 0; i < rareEvent.trail.length; i++) {
          const pt = rareEvent.trail[i];
          pt.a    *= 0.982;
          bgCtx.fillStyle = `rgba(255,215,70,${pt.a * alpha})`;
          bgCtx.beginPath();
          bgCtx.arc(pt.x, pt.y, 1.2 + i * 0.07, 0, Math.PI * 2);
          bgCtx.fill();
        }
        bgCtx.restore();
        break;
      }

      case 'sky-crack': {
        bgCtx.save();
        bgCtx.globalAlpha = alpha;
        bgCtx.lineWidth   = 4;
        bgCtx.lineCap     = 'round';
        bgCtx.lineJoin    = 'round';

        // Oscuridad detrás de la grieta
        bgCtx.strokeStyle = 'rgba(6,3,18,0.88)';
        bgCtx.beginPath();
        bgCtx.moveTo(rareEvent.points[0].x, rareEvent.points[0].y);
        for (let i = 1; i < rareEvent.points.length; i++)
          bgCtx.lineTo(rareEvent.points[i].x, rareEvent.points[i].y);
        bgCtx.stroke();

        // Borde de luz que se escapa
        bgCtx.strokeStyle = 'rgba(160,195,255,0.30)';
        bgCtx.lineWidth   = 1.5;
        bgCtx.stroke();

        // Estrellas visibles a través
        bgCtx.fillStyle = `rgba(255,255,255,${alpha * 0.55})`;
        for (const pt of rareEvent.points) {
          if (Math.random() < 0.12) {
            bgCtx.beginPath();
            bgCtx.arc(pt.x + (Math.random()-0.5)*7, pt.y + (Math.random()-0.5)*3, 0.7, 0, Math.PI*2);
            bgCtx.fill();
          }
        }
        bgCtx.restore();
        break;
      }

      case 'wrong-rainbow': {
        // Arcoíris con colores desplazados — no pertenece al ciclo normal
        const cx = W * 0.5, cy = H * 0.92;
        const bands = [
          { r:W*0.60, color:'70,70,255'  }, { r:W*0.54, color:'0,190,210' },
          { r:W*0.48, color:'0,230,180'  }, { r:W*0.42, color:'90,255,90' },
          { r:W*0.36, color:'255,210,0'  }, { r:W*0.30, color:'255,80,0'  },
          { r:W*0.24, color:'210,0,90'   },
        ];
        bgCtx.save();
        bgCtx.globalCompositeOperation = 'screen';
        for (const b of bands) {
          bgCtx.beginPath();
          bgCtx.arc(cx, cy, b.r, Math.PI, Math.PI * 2);
          bgCtx.strokeStyle = `rgba(${b.color},${alpha * 0.15})`;
          bgCtx.lineWidth   = W * 0.020;
          bgCtx.stroke();
        }
        bgCtx.restore();
        break;
      }
    }

    if (frame >= maxFrame) rareEvent = { active: false };
  }

  // ═══════════════════════════════════════════════════════════════
  //  NUBES
  // ═══════════════════════════════════════════════════════════════
  // 6 morfologías de nube — cada instancia recibe una al azar
  const CLOUD_SHAPES = [
    // 0 — Cúmulo clásico
    [
      { dx:  0.00, dy:  0.00, rx: 1.00, ry: 0.74 },
      { dx: -0.80, dy:  0.22, rx: 0.75, ry: 0.58 },
      { dx:  0.80, dy:  0.22, rx: 0.75, ry: 0.58 },
      { dx: -0.42, dy: -0.38, rx: 0.65, ry: 0.50 },
      { dx:  0.42, dy: -0.38, rx: 0.65, ry: 0.50 },
      { dx: -1.30, dy:  0.38, rx: 0.50, ry: 0.40 },
      { dx:  1.30, dy:  0.38, rx: 0.50, ry: 0.40 },
      { dx:  0.00, dy: -0.60, rx: 0.44, ry: 0.36 },
    ],
    // 1 — Estrato: ancho, bajo y plano
    [
      { dx:  0.00, dy:  0.00, rx: 1.35, ry: 0.40 },
      { dx: -1.08, dy:  0.10, rx: 0.82, ry: 0.34 },
      { dx:  1.08, dy:  0.10, rx: 0.82, ry: 0.34 },
      { dx: -0.52, dy: -0.10, rx: 0.66, ry: 0.29 },
      { dx:  0.52, dy: -0.10, rx: 0.66, ry: 0.29 },
      { dx: -1.78, dy:  0.15, rx: 0.50, ry: 0.26 },
      { dx:  1.78, dy:  0.15, rx: 0.50, ry: 0.26 },
    ],
    // 2 — Cúmulo alto y dramático
    [
      { dx:  0.00, dy:  0.00, rx: 0.76, ry: 0.92 },
      { dx: -0.56, dy:  0.36, rx: 0.60, ry: 0.70 },
      { dx:  0.56, dy:  0.36, rx: 0.60, ry: 0.70 },
      { dx:  0.00, dy: -0.54, rx: 0.54, ry: 0.62 },
      { dx: -0.28, dy: -0.28, rx: 0.46, ry: 0.52 },
      { dx:  0.28, dy: -0.28, rx: 0.46, ry: 0.52 },
      { dx:  0.00, dy: -0.92, rx: 0.35, ry: 0.40 },
    ],
    // 3 — Pequeño y redondeado
    [
      { dx:  0.00, dy:  0.00, rx: 0.88, ry: 0.80 },
      { dx: -0.56, dy:  0.18, rx: 0.62, ry: 0.56 },
      { dx:  0.56, dy:  0.18, rx: 0.62, ry: 0.56 },
      { dx:  0.00, dy: -0.32, rx: 0.52, ry: 0.46 },
      { dx: -0.26, dy:  0.42, rx: 0.40, ry: 0.34 },
      { dx:  0.26, dy:  0.42, rx: 0.40, ry: 0.34 },
    ],
    // 4 — Alargado y estirado
    [
      { dx:  0.00, dy:  0.00, rx: 1.48, ry: 0.44 },
      { dx: -1.18, dy:  0.14, rx: 0.74, ry: 0.38 },
      { dx:  1.18, dy:  0.14, rx: 0.74, ry: 0.38 },
      { dx: -0.55, dy: -0.08, rx: 0.60, ry: 0.34 },
      { dx:  0.55, dy: -0.08, rx: 0.60, ry: 0.34 },
      { dx: -1.82, dy:  0.20, rx: 0.46, ry: 0.30 },
      { dx:  1.82, dy:  0.20, rx: 0.46, ry: 0.30 },
      { dx:  0.00, dy:  0.22, rx: 0.88, ry: 0.28 },
    ],
    // 5 — Cirrus: vaporoso, fino y etéreo
    [
      { dx:  0.00, dy:  0.00, rx: 1.18, ry: 0.30 },
      { dx: -0.92, dy:  0.06, rx: 0.76, ry: 0.24 },
      { dx:  0.92, dy:  0.06, rx: 0.76, ry: 0.24 },
      { dx: -1.62, dy:  0.10, rx: 0.48, ry: 0.18 },
      { dx:  1.62, dy:  0.10, rx: 0.48, ry: 0.18 },
      { dx:  0.22, dy: -0.10, rx: 0.56, ry: 0.20 },
      { dx: -0.42, dy: -0.08, rx: 0.40, ry: 0.18 },
    ],
  ];

  const CLOUD_DEFS = [
    { layer:0, fx:0.07, fy:0.13, sc:0.52, spd:5e-5 },
    { layer:0, fx:0.33, fy:0.07, sc:0.44, spd:4e-5 },
    { layer:0, fx:0.58, fy:0.17, sc:0.58, spd:6e-5 },
    { layer:0, fx:0.78, fy:0.10, sc:0.40, spd:4e-5 },
    { layer:0, fx:0.50, fy:0.04, sc:0.48, spd:5e-5 },
    { layer:1, fx:0.14, fy:0.27, sc:0.80, spd:1.1e-4 },
    { layer:1, fx:0.40, fy:0.31, sc:0.90, spd:9e-5  },
    { layer:1, fx:0.66, fy:0.24, sc:0.74, spd:1.2e-4 },
    { layer:1, fx:0.84, fy:0.29, sc:0.84, spd:8e-5  },
    { layer:1, fx:0.24, fy:0.21, sc:0.70, spd:1.3e-4 },
    { layer:2, fx:0.09, fy:0.50, sc:1.20, spd:2.2e-4 },
    { layer:2, fx:0.44, fy:0.55, sc:1.40, spd:1.8e-4 },
    { layer:2, fx:0.72, fy:0.47, sc:1.10, spd:2.0e-4 },
    { layer:2, fx:0.90, fy:0.58, sc:1.30, spd:2.5e-4 },
  ];

  function initClouds(W, H) {
    clouds = CLOUD_DEFS.map(d => ({
      ...d, px: d.fx * W, py: d.fy * H,
      breathPhase: Math.random() * Math.PI * 2,
      shapeIdx: Math.floor(Math.random() * CLOUD_SHAPES.length),
    }));
  }

  function drawCloudShape(ctx, cx, cy, R, tint, baseAlpha, puffs) {
    const pts = puffs || CLOUD_SHAPES[0];
    const wr = Math.min(255, 252 + Math.round(tint * 3));
    const wg = Math.min(255, 248 - Math.round(Math.max(0, tint) * 28));
    const wb = Math.min(255, 245 - Math.round(Math.max(0, tint) * 58));

    ctx.save();
    ctx.globalAlpha = (baseAlpha !== undefined ? baseAlpha : 1);

    ctx.fillStyle = `rgba(80,110,168,0.17)`;
    ctx.beginPath();
    for (const p of pts)
      ctx.ellipse(cx + p.dx*R, cy + p.dy*R + R*0.18, p.rx*R*1.06, p.ry*R*0.55, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = `rgb(${wr},${wg},${wb})`;
    ctx.beginPath();
    for (const p of pts)
      ctx.ellipse(cx + p.dx*R, cy + p.dy*R, p.rx*R, p.ry*R, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,0.66)`;
    ctx.beginPath();
    for (const p of pts) {
      if (p.dy <= 0)
        ctx.ellipse(cx + p.dx*R, cy + p.dy*R - R*0.09, p.rx*R*0.60, p.ry*R*0.42, 0, 0, Math.PI*2);
    }
    ctx.fill();
    ctx.restore();
  }

  function drawClouds(W, H, tint) {
    const ALPHAS    = [0.54, 0.78, 0.93];
    const densityMod = 1 + (1 - energy / 100) * 0.22;  // baja energía → nubes más densas

    for (const c of clouds) {
      c.px += c.spd * W;
      if (c.px > W + 220 * c.sc) c.px = -220 * c.sc;
      const breath = 1 + 0.018 * Math.sin(t * 0.005 + c.breathPhase);
      drawCloudShape(bgCtx, c.px, c.py, 58 * c.sc * breath, tint, ALPHAS[c.layer] * densityMod, CLOUD_SHAPES[c.shapeIdx]);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  SOL / LUNA
  // ═══════════════════════════════════════════════════════════════
  function drawCelestialBody(W, H, phase) {
    const { x, y } = getSunPos(phase, W, H);
    const isNight   = (phase % 1) >= 0.84;
    const tint      = getTint(phase);
    bgCtx.save();

    if (isNight) {
      const gm = bgCtx.createRadialGradient(x, y, 0, x, y, 70);
      gm.addColorStop(0, 'rgba(200,220,255,0.18)');
      gm.addColorStop(1, 'rgba(200,220,255,0)');
      bgCtx.fillStyle = gm;
      bgCtx.beginPath(); bgCtx.arc(x, y, 70, 0, Math.PI*2); bgCtx.fill();
      bgCtx.fillStyle = '#ddeeff';
      bgCtx.beginPath(); bgCtx.arc(x, y, 18, 0, Math.PI*2); bgCtx.fill();
    } else {
      const cr1 = tint > 0 ? '255,200,80' : '255,238,200';
      const cr2 = tint > 0 ? '255,160,40' : '255,220,160';
      const go  = bgCtx.createRadialGradient(x, y, 0, x, y, 130);
      go.addColorStop(0, `rgba(${cr1},0.22)`); go.addColorStop(1, `rgba(${cr1},0)`);
      bgCtx.fillStyle = go; bgCtx.beginPath(); bgCtx.arc(x, y, 130, 0, Math.PI*2); bgCtx.fill();
      const pulse = 1 + 0.04 * Math.sin(t * 0.025);
      const gc    = bgCtx.createRadialGradient(x, y, 18*pulse, x, y, 54*pulse);
      gc.addColorStop(0, `rgba(${cr2},0.88)`); gc.addColorStop(1, `rgba(${cr2},0)`);
      bgCtx.fillStyle = gc; bgCtx.beginPath(); bgCtx.arc(x, y, 54*pulse, 0, Math.PI*2); bgCtx.fill();
      bgCtx.fillStyle = tint > 0 ? '#fff8a0' : '#fffff5';
      bgCtx.beginPath(); bgCtx.arc(x, y, 22, 0, Math.PI*2); bgCtx.fill();
    }
    bgCtx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  RAYOS CREPUSCULARES
  // ═══════════════════════════════════════════════════════════════
  function drawGodRays(W, H, phase) {
    const p = phase % 1;
    if (p >= 0.80 && p < 0.99) return;
    const { x, y } = getSunPos(phase, W, H);
    const tint      = getTint(phase);
    const cr        = tint > 0 ? '255,200,100' : '255,240,220';
    const intensity = 0.045 + tint * 0.025;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 8; i++) {
      const ang    = (i / 8) * Math.PI * 2;
      const pulse  = intensity * (0.7 + 0.3 * Math.sin(t * 0.004 + i * 1.1));
      const len    = W * 0.70, sp = 0.10;
      const g = bgCtx.createLinearGradient(x, y, x + Math.cos(ang)*len, y + Math.sin(ang)*len);
      g.addColorStop(0, `rgba(${cr},${pulse})`);
      g.addColorStop(0.4, `rgba(${cr},${pulse * 0.35})`);
      g.addColorStop(1, `rgba(${cr},0)`);
      bgCtx.beginPath();
      bgCtx.moveTo(x, y);
      bgCtx.lineTo(x + Math.cos(ang-sp)*len, y + Math.sin(ang-sp)*len);
      bgCtx.lineTo(x + Math.cos(ang+sp)*len, y + Math.sin(ang+sp)*len);
      bgCtx.closePath();
      bgCtx.fillStyle = g; bgCtx.fill();
    }
    bgCtx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  ESTRELLAS
  // ═══════════════════════════════════════════════════════════════
  function initStars(W, H) {
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.55,
      r: 0.5 + Math.random() * 1.6, twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function drawStars(W, H, phase) {
    const p = phase % 1;
    let alpha = 0;
    if (p >= 0.82 && p < 0.92)  alpha = (p - 0.82) / 0.10;
    else if (p >= 0.92)          alpha = 1;
    else if (p < 0.04)           alpha = Math.max(0, 1 - p / 0.04);
    if (alpha <= 0) return;
    bgCtx.save();
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * 0.018 + s.twinkle);
      bgCtx.fillStyle = `rgba(255,255,255,${alpha * tw})`;
      bgCtx.beginPath(); bgCtx.arc(s.x, s.y, s.r, 0, Math.PI*2); bgCtx.fill();
    }
    bgCtx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  PÁJAROS — solo con suficiente energía (espacio emocional)
  // ═══════════════════════════════════════════════════════════════
  const FLOCK_DEFS = [
    { count:6, yFrac:0.11, spd:3.8e-4, size:5.0, dir: 1, flapHz:0.09 },
    { count:9, yFrac:0.19, spd:2.8e-4, size:3.5, dir:-1, flapHz:0.07 },
    { count:5, yFrac:0.07, spd:2.2e-4, size:3.0, dir: 1, flapHz:0.08 },
    { count:7, yFrac:0.15, spd:3.2e-4, size:4.5, dir:-1, flapHz:0.10 },
  ];

  function makeBird(i, size) {
    if (i === 0) return { dx:0, dy:0, fo:0 };
    const row = Math.ceil(i/2), side = i%2===1 ? -1 : 1;
    return { dx: side*row*size*4.2, dy: row*size*2.4, fo: row*0.18 + Math.random()*0.12 };
  }

  function initBirds(W, H) {
    birdGroups = FLOCK_DEFS.map(d => ({
      ...d,
      x:         d.dir > 0 ? Math.random()*W*1.5 - W*0.2 : W*0.2 + Math.random()*W*1.5,
      y:         d.yFrac * H,
      flapPhase: Math.random() * Math.PI * 2,
      birds:     Array.from({ length: d.count }, (_, i) => makeBird(i, d.size)),
    }));
  }

  function drawBirdWing(ctx, x, y, size, flap) {
    const wh = flap * size * 0.42;
    ctx.beginPath();
    ctx.moveTo(x - size, y + size * 0.12);
    ctx.quadraticCurveTo(x - size*0.45, y - wh, x, y);
    ctx.quadraticCurveTo(x + size*0.45, y - wh, x + size, y + size*0.12);
    ctx.stroke();
  }

  function drawBirds(W, H, phase) {
    const p = phase % 1;
    let phaseAlpha = 1;
    if (p >= 0.76 && p < 0.86)      phaseAlpha = 1 - (p - 0.76) / 0.10;
    else if (p >= 0.86 && p < 0.99) phaseAlpha = 0;
    else if (p < 0.04)              phaseAlpha = p / 0.04;

    // Los pájaros necesitan "espacio emocional" — energía mínima 25
    const energyAlpha = energy < 25 ? energy / 25 : 1;
    const alpha = phaseAlpha * energyAlpha;
    if (alpha <= 0) return;

    bgCtx.save();
    bgCtx.lineCap = 'round';
    const tint = getTint(phase);
    for (const g of birdGroups) {
      g.x += g.dir * g.spd * W;
      if (g.dir > 0  && g.x >  W + 300) g.x = -300;
      if (g.dir < 0  && g.x < -300)     g.x =  W + 300;
      const r  = Math.round(25  + Math.max(0, tint) * 80);
      const gC = Math.round(40  + Math.max(0, tint) * 40);
      const b  = Math.round(65  - Math.max(0, tint) * 40);
      bgCtx.strokeStyle = `rgba(${r},${gC},${b},${alpha * 0.80})`;
      for (const bird of g.birds) {
        const flap = Math.sin(t * g.flapHz + g.flapPhase + bird.fo);
        bgCtx.lineWidth = g.size * 0.30;
        drawBirdWing(bgCtx, g.x + bird.dx, g.y + bird.dy, g.size, flap);
      }
    }
    bgCtx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  LLUVIA
  // ═══════════════════════════════════════════════════════════════
  function initRain(W, H) {
    rainDrops = Array.from({ length: 200 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      len: 8+Math.random()*14, spd: 6+Math.random()*8,
      alpha: 0.25+Math.random()*0.35,
    }));
  }

  function drawRain(W, H, phase) {
    const p = phase % 1;
    let target = 0;
    if (p >= 0.86 && p < 0.93)      target = (p - 0.86) / 0.07;
    else if (p >= 0.93 && p < 0.99) target = 1;
    else if (p < 0.06)              target = Math.max(0, 1 - p / 0.06);
    rainAlpha += (target - rainAlpha) * 0.04;
    if (rainAlpha < 0.01) return;
    bgCtx.save();
    bgCtx.strokeStyle = 'rgba(180,210,255,1)';
    bgCtx.lineCap = 'round';
    for (const d of rainDrops) {
      d.y += d.spd; d.x -= d.spd * 0.15;
      if (d.y > H + 20) { d.y = -20; d.x = Math.random()*W; }
      if (d.x < -5) d.x = W + 5;
      bgCtx.globalAlpha = rainAlpha * d.alpha;
      bgCtx.lineWidth   = 0.8;
      bgCtx.beginPath(); bgCtx.moveTo(d.x, d.y); bgCtx.lineTo(d.x - d.len*0.15, d.y + d.len); bgCtx.stroke();
    }
    bgCtx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  ARCOÍRIS (ciclo normal)
  // ═══════════════════════════════════════════════════════════════
  function drawRainbow(W, H, phase) {
    const p = phase % 1;
    let alpha = 0;
    if (p >= 0.01 && p < 0.06)      alpha = (p - 0.01) / 0.05;
    else if (p >= 0.06 && p < 0.14) alpha = 1;
    else if (p >= 0.14 && p < 0.22) alpha = 1 - (p - 0.14) / 0.08;
    if (alpha <= 0.01) return;
    const cx = W*0.5, cy = H*0.92;
    const bands = [
      { r:W*0.72,color:'255,60,60' }, { r:W*0.66,color:'255,140,0' },
      { r:W*0.60,color:'255,230,0' }, { r:W*0.54,color:'60,200,60' },
      { r:W*0.48,color:'40,140,255'}, { r:W*0.42,color:'120,60,220'},
      { r:W*0.36,color:'200,60,220'},
    ];
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (const b of bands) {
      bgCtx.beginPath(); bgCtx.arc(cx, cy, b.r, Math.PI, Math.PI*2);
      bgCtx.strokeStyle = `rgba(${b.color},${alpha * 0.14})`;
      bgCtx.lineWidth   = W * 0.022; bgCtx.stroke();
    }
    bgCtx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  POLVO DE LUZ
  // ═══════════════════════════════════════════════════════════════
  function initDust(W, H) {
    dustMotes = Array.from({ length: 55 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: 0.9+Math.random()*2.1,
      vy: -0.14-Math.random()*0.24, vx: (Math.random()-0.5)*0.14,
      wavePhase: Math.random()*Math.PI*2, alpha: 0.28+Math.random()*0.38,
    }));
  }

  function drawDust(W, H) {
    bgCtx.save();
    for (const d of dustMotes) {
      d.y += d.vy; d.x += d.vx + 0.07*Math.sin(t*0.007+d.wavePhase);
      if (d.y < -5)  { d.y = H+5; d.x = Math.random()*W; }
      if (d.x < -5)  d.x = W+5;
      if (d.x > W+5) d.x = -5;
      const g = bgCtx.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r*2.2);
      g.addColorStop(0,`rgba(255,248,220,${d.alpha})`);
      g.addColorStop(1,`rgba(255,240,200,0)`);
      bgCtx.fillStyle=g; bgCtx.beginPath(); bgCtx.arc(d.x,d.y,d.r*2.2,0,Math.PI*2); bgCtx.fill();
    }
    bgCtx.restore();
  }

  // ═══════════════════════════════════════════════════════════════
  //  SPAWN PUFFS (nube que nace en el clic)
  // ═══════════════════════════════════════════════════════════════
  function spawnPuff(x, y) {
    spawnPuffs.push({ x, y, life:0, maxLife:100, shapeIdx: Math.floor(Math.random() * CLOUD_SHAPES.length) });
  }

  function drawSpawnPuffs(tint) {
    for (let i = spawnPuffs.length-1; i >= 0; i--) {
      const sp = spawnPuffs[i];
      sp.life++;
      const prog  = sp.life / sp.maxLife;
      const alpha = prog < 0.3 ? prog/0.3 : 1-(prog-0.3)/0.7;
      if (sp.life >= sp.maxLife) { spawnPuffs.splice(i,1); continue; }
      bgCtx.save();
      bgCtx.globalAlpha = alpha * 0.85;
      drawCloudShape(bgCtx, sp.x, sp.y, 58*prog*1.15, tint, undefined, CLOUD_SHAPES[sp.shapeIdx]);
      bgCtx.restore();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  CURSOR
  // ═══════════════════════════════════════════════════════════════
  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;
    trail.push({ x:mouseX, y:mouseY, a:0.55 });
    if (trail.length > 20) trail.shift();
    for (let i = 0; i < trail.length-1; i++) {
      const p = trail[i]; p.a *= 0.87;
      overCtx.beginPath(); overCtx.arc(p.x, p.y, 1.2+i*0.22, 0, Math.PI*2);
      overCtx.fillStyle = `rgba(255,255,255,${p.a})`; overCtx.fill();
    }
    const g = overCtx.createRadialGradient(mouseX, mouseY, 7, mouseX, mouseY, 24);
    g.addColorStop(0,   'rgba(255,255,255,0)');
    g.addColorStop(0.65,'rgba(210,235,255,0.22)');
    g.addColorStop(1,   'rgba(210,235,255,0)');
    overCtx.fillStyle = g; overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 24, 0, Math.PI*2); overCtx.fill();
  }

  // ═══════════════════════════════════════════════════════════════
  //  SKY
  // ═══════════════════════════════════════════════════════════════
  function drawSky(W, H, phase) {
    const { top, bot } = getSkyColors(phase);
    const g = bgCtx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,   top);
    g.addColorStop(0.7, bot);
    g.addColorStop(1,   bot);
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0, 0, W, H);

    // Silencio profundo: velo oscuro muy sutil
    if (silence > 0.35) {
      bgCtx.fillStyle = `rgba(0,0,0,${silence * 0.09})`;
      bgCtx.fillRect(0, 0, W, H);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  FRAME LOOP
  // ═══════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W     = bgCanvas.width, H = bgCanvas.height;
    const phase = (t % CYCLE) / CYCLE;
    const tint  = getTint(phase);

    updateEnergy();

    // Evento diario: se activa cuando la energía supera 65 por primera vez
    if (!dailyEventDone && energy >= 65) triggerDailyEvent(W, H);

    // Chequeo de eventos raros cada 600 frames
    if (t % 600 === 0) tryRareEvent(W, H);

    bgCtx.clearRect(0, 0, W, H);

    // ── Capas de renderizado ──
    drawSky(W, H, phase);
    drawStars(W, H, phase);
    drawGodRays(W, H, phase);
    drawCelestialBody(W, H, phase);
    drawMemoryLayer();
    drawClouds(W, H, tint);
    drawBirds(W, H, phase);
    drawRain(W, H, phase);
    drawRainbow(W, H, phase);
    drawSpawnPuffs(tint);
    drawDust(W, H);
    drawRareEvent(W, H);

    // Evento diario activo
    if (dailyEvent) {
      switch (dailyEvent.type) {
        case 'butterfly':      drawButterfly(W, H); break;
        case 'letter':         drawLetter();         break;
        case 'cloud-symbol':   drawCloudSymbol();    break;
        case 'memory-rainbow': drawMemoryRainbow(W, H); break;
      }
    }

    drawCursor(W, H);
    raf = requestAnimationFrame(frame);
  }

  // ═══════════════════════════════════════════════════════════════
  //  RESIZE
  // ═══════════════════════════════════════════════════════════════
  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width  = W; bgCanvas.height  = H;
    overCanvas.width = W; overCanvas.height = H;
    initClouds(W, H);
    initBirds(W, H);
    initRain(W, H);
    initDust(W, H);
    initStars(W, H);
  }

  // ═══════════════════════════════════════════════════════════════
  //  API
  // ═══════════════════════════════════════════════════════════════
  const CloudcoreRenderer = {
    start() {
      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-cc-bg';
      Object.assign(bgCanvas.style, {
        position:'fixed', inset:'0', width:'100%', height:'100%',
        zIndex:'-1', pointerEvents:'none',
      });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-cc-over';
      Object.assign(overCanvas.style, {
        position:'fixed', inset:'0', width:'100%', height:'100%',
        zIndex:'9998', pointerEvents:'none',
      });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();
      window.addEventListener('resize', resize);

      _onMove = e => {
        mouseX = e.clientX; mouseY = e.clientY;
        mouseIdle = 0;
        energy = Math.min(100, energy + 0.07);
      };
      _onClick = e => {
        spawnPuff(e.clientX, e.clientY);
        addMemory(e.clientX, e.clientY);
        energy    = Math.min(100, energy + 8);
        mouseIdle = 0;
      };
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
      rainDrops = []; rainAlpha = 0; memoryOrbs = []; trail = [];
      energy = 50; mouseIdle = 0; silence = 0;
      dailyEvent = null; dailyEventDone = false;
      rareEvent = null; rareCooldown = 900;
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };

  return CloudcoreRenderer;
})();

export { CloudcoreRenderer };
