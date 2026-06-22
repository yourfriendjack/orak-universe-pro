// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/vaporwave.js
//  Vaporwave — Estética Retro Digital
//
//  bgCanvas  (z:-1)   → cielo degradado, sol retro con scanlines,
//                        estrellas, grid 3D neon pulsante,
//                        palmeras en silueta, kanji flotantes,
//                        scanlines CRT globales
//
//  overCanvas (z:9998) → cursor con aberración cromática magenta/cyan
// ════════════════════════════════════════════════════════════════

const VaporwaveRenderer = (() => {

  let bgCanvas = null, bgCtx = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;

  // ── Textos flotantes ──────────────────────────────────────────
  const WORDS = [
    '夢', '未来', '愛', '空', '星', '海', '光', '風', '月', '花',
    'DREAM', 'LOST', 'MIAMI', '1 9 8 4', 'FEEL', 'W A V E',
    'FOREVER', 'NULL', 'A E S T H E T I C', '세계',
  ];

  // ── Estado ────────────────────────────────────────────────────
  let floaters   = null;
  let stars      = null;
  let speedLines = [];
  let spawnTimer = 0;
  const SPAWN_INTERVAL = 130;  // frames entre cada par de faros

  // ── Cursor ────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let _onMove = null, _onClick = null;
  const trail  = [];
  const blooms = [];

  // ════════════════════════════════════════════════════════════════
  //  Init
  // ════════════════════════════════════════════════════════════════
  function initStars(W, H) {
    const vpY = H * 0.48;
    stars = Array.from({ length: 130 }, () => ({
      x:       Math.random() * W,
      y:       Math.random() * vpY * 0.88,
      r:       0.5 + Math.random() * 1.6,
      a:       0.35 + Math.random() * 0.65,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  function spawnFloater(W, H) {
    return {
      text:    WORDS[Math.floor(Math.random() * WORDS.length)],
      x:       W * (0.06 + Math.random() * 0.88),
      y:       H * (0.08 + Math.random() * 0.72),
      alpha:   0,
      size:    10 + Math.floor(Math.random() * 16),
      phase:   'fadein',
      life:    0,
      maxLife: 150 + Math.floor(Math.random() * 210),
      vy:      -0.10 - Math.random() * 0.12,
      cyan:    Math.random() < 0.5,
    };
  }

  function initFloaters(W, H) {
    floaters = Array.from({ length: 9 }, () => spawnFloater(W, H));
    floaters.forEach((f, i) => { f.life = Math.floor(i * 42); });
  }

  function initSpeedLines() {
    speedLines = [];
    spawnTimer = 0;
  }

  function spawnPair() {
    // Un par: faro izquierdo y derecho, angostos y juntos
    const laneF = 0.065 + Math.random() * 0.030;
    const spd   = 0.0045 + Math.random() * 0.0035;
    [-1, 1].forEach(side => {
      speedLines.push({
        tHead:  1.0,          // nace en la base
        spd,
        side,
        laneF,
        alpha:  1.0,
        fading: false,
      });
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Cielo degradado vaporwave
  // ════════════════════════════════════════════════════════════════
  function drawSky(W, H) {
    const vpY = H * 0.48;

    const sky = bgCtx.createLinearGradient(0, 0, 0, vpY);
    sky.addColorStop(0,    '#08001a');
    sky.addColorStop(0.28, '#180030');
    sky.addColorStop(0.55, '#5a0f88');
    sky.addColorStop(0.80, '#c0107a');
    sky.addColorStop(1,    '#ff3a98');
    bgCtx.fillStyle = sky;
    bgCtx.fillRect(0, 0, W, vpY);

    // Suelo oscuro bajo el grid
    bgCtx.fillStyle = '#08001a';
    bgCtx.fillRect(0, vpY, W, H - vpY);
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Sol retro con scanlines horizontales
  // ════════════════════════════════════════════════════════════════
  function drawSun(W, H) {
    const vpY = H * 0.48;
    const cx  = W * 0.50;
    const r   = H * 0.185;

    bgCtx.save();

    // Halo exterior
    const halo = bgCtx.createRadialGradient(cx, vpY, r * 0.5, cx, vpY, r * 2.6);
    halo.addColorStop(0,   'rgba(255,80,180,0.28)');
    halo.addColorStop(0.45,'rgba(200,40,140,0.10)');
    halo.addColorStop(1,   'rgba(0,0,0,0)');
    bgCtx.fillStyle = halo;
    bgCtx.fillRect(cx - r*3, vpY - r*3, r*6, r*6);

    // Solo la mitad superior visible
    bgCtx.beginPath();
    bgCtx.rect(0, 0, W, vpY + 2);
    bgCtx.clip();

    // Cuerpo del sol con gradiente
    const sunG = bgCtx.createLinearGradient(cx, vpY - r, cx, vpY);
    sunG.addColorStop(0,    '#ff5ec8');
    sunG.addColorStop(0.30, '#ff2288');
    sunG.addColorStop(0.65, '#ff7a00');
    sunG.addColorStop(1,    '#ffdd00');
    bgCtx.beginPath();
    bgCtx.arc(cx, vpY, r, 0, Math.PI * 2);
    bgCtx.fillStyle = sunG;
    bgCtx.fill();

    // Scanlines que cortan el sol (franjas oscuras)
    const lines = 11;
    for (let i = 0; i < lines; i++) {
      const prog = i / lines;
      const ly   = (vpY - r) + (r * prog);
      const gap  = (r / lines) * 0.42;
      // Las franjas son más delgadas arriba, más gruesas abajo
      const thickness = gap * (0.5 + prog * 0.8);
      bgCtx.fillStyle = 'rgba(8,0,26,0.82)';
      bgCtx.fillRect(cx - r, ly + gap, r * 2, thickness);
    }

    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Estrellas parpadeantes
  // ════════════════════════════════════════════════════════════════
  function drawStars(W, H) {
    if (!stars) return;
    stars.forEach(s => {
      const tw = 0.5 + 0.5 * Math.sin(t * 0.038 + s.twinkle);
      bgCtx.beginPath();
      bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(255,210,255,${s.a * tw})`;
      bgCtx.fill();
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Grid 3D neon con líneas pulsantes
  // ════════════════════════════════════════════════════════════════
  function drawGrid(W, H) {
    const vpX = W * 0.50;
    const vpY = H * 0.48;
    const botY = H;
    const numV = 22;
    const numH = 14;

    bgCtx.save();

    // Líneas verticales convergentes
    for (let i = 0; i <= numV; i++) {
      const bx = (i / numV) * W;
      const tt = Math.abs(i / numV - 0.5) * 2;  // 0 centro, 1 bordes
      const isCyan = (i % 5 === 0);
      const col  = isCyan ? '0,255,240' : '255,0,210';
      const a    = 0.08 + (1 - tt) * 0.14;
      bgCtx.strokeStyle = `rgba(${col},${a})`;
      bgCtx.lineWidth   = isCyan ? 0.9 : 0.55;
      bgCtx.beginPath();
      bgCtx.moveTo(vpX, vpY);
      bgCtx.lineTo(bx, botY);
      bgCtx.stroke();
    }

    // Líneas horizontales en perspectiva con pulso de movimiento
    for (let j = 1; j <= numH; j++) {
      const p    = Math.pow(j / numH, 1.55);
      const y    = vpY + (botY - vpY) * p;
      const prog = (y - vpY) / (botY - vpY);

      // Pulso: cada línea brilla cuando el "avance" llega a ella
      const wave  = ((t * 1.0 + j * 5.5) % 80) / 80;
      const glow  = Math.pow(Math.max(0, 1 - wave * 2.5), 2.5);
      const baseA = 0.07 + prog * 0.20;
      const a     = Math.min(1, baseA + glow * 0.50);
      const col   = prog > 0.45 ? '0,255,240' : '255,0,210';

      bgCtx.strokeStyle = `rgba(${col},${a})`;
      bgCtx.lineWidth   = 0.5 + prog * 1.0 + glow * 1.2;
      bgCtx.beginPath();
      bgCtx.moveTo(0, y); bgCtx.lineTo(W, y); bgCtx.stroke();
    }

    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Palmeras en silueta
  // ════════════════════════════════════════════════════════════════
  function _drawPalm(cx, baseY, h, leanDir) {
    bgCtx.save();
    bgCtx.fillStyle = 'rgba(4,0,14,0.96)';

    const tipX = cx + leanDir * h * 0.10;
    const tipY = baseY - h;

    // Tronco curvo
    bgCtx.beginPath();
    bgCtx.moveTo(cx - h*0.022, baseY);
    bgCtx.quadraticCurveTo(cx + leanDir*h*0.07, baseY - h*0.5, tipX - h*0.010, tipY);
    bgCtx.lineTo(tipX + h*0.010, tipY);
    bgCtx.quadraticCurveTo(cx + leanDir*h*0.09, baseY - h*0.5, cx + h*0.022, baseY);
    bgCtx.closePath();
    bgCtx.fill();

    // Hojas: ángulos desde la punta
    const LEAVES = [
      { deg: -115, len: 0.56 }, { deg: -80,  len: 0.62 },
      { deg: -48,  len: 0.58 }, { deg: -18,  len: 0.52 },
      { deg:  15,  len: 0.50 }, { deg:  50,  len: 0.52 },
      { deg: 148,  len: 0.48 }, { deg: 118,  len: 0.52 },
    ];

    LEAVES.forEach(l => {
      const rad = l.deg * Math.PI / 180;
      const len = h * l.len;
      const ex  = tipX + Math.cos(rad) * len;
      const ey  = tipY + Math.sin(rad) * len;
      // Control point: curva colgante por gravedad
      const cpx = tipX + Math.cos(rad) * len * 0.48;
      const cpy = tipY + Math.sin(rad) * len * 0.48 + len * 0.22;

      bgCtx.beginPath();
      bgCtx.moveTo(tipX, tipY);
      bgCtx.quadraticCurveTo(cpx, cpy, ex, ey);
      bgCtx.quadraticCurveTo(cpx + h*0.012, cpy + h*0.008, tipX, tipY);
      bgCtx.closePath();
      bgCtx.fill();
    });

    bgCtx.restore();
  }

  function drawPalms(W, H) {
    const vpY = H * 0.48;
    _drawPalm(W * 0.06,  vpY + H*0.05, H * 0.38, -1);
    _drawPalm(W * 0.155, vpY + H*0.02, H * 0.27, -1);
    _drawPalm(W * 0.94,  vpY + H*0.05, H * 0.36,  1);
    _drawPalm(W * 0.845, vpY + H*0.02, H * 0.26,  1);
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Faros traseros: un par cada cierto tiempo, con estela
  // ════════════════════════════════════════════════════════════════
  function drawSpeedLines(W, H) {
    const vpX = W * 0.50, vpY = H * 0.48;

    // Spawner: un par cada SPAWN_INTERVAL frames
    spawnTimer++;
    if (spawnTimer >= SPAWN_INTERVAL) {
      spawnPair();
      spawnTimer = 0;
    }

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    bgCtx.lineCap = 'round';

    for (let i = speedLines.length - 1; i >= 0; i--) {
      const sl = speedLines[i];

      // Avanzar hacia el horizonte (acelera cuanto más se acerca)
      sl.tHead -= sl.spd * (0.6 + (1 - sl.tHead) * 1.2);

      // Empezar a desvanecer cuando cruza el horizonte
      if (sl.tHead <= 0.12) sl.fading = true;
      if (sl.fading) sl.alpha -= 0.022;
      if (sl.alpha <= 0) { speedLines.splice(i, 1); continue; }

      // Posición de la cabeza del faro
      const yHead = vpY + (H - vpY) * sl.tHead;
      const xHead = vpX + sl.side * sl.laneF * W * sl.tHead;

      // La estela va desde la cabeza hasta un punto más abajo (donde estuvo)
      const tTail  = Math.min(1.0, sl.tHead + 0.40);
      const yTail  = vpY + (H - vpY) * tTail;
      const xTail  = vpX + sl.side * sl.laneF * W * tTail;

      // Grosor: fino y angosto, escala suave con perspectiva
      const lw = 0.7 + sl.tHead * 1.8;

      // ── Estela con gradiente: brillante en la cabeza, transparente en la cola ──
      const grad = bgCtx.createLinearGradient(xHead, yHead, xTail, yTail);
      grad.addColorStop(0,   `rgba(255,80,160,${sl.alpha * 0.90})`);
      grad.addColorStop(0.3, `rgba(255,20,80,${sl.alpha * 0.55})`);
      grad.addColorStop(0.7, `rgba(200,0,60,${sl.alpha * 0.18})`);
      grad.addColorStop(1,   `rgba(180,0,40,0)`);

      // Glow exterior suave
      bgCtx.beginPath();
      bgCtx.moveTo(xHead, yHead); bgCtx.lineTo(xTail, yTail);
      bgCtx.strokeStyle = `rgba(255,40,100,${sl.alpha * 0.14})`;
      bgCtx.lineWidth = lw * 7;
      bgCtx.stroke();

      // Core con gradiente
      bgCtx.beginPath();
      bgCtx.moveTo(xHead, yHead); bgCtx.lineTo(xTail, yTail);
      bgCtx.strokeStyle = grad;
      bgCtx.lineWidth = lw;
      bgCtx.stroke();

      // Punto de luz brillante en la cabeza
      bgCtx.beginPath();
      bgCtx.arc(xHead, yHead, lw * 1.8, 0, Math.PI * 2);
      const ptGrad = bgCtx.createRadialGradient(xHead, yHead, 0, xHead, yHead, lw * 3.5);
      ptGrad.addColorStop(0, `rgba(255,200,230,${sl.alpha})`);
      ptGrad.addColorStop(1, `rgba(255,0,80,0)`);
      bgCtx.fillStyle = ptGrad;
      bgCtx.fill();
    }

    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Scanlines CRT globales
  // ════════════════════════════════════════════════════════════════
  function drawScanlines(W, H) {
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'multiply';
    for (let y = 0; y < H; y += 4) {
      bgCtx.fillStyle = 'rgba(0,0,0,0.13)';
      bgCtx.fillRect(0, y, W, 1.5);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Kanji y palabras vaporwave flotantes
  // ════════════════════════════════════════════════════════════════
  function drawFloaters(W, H) {
    if (!floaters) return;
    floaters.forEach((f, i) => {
      f.life++;
      f.y += f.vy;

      if      (f.phase === 'fadein')  { f.alpha = Math.min(0.52, f.alpha + 0.007); if (f.life >= 50) f.phase = 'hold'; }
      else if (f.phase === 'hold')    { if (f.life >= f.maxLife) f.phase = 'fadeout'; }
      else if (f.phase === 'fadeout') { f.alpha = Math.max(0, f.alpha - 0.006); if (f.alpha <= 0) { floaters[i] = spawnFloater(W, H); return; } }

      bgCtx.save();
      bgCtx.font      = `${f.size}px monospace`;
      bgCtx.textAlign = 'center';
      bgCtx.fillStyle = f.cyan
        ? `rgba(0,235,255,${f.alpha})`
        : `rgba(255,0,200,${f.alpha})`;
      bgCtx.fillText(f.text, f.x, f.y);
      bgCtx.restore();
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Bloom de clic
  // ════════════════════════════════════════════════════════════════
  function spawnBloom(x, y) {
    blooms.push({ x, y, life: 1.0 });
  }

  function drawBlooms() {
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i], prog = 1 - b.life;
      bgCtx.save();
      bgCtx.globalCompositeOperation = 'screen';
      [['255,0,200', 0], ['0,235,255', 0.06], ['255,180,255', 0.12]].forEach(([col, off]) => {
        const rp = Math.max(0, prog - off);
        const rA = Math.max(0, (b.life - off) * 0.48);
        bgCtx.beginPath();
        bgCtx.arc(b.x, b.y, rp * 60, 0, Math.PI * 2);
        bgCtx.strokeStyle = `rgba(${col},${rA})`;
        bgCtx.lineWidth = 1.2; bgCtx.stroke();
      });
      bgCtx.restore();
      b.life -= 0.018;
      if (b.life <= 0) blooms.splice(i, 1);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor con aberración cromática magenta/cyan
  // ════════════════════════════════════════════════════════════════
  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    const breathe = 0.5 + 0.5 * Math.sin(t * 0.026);
    const r = 12 + breathe * 4;

    // Halo magenta
    const halo = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 52);
    halo.addColorStop(0, 'rgba(255,0,200,0.060)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    overCtx.fillStyle = halo;
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 52, 0, Math.PI * 2); overCtx.fill();

    // Ring magenta — offset izquierda
    overCtx.beginPath(); overCtx.arc(mouseX - 2.5, mouseY, r, 0, Math.PI * 2);
    overCtx.strokeStyle = `rgba(255,0,200,${0.58 + breathe * 0.22})`;
    overCtx.lineWidth = 1.1; overCtx.stroke();

    // Ring cyan — offset derecha
    overCtx.beginPath(); overCtx.arc(mouseX + 2.5, mouseY, r, 0, Math.PI * 2);
    overCtx.strokeStyle = `rgba(0,235,255,${0.58 + breathe * 0.22})`;
    overCtx.lineWidth = 1.1; overCtx.stroke();

    // Ring interior blanco
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, r * 0.48, 0, Math.PI * 2);
    overCtx.strokeStyle = `rgba(255,220,255,${0.30 + breathe * 0.15})`;
    overCtx.lineWidth = 0.7; overCtx.stroke();

    // Punto central
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 1.6, 0, Math.PI * 2);
    overCtx.fillStyle = 'rgba(255,255,255,0.92)'; overCtx.fill();

    // Trail cromático alternando magenta/cyan
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const isCyan = i % 2 === 0;
      overCtx.beginPath();
      overCtx.arc(p.x + (isCyan ? 1.5 : -1.5), p.y, 2.8, 0, Math.PI * 2);
      overCtx.fillStyle = isCyan
        ? `rgba(0,235,255,${p.alpha})`
        : `rgba(255,0,200,${p.alpha})`;
      overCtx.fill();
      p.alpha -= 0.014;
      if (p.alpha <= 0) trail.splice(i, 1);
    }

    overCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  Loop principal
  // ════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W = bgCanvas.width, H = bgCanvas.height;
    bgCtx.clearRect(0, 0, W, H);

    drawSky(W, H);
    drawStars(W, H);
    drawSun(W, H);
    drawGrid(W, H);
    drawSpeedLines(W, H);
    drawPalms(W, H);
    drawFloaters(W, H);
    drawScanlines(W, H);
    drawBlooms();

    drawCursor(W, H);
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width = W; bgCanvas.height = H;
    overCanvas.width = W; overCanvas.height = H;
    initStars(W, H);
    initFloaters(W, H);
    initSpeedLines();
  }

  // ════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-vw-bg';
      Object.assign(bgCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'-1' });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-vw-over';
      Object.assign(overCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'9998' });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      _onMove = (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        trail.push({ x: mouseX, y: mouseY, alpha: 0.42 });
        if (trail.length > 20) trail.shift();
      };
      _onClick = (e) => spawnBloom(e.clientX, e.clientY);

      document.addEventListener('mousemove',  _onMove,  { passive: true });
      document.addEventListener('click',      _onClick);
      document.addEventListener('mouseleave', () => { mouseX = -999; mouseY = -999; });
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
      floaters = stars = null;
      speedLines.length = 0;
      spawnTimer = 0;
      trail.length = blooms.length = 0;
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };
})();

export { VaporwaveRenderer };
