// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/weirdcore.js
//  Weirdcore — El Lugar Que Ya Conoces
//
//  bgCanvas  (z:-1)   → suelo en perspectiva con cuadrícula que
//                        converge en un punto de fuga, puertas
//                        flotantes que se abren lentamente, ojos
//                        que aparecen y te observan, fragmentos de
//                        texto que emergen del vacío, grano de
//                        película analógica, distorsiones VHS
//
//  overCanvas (z:9998) → cursor: círculo pálido con trail de letras
//                        que se desintegran
//
//  Interactividad:
//   · Clic → ondas concéntricas + texto "YOU WERE HERE" que aparece
// ════════════════════════════════════════════════════════════════

const WeirdcoreRenderer = (() => {

  let bgCanvas = null, bgCtx = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;

  // ── Fragmentos de texto del vacío ───────────────────────────────────────
  const POOL = [
    'DO YOU REMEMBER THIS PLACE', 'YOU\'VE BEEN HERE BEFORE',
    'WHERE ARE YOU GOING',        'COME BACK',
    'DO YOU HEAR THAT',           'I REMEMBER YOU',
    'EXIT →',                     '← WRONG WAY',
    'HELLO?',                     'PLEASE',
    'WAIT',                       '3:47 AM',
    '1994',                       'ROOM 209',
    'ARE YOU AWAKE',              'DON\'T LOOK BACK',
    'YOU CAN LEAVE NOW',          'WHY ARE YOU STILL HERE',
    'SOMETHING IS WRONG',         'IT\'S OKAY',
    'SIGNAL LOST',                'YOU KNOW THIS PLACE',
    'MISSING',                    'STAY',
    'NULL',                       'FLOOR -2',
    'SECTOR 7',                   '43.2°N  79.4°W',
    'THIS IS FINE',               'BLINK',
  ];

  // ── Colores del piso pastel ──────────────────────────────────────────────
  const FLOOR_COLS = [
    [255, 182, 205],   // rosa
    [168, 230, 190],   // menta verde
    [255, 236, 158],   // amarillo
    [195, 178, 238],   // lavanda
  ];

  // ── Estado global ────────────────────────────────────────────────────────
  let windows     = null;
  let eyes        = null;
  let frags       = null;
  let silhouettes = null;
  let polaroids   = null;

  // ── Cursor ───────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastTrailT = 0, _onMove = null, _onClick = null;
  const letterTrail   = [];
  const cursorHistory = [];   // posiciones con delay para el reflejo

  // ── Blooms de clic ───────────────────────────────────────────────────────
  const blooms = [];

  // ── Próxima distorsión VHS ───────────────────────────────────────────────
  let nextVHS = 120 + Math.floor(Math.random() * 200);

  const ALPHA_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?!@#';

  // ════════════════════════════════════════════════════════════════════════
  //  Init
  // ════════════════════════════════════════════════════════════════════════
  function initWindows(W, H) {
    // Colores de luz exterior por ventana (pasteles)
    const GLOW_COLS = ['255,240,200', '255,200,225', '190,240,210', '210,200,255', '255,230,170'];
    // Posiciones dispersas por toda la pantalla (no en fila)
    const POS = [
      [0.13, 0.10], [0.78, 0.07], [0.40, 0.36],
      [0.88, 0.48], [0.20, 0.58], [0.62, 0.20],
    ];
    windows = Array.from({ length: 6 }, (_, i) => {
      const scale = 0.07 + (i * 0.053 % 1.0) * 0.10;
      const winH  = scale * H;
      const winW  = winH * 1.65;   // ventana más ancha que alta
      return {
        x:        POS[i][0] * W,
        y:        POS[i][1] * H,
        winW, winH,
        vx:       Math.sin(i * 1.73) * 0.016,
        vy:       Math.cos(i * 2.51) * 0.010,
        fog:      1.0,          // 1=completamente empañada, 0=transparente
        phase:    'fogged',     // fogged / clearing / clear / fogging
        timer:    80 + Math.floor((i * 173.7) % 280),
        holdMax:  120 + Math.floor((i * 211.3) % 180),
        holdCount:0,
        glowR:    GLOW_COLS[i % GLOW_COLS.length],
      };
    });
  }

  function initEyes(W, H) {
    eyes = Array.from({ length: 4 }, (_, i) => ({
      x:       (i * 0.27 + 0.12) * W,
      y:       (0.12 + (i * 0.17 % 1.0) * 0.55) * H,
      size:    16 + (i * 13.7 % 1.0) * 24,
      open:    0,
      alpha:   0,
      phase:   'dormant',   // dormant / appearing / open / closing / gone
      timer:   80 + Math.floor((i * 293.1) % 400),
      iris:    i % 3 === 0 ? '140,100,180' : '160,120,190',
    }));
  }

  function spawnFrag(W, H) {
    const text  = POOL[Math.floor(Math.random() * POOL.length)];
    const size  = 9 + Math.floor(Math.random() * 7);
    return {
      text,
      x:       W * (0.06 + Math.random() * 0.88),
      y:       H * (0.06 + Math.random() * 0.80),
      alpha:   0,
      size,
      phase:   'fadein',
      life:    0,
      maxLife: 140 + Math.floor(Math.random() * 180),
      drift:   (Math.random() - 0.5) * 0.018,
    };
  }

  function initFrags(W, H) {
    frags = Array.from({ length: 6 }, () => spawnFrag(W, H));
    // Offset starting phases so they don't all fade in at once
    frags.forEach((f, i) => { f.life = Math.floor(i * 55); });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Vacío abisal: gradiente de sala olvidada
  // ════════════════════════════════════════════════════════════════════════
  function drawBackground(W, H) {
    // Base void
    bgCtx.fillStyle = 'rgba(15,12,30,1)';
    bgCtx.fillRect(0, 0, W, H);

    // Fuente de luz invisible en el centro — como si hubiera una bombilla
    // que no puedes ver pero sientes
    const cx = W * 0.5, cy = H * 0.42;
    const ambient = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.75);
    ambient.addColorStop(0,   'rgba(220,200,240,0.030)');
    ambient.addColorStop(0.4, 'rgba(180,160,220,0.010)');
    ambient.addColorStop(1,   'rgba(0,0,0,0)');
    bgCtx.fillStyle = ambient;
    bgCtx.fillRect(0, 0, W, H);

    // Viñeta de habitación — bordes más oscuros
    const vignette = bgCtx.createRadialGradient(cx, cy, H * 0.20, cx, cy, H * 1.05);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(5,3,12,0.72)');
    bgCtx.fillStyle = vignette;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Suelo en perspectiva con cuadrícula ajedrezada
  // ════════════════════════════════════════════════════════════════════════
  function drawFloorGrid(W, H) {
    const vpX    = W * 0.50;
    const vpY    = H * 0.50;   // línea del horizonte
    const botY   = H;
    const numV   = 24;         // líneas verticales
    const numH   = 16;         // filas horizontales

    bgCtx.save();

    // Gradiente del suelo
    const fg = bgCtx.createLinearGradient(0, vpY, 0, botY);
    fg.addColorStop(0,   'rgba(190,170,220,0.00)');
    fg.addColorStop(0.5, 'rgba(190,170,220,0.015)');
    fg.addColorStop(1,   'rgba(190,170,220,0.045)');
    bgCtx.fillStyle = fg;
    bgCtx.fillRect(0, vpY, W, botY - vpY);

    // Cuadrícula ajedrezada en perspectiva
    for (let row = 0; row < numH - 1; row++) {
      const p1 = Math.pow((row)     / numH, 1.8);
      const p2 = Math.pow((row + 1) / numH, 1.8);
      const y1 = vpY + (botY - vpY) * p1;
      const y2 = vpY + (botY - vpY) * p2;
      const t1 = (y1 - vpY) / (botY - vpY);
      const t2 = (y2 - vpY) / (botY - vpY);

      for (let col = 0; col < numV; col++) {
        if ((row + col) % 2 !== 0) continue;
        const bxL  = (col       / numV) * W;
        const bxR  = ((col + 1) / numV) * W;
        const x1l  = vpX + (bxL - vpX) * t1;
        const x1r  = vpX + (bxR - vpX) * t1;
        const x2l  = vpX + (bxL - vpX) * t2;
        const x2r  = vpX + (bxR - vpX) * t2;
        const fill = 0.025 + t2 * 0.065;

        const ci = ((row + col) / 2 | 0) % 4;
        const [cr, cg, cb] = FLOOR_COLS[ci];
        bgCtx.beginPath();
        bgCtx.moveTo(x1l, y1); bgCtx.lineTo(x1r, y1);
        bgCtx.lineTo(x2r, y2); bgCtx.lineTo(x2l, y2);
        bgCtx.closePath();
        bgCtx.fillStyle = `rgba(${cr},${cg},${cb},${fill})`;
        bgCtx.fill();
      }
    }

    // Líneas de cuadrícula — verticales (convergentes al VP)
    bgCtx.lineWidth = 0.5;
    for (let i = 0; i <= numV; i++) {
      const bx = (i / numV) * W;
      const t  = (i / numV);
      const a  = 0.06 + (1 - Math.abs(t - 0.5) * 2) * 0.04;
      bgCtx.strokeStyle = `rgba(205,185,230,${a})`;
      bgCtx.beginPath();
      bgCtx.moveTo(vpX, vpY);
      bgCtx.lineTo(bx, botY);
      bgCtx.stroke();
    }

    // Líneas de cuadrícula — horizontales (perspectiva logarítmica)
    for (let j = 1; j < numH; j++) {
      const p = Math.pow(j / numH, 1.8);
      const y = vpY + (botY - vpY) * p;
      const a = 0.04 + p * 0.09;
      bgCtx.strokeStyle = `rgba(205,185,230,${a})`;
      bgCtx.beginPath();
      bgCtx.moveTo(0, y); bgCtx.lineTo(W, y); bgCtx.stroke();
    }

    // Línea del horizonte — casi invisible pero está
    bgCtx.strokeStyle = 'rgba(210,190,240,0.08)';
    bgCtx.lineWidth = 0.8;
    bgCtx.beginPath(); bgCtx.moveTo(0, vpY); bgCtx.lineTo(W, vpY); bgCtx.stroke();

    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Ventanas flotantes que se empañan y desempañan
  // ════════════════════════════════════════════════════════════════════════
  function drawWindows(W, H) {
    if (!windows) return;
    windows.forEach(w => {
      // Flotación
      w.x += w.vx; w.y += w.vy;
      if (w.x < -w.winW)      w.x = W + w.winW;
      if (w.x > W + w.winW)   w.x = -w.winW;
      if (w.y < -w.winH * 0.5)        w.vy =  Math.abs(w.vy);
      if (w.y + w.winH > H * 0.88)    w.vy = -Math.abs(w.vy);

      // Máquina de estado: niebla que se despeja y vuelve
      w.timer--;
      if (w.phase === 'fogged' && w.timer <= 0) {
        w.phase = 'clearing';
      } else if (w.phase === 'clearing') {
        w.fog = Math.max(0, w.fog - 0.007);
        if (w.fog <= 0) { w.phase = 'clear'; w.holdCount = 0; }
      } else if (w.phase === 'clear') {
        w.holdCount++;
        if (w.holdCount >= w.holdMax) w.phase = 'fogging';
      } else if (w.phase === 'fogging') {
        w.fog = Math.min(1, w.fog + 0.005);
        if (w.fog >= 1) {
          w.phase = 'fogged';
          w.timer = 100 + Math.floor(Math.random() * 320);
        }
      }

      const { x, y, winW, winH, fog, glowR } = w;
      const cx  = x, cy = y + winH * 0.5;
      const clarity = 1 - fog;

      bgCtx.save();

      // Halo exterior pastel — luz del otro lado
      if (clarity > 0.05) {
        const glow = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, winW * 1.8);
        glow.addColorStop(0,   `rgba(${glowR},${0.18 * clarity})`);
        glow.addColorStop(0.5, `rgba(${glowR},${0.07 * clarity})`);
        glow.addColorStop(1,   'rgba(0,0,0,0)');
        bgCtx.fillStyle = glow;
        bgCtx.fillRect(cx - winW * 2, cy - winH * 1.6, winW * 4, winH * 3.2);
      }

      // Cristal — empañado o claro
      const glassAlpha = 0.03 + clarity * 0.10;
      bgCtx.fillStyle = `rgba(${glowR},${glassAlpha})`;
      bgCtx.fillRect(x - winW * 0.5, y, winW, winH);

      // Condensación en el cristal (visible cuando está empañado)
      if (fog > 0.3) {
        bgCtx.fillStyle = `rgba(220,210,240,${fog * 0.06})`;
        bgCtx.fillRect(x - winW * 0.5, y, winW, winH);
      }

      // Marco exterior
      const frameA = 0.22 + clarity * 0.22;
      bgCtx.strokeStyle = `rgba(215,200,240,${frameA})`;
      bgCtx.lineWidth = 1.6;
      bgCtx.strokeRect(x - winW * 0.5, y, winW, winH);

      // Travesaño horizontal (divide la ventana en 2 filas)
      bgCtx.lineWidth = 1.0;
      bgCtx.beginPath();
      bgCtx.moveTo(x - winW * 0.5, y + winH * 0.5);
      bgCtx.lineTo(x + winW * 0.5, y + winH * 0.5);
      bgCtx.stroke();

      // Montante vertical (divide en 2 columnas)
      bgCtx.beginPath();
      bgCtx.moveTo(x, y);
      bgCtx.lineTo(x, y + winH);
      bgCtx.stroke();

      // Alféizar — pequeño saliente en la base
      bgCtx.lineWidth = 2.2;
      bgCtx.strokeStyle = `rgba(215,200,240,${frameA * 0.75})`;
      bgCtx.beginPath();
      bgCtx.moveTo(x - winW * 0.55, y + winH);
      bgCtx.lineTo(x + winW * 0.55, y + winH);
      bgCtx.stroke();

      bgCtx.restore();
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Ojos que te observan
  // ════════════════════════════════════════════════════════════════════════
  function drawEyeShape(cx, cy, size, openAmt, alpha, iris) {
    if (openAmt < 0.01 || alpha < 0.005) return;
    const halfW = size;
    const halfH = size * 0.38 * openAmt;

    bgCtx.save();
    bgCtx.beginPath();
    bgCtx.moveTo(cx - halfW, cy);
    bgCtx.bezierCurveTo(
      cx - halfW * 0.4, cy - halfH * 1.6,
      cx + halfW * 0.4, cy - halfH * 1.6,
      cx + halfW, cy
    );
    bgCtx.bezierCurveTo(
      cx + halfW * 0.4, cy + halfH * 1.6,
      cx - halfW * 0.4, cy + halfH * 1.6,
      cx - halfW, cy
    );
    bgCtx.closePath();

    bgCtx.fillStyle = `rgba(228,215,245,${alpha * 0.82})`;
    bgCtx.fill();
    bgCtx.clip();

    // Iris
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, halfH * 1.35, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(${iris},${alpha})`;
    bgCtx.fill();

    // Pupila
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, halfH * 0.52, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(10,5,20,${alpha})`;
    bgCtx.fill();

    // Reflejo mínimo
    bgCtx.beginPath();
    bgCtx.arc(cx + halfH * 0.28, cy - halfH * 0.30, halfH * 0.15, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(240,230,255,${alpha * 0.60})`;
    bgCtx.fill();

    bgCtx.restore();
  }

  function drawEyes(W, H) {
    if (!eyes) return;
    eyes.forEach(e => {
      e.timer--;
      if (e.phase === 'dormant' && e.timer <= 0) {
        e.phase = 'appearing';
        e.x     = W * (0.08 + Math.random() * 0.84);
        e.y     = H * (0.08 + Math.random() * 0.60);
        e.size  = 14 + Math.random() * 22;
      } else if (e.phase === 'appearing') {
        e.alpha = Math.min(1, e.alpha + 0.012);
        e.open  = Math.min(1, e.open  + 0.015);
        if (e.alpha >= 1 && e.open >= 1) {
          e.phase = 'open';
          e.timer = 120 + Math.floor(Math.random() * 220);
        }
      } else if (e.phase === 'open') {
        // Parpadeo sutil
        if (e.timer === 40) { e.open = 0.05; }
        if (e.timer === 36) { e.open = 1.00; }
        if (e.timer <= 0) e.phase = 'closing';
      } else if (e.phase === 'closing') {
        e.open  = Math.max(0, e.open  - 0.020);
        e.alpha = Math.max(0, e.alpha - 0.010);
        if (e.alpha <= 0) {
          e.phase = 'dormant';
          e.timer = 200 + Math.floor(Math.random() * 500);
          e.open  = 0;
        }
      }

      if (e.phase !== 'dormant') {
        drawEyeShape(e.x, e.y, e.size, e.open, e.alpha, e.iris);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Fragmentos de texto del vacío
  // ════════════════════════════════════════════════════════════════════════
  function drawFrags(W, H) {
    if (!frags) return;
    frags.forEach((f, i) => {
      f.life++;
      f.x += f.drift;

      // Ciclo de vida: fadein → hold → fadeout → respawn
      if (f.phase === 'fadein') {
        f.alpha = Math.min(0.58, f.alpha + 0.008);
        if (f.life >= 60) f.phase = 'hold';
      } else if (f.phase === 'hold') {
        if (f.life >= f.maxLife) f.phase = 'fadeout';
      } else if (f.phase === 'fadeout') {
        f.alpha = Math.max(0, f.alpha - 0.007);
        if (f.alpha <= 0) {
          frags[i] = spawnFrag(W, H);
          return;
        }
      }

      bgCtx.save();
      bgCtx.font      = `${f.size}px monospace`;
      bgCtx.textAlign = 'center';

      // Leve variación entre textos: algunos son más perturbadores (más rojos)
      const isWrong = POOL.indexOf(f.text) % 5 === 0;
      const color   = isWrong ? `rgba(220,160,185,${f.alpha})` : `rgba(195,175,225,${f.alpha})`;
      bgCtx.fillStyle = color;
      bgCtx.fillText(f.text, f.x, f.y);
      bgCtx.restore();
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Siluetas humanas: aparecen inmóviles y desaparecen
  // ════════════════════════════════════════════════════════════════════════
  function initSilhouettes(W, H) {
    silhouettes = Array.from({ length: 3 }, (_, i) => ({
      x: 0, y: 0, scale: 0.06, alpha: 0,
      phase: 'dormant',
      timer:    120 + Math.floor(i * 220 + Math.random() * 250),
      holdMax:  90  + Math.floor(Math.random() * 140),
      holdCount: 0,
    }));
  }

  function _drawSilhouette(cx, bottomY, h, alpha) {
    bgCtx.save();
    bgCtx.fillStyle = `rgba(8,4,18,${alpha})`;

    // ── Cabeza ──────────────────────────────────────────────────────────
    bgCtx.beginPath();
    bgCtx.arc(cx, bottomY - h*0.87, h*0.09, 0, Math.PI*2);
    bgCtx.fill();

    // ── Cuerpo superior: cuello + hombros + torso + brazos ──────────────
    bgCtx.beginPath();
    bgCtx.moveTo(cx - h*0.040, bottomY - h*0.780);   // cuello izq

    // Hombro izquierdo
    bgCtx.bezierCurveTo(
      cx - h*0.065, bottomY - h*0.774,
      cx - h*0.182, bottomY - h*0.754,
      cx - h*0.208, bottomY - h*0.724
    );
    // Brazo izquierdo exterior (cuelga ligeramente separado)
    bgCtx.bezierCurveTo(
      cx - h*0.238, bottomY - h*0.645,
      cx - h*0.238, bottomY - h*0.520,
      cx - h*0.218, bottomY - h*0.385
    );
    // Mano izquierda
    bgCtx.bezierCurveTo(
      cx - h*0.213, bottomY - h*0.330,
      cx - h*0.178, bottomY - h*0.305,
      cx - h*0.165, bottomY - h*0.325
    );
    // Brazo izquierdo interior (sube)
    bgCtx.bezierCurveTo(
      cx - h*0.152, bottomY - h*0.440,
      cx - h*0.138, bottomY - h*0.535,
      cx - h*0.122, bottomY - h*0.568
    );
    // Cintura izquierda → cadera
    bgCtx.bezierCurveTo(
      cx - h*0.098, bottomY - h*0.548,
      cx - h*0.082, bottomY - h*0.486,
      cx - h*0.114, bottomY - h*0.428
    );
    // Entrepierna izquierda
    bgCtx.bezierCurveTo(
      cx - h*0.132, bottomY - h*0.380,
      cx - h*0.052, bottomY - h*0.318,
      cx - h*0.018, bottomY - h*0.300
    );
    // Centro de entrepierna
    bgCtx.lineTo(cx + h*0.018, bottomY - h*0.300);
    // Entrepierna derecha
    bgCtx.bezierCurveTo(
      cx + h*0.052, bottomY - h*0.318,
      cx + h*0.132, bottomY - h*0.380,
      cx + h*0.114, bottomY - h*0.428
    );
    // Cintura derecha → cadera
    bgCtx.bezierCurveTo(
      cx + h*0.082, bottomY - h*0.486,
      cx + h*0.098, bottomY - h*0.548,
      cx + h*0.122, bottomY - h*0.568
    );
    // Brazo derecho interior
    bgCtx.bezierCurveTo(
      cx + h*0.138, bottomY - h*0.535,
      cx + h*0.152, bottomY - h*0.440,
      cx + h*0.165, bottomY - h*0.325
    );
    // Mano derecha
    bgCtx.bezierCurveTo(
      cx + h*0.178, bottomY - h*0.305,
      cx + h*0.213, bottomY - h*0.330,
      cx + h*0.218, bottomY - h*0.385
    );
    // Brazo derecho exterior
    bgCtx.bezierCurveTo(
      cx + h*0.238, bottomY - h*0.520,
      cx + h*0.238, bottomY - h*0.645,
      cx + h*0.208, bottomY - h*0.724
    );
    // Hombro derecho
    bgCtx.bezierCurveTo(
      cx + h*0.182, bottomY - h*0.754,
      cx + h*0.065, bottomY - h*0.774,
      cx + h*0.040, bottomY - h*0.780    // cuello der
    );
    bgCtx.closePath();
    bgCtx.fill();

    // ── Pierna izquierda ────────────────────────────────────────────────
    bgCtx.beginPath();
    bgCtx.moveTo(cx - h*0.100, bottomY - h*0.405);
    bgCtx.bezierCurveTo(
      cx - h*0.132, bottomY - h*0.295,
      cx - h*0.130, bottomY - h*0.165,
      cx - h*0.112, bottomY - h*0.022   // tobillo exterior
    );
    bgCtx.bezierCurveTo(
      cx - h*0.112, bottomY,
      cx - h*0.048, bottomY + h*0.005,
      cx - h*0.025, bottomY             // punta pie izq
    );
    bgCtx.bezierCurveTo(
      cx - h*0.014, bottomY - h*0.020,
      cx - h*0.010, bottomY - h*0.165,
      cx - h*0.012, bottomY - h*0.295
    );
    bgCtx.bezierCurveTo(
      cx - h*0.012, bottomY - h*0.355,
      cx - h*0.028, bottomY - h*0.405,
      cx - h*0.042, bottomY - h*0.422
    );
    bgCtx.closePath();
    bgCtx.fill();

    // ── Pierna derecha ──────────────────────────────────────────────────
    bgCtx.beginPath();
    bgCtx.moveTo(cx + h*0.100, bottomY - h*0.405);
    bgCtx.bezierCurveTo(
      cx + h*0.132, bottomY - h*0.295,
      cx + h*0.130, bottomY - h*0.165,
      cx + h*0.112, bottomY - h*0.022
    );
    bgCtx.bezierCurveTo(
      cx + h*0.112, bottomY,
      cx + h*0.048, bottomY + h*0.005,
      cx + h*0.025, bottomY
    );
    bgCtx.bezierCurveTo(
      cx + h*0.014, bottomY - h*0.020,
      cx + h*0.010, bottomY - h*0.165,
      cx + h*0.012, bottomY - h*0.295
    );
    bgCtx.bezierCurveTo(
      cx + h*0.012, bottomY - h*0.355,
      cx + h*0.028, bottomY - h*0.405,
      cx + h*0.042, bottomY - h*0.422
    );
    bgCtx.closePath();
    bgCtx.fill();

    bgCtx.restore();
  }

  function drawSilhouettes(W, H) {
    if (!silhouettes) return;
    silhouettes.forEach(s => {
      s.timer--;
      if (s.phase === 'dormant' && s.timer <= 0) {
        s.x     = W * (0.08 + Math.random() * 0.84);
        s.scale = 0.045 + Math.random() * 0.090;
        const h = s.scale * H;
        s.y     = H * (0.30 + Math.random() * 0.45);
        s.phase = 'appearing'; s.holdCount = 0;
        s.holdMax = 80 + Math.floor(Math.random() * 140);
      } else if (s.phase === 'appearing') {
        s.alpha = Math.min(0.82, s.alpha + 0.010);
        if (s.alpha >= 0.82) s.phase = 'standing';
      } else if (s.phase === 'standing') {
        s.holdCount++;
        if (s.holdCount >= s.holdMax) s.phase = 'disappearing';
      } else if (s.phase === 'disappearing') {
        s.alpha = Math.max(0, s.alpha - 0.007);
        if (s.alpha <= 0) {
          s.phase = 'dormant';
          s.timer = 180 + Math.floor(Math.random() * 380);
        }
      }
      if (s.phase !== 'dormant') {
        _drawSilhouette(s.x, s.y, s.scale * H, s.alpha);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Fotos polaroid flotando con dibujos primitivos
  // ════════════════════════════════════════════════════════════════════════
  const DRAWINGS = ['house','tree','stickfigure','eye','star','flower'];

  function initPolaroids(W, H) {
    polaroids = Array.from({ length: 5 }, (_, i) => ({
      x: W * (0.10 + Math.random() * 0.80),
      y: H * (0.20 + Math.random() * 0.55),
      size:   55 + Math.floor(i * 13.7 % 1.0 * 40),
      alpha:  0,
      rot:    (Math.random() - 0.5) * 0.30,
      rotSpd: (Math.random() - 0.5) * 0.00030,
      vx:     (Math.random() - 0.5) * 0.055,
      vy:     -0.025 - Math.random() * 0.035,
      drawing: DRAWINGS[i % DRAWINGS.length],
      phase:  'fadein',
      life:   Math.floor(i * 70),
      maxLife: 260 + Math.floor(Math.random() * 220),
    }));
  }

  function _primitiveArt(x, y, w, h, alpha, type) {
    const cx = x + w*0.5, cy = y + h*0.5;
    bgCtx.strokeStyle = `rgba(100,80,140,${alpha * 0.65})`;
    bgCtx.fillStyle   = `rgba(100,80,140,${alpha * 0.40})`;
    bgCtx.lineWidth   = 1.1;
    bgCtx.lineCap     = 'round';

    if (type === 'house') {
      bgCtx.beginPath(); bgCtx.moveTo(cx, y+h*0.12);
      bgCtx.lineTo(x+w*0.82, y+h*0.46); bgCtx.lineTo(x+w*0.18, y+h*0.46);
      bgCtx.closePath(); bgCtx.stroke();
      bgCtx.strokeRect(x+w*0.22, y+h*0.46, w*0.56, h*0.42);
      bgCtx.strokeRect(cx-w*0.07, y+h*0.66, w*0.14, h*0.22);
    } else if (type === 'tree') {
      bgCtx.beginPath(); bgCtx.moveTo(cx, y+h*0.08);
      bgCtx.lineTo(x+w*0.76, y+h*0.64); bgCtx.lineTo(x+w*0.24, y+h*0.64);
      bgCtx.closePath(); bgCtx.stroke();
      bgCtx.strokeRect(cx-w*0.07, y+h*0.64, w*0.14, h*0.28);
    } else if (type === 'stickfigure') {
      bgCtx.beginPath(); bgCtx.arc(cx, y+h*0.18, h*0.10, 0, Math.PI*2); bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.moveTo(cx, y+h*0.28); bgCtx.lineTo(cx, y+h*0.64); bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.moveTo(x+w*0.18, y+h*0.44); bgCtx.lineTo(x+w*0.82, y+h*0.44); bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.moveTo(cx, y+h*0.64); bgCtx.lineTo(x+w*0.26, y+h*0.92); bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.moveTo(cx, y+h*0.64); bgCtx.lineTo(x+w*0.74, y+h*0.92); bgCtx.stroke();
    } else if (type === 'eye') {
      bgCtx.beginPath();
      bgCtx.moveTo(x+w*0.12, cy);
      bgCtx.bezierCurveTo(x+w*0.35, y+h*0.25, x+w*0.65, y+h*0.25, x+w*0.88, cy);
      bgCtx.bezierCurveTo(x+w*0.65, y+h*0.75, x+w*0.35, y+h*0.75, x+w*0.12, cy);
      bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.arc(cx, cy, h*0.17, 0, Math.PI*2); bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.arc(cx, cy, h*0.08, 0, Math.PI*2); bgCtx.fill();
    } else if (type === 'star') {
      const R = Math.min(w,h)*0.40, r = R*0.42;
      bgCtx.beginPath();
      for (let i = 0; i < 5; i++) {
        const aO = (i/5)*Math.PI*2 - Math.PI/2;
        const aI = aO + Math.PI/5;
        i === 0 ? bgCtx.moveTo(cx+Math.cos(aO)*R, cy+Math.sin(aO)*R)
                : bgCtx.lineTo(cx+Math.cos(aO)*R, cy+Math.sin(aO)*R);
        bgCtx.lineTo(cx+Math.cos(aI)*r, cy+Math.sin(aI)*r);
      }
      bgCtx.closePath(); bgCtx.stroke();
    } else if (type === 'flower') {
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2;
        bgCtx.beginPath();
        bgCtx.arc(cx+Math.cos(a)*h*0.24, cy+Math.sin(a)*h*0.24, h*0.14, 0, Math.PI*2);
        bgCtx.stroke();
      }
      bgCtx.beginPath(); bgCtx.arc(cx, cy, h*0.10, 0, Math.PI*2); bgCtx.fill();
    }
  }

  function drawPolaroids(W, H) {
    if (!polaroids) return;
    polaroids.forEach((p, i) => {
      p.life++;
      p.x  += p.vx; p.y  += p.vy;
      p.rot += p.rotSpd;

      if (p.phase === 'fadein') {
        p.alpha = Math.min(0.88, p.alpha + 0.006);
        if (p.life >= 70) p.phase = 'hold';
      } else if (p.phase === 'hold') {
        if (p.life >= p.maxLife) p.phase = 'fadeout';
      } else if (p.phase === 'fadeout') {
        p.alpha = Math.max(0, p.alpha - 0.005);
        if (p.alpha <= 0) {
          // respawn
          polaroids[i] = {
            x: W * (0.10 + Math.random() * 0.80),
            y: H * (0.55 + Math.random() * 0.30),   // nace desde abajo
            size:   55 + Math.floor(Math.random() * 40),
            alpha:  0, rot: (Math.random()-0.5)*0.28,
            rotSpd: (Math.random()-0.5)*0.00028,
            vx:     (Math.random()-0.5)*0.055,
            vy:     -0.022 - Math.random()*0.032,
            drawing: DRAWINGS[Math.floor(Math.random()*DRAWINGS.length)],
            phase: 'fadein', life: 0,
            maxLife: 260 + Math.floor(Math.random()*200),
          };
          return;
        }
      }

      // Dibuja la polaroid
      const { x, y, size, alpha, rot, drawing } = p;
      const pw = size, ph = size * 1.26;
      const brd = size * 0.09;
      const iw  = pw - brd * 2;
      const ih  = ph - brd * 2.8;

      bgCtx.save();
      bgCtx.translate(x, y); bgCtx.rotate(rot);

      // Sombra
      bgCtx.shadowColor = `rgba(20,10,40,${alpha*0.22})`; bgCtx.shadowBlur = 7;
      // Fondo blanco de la polaroid
      bgCtx.fillStyle = `rgba(242,238,252,${alpha*0.94})`;
      bgCtx.fillRect(-pw/2, -ph/2, pw, ph);
      bgCtx.shadowBlur = 0;

      // Área de imagen (ligeramente más oscura)
      bgCtx.fillStyle = `rgba(225,218,242,${alpha*0.80})`;
      bgCtx.fillRect(-pw/2+brd, -ph/2+brd, iw, ih);

      // Arte primitivo dentro
      _primitiveArt(-pw/2+brd, -ph/2+brd, iw, ih, alpha, drawing);

      bgCtx.restore();

      // Rebote en bordes
      if (p.x < -pw || p.x > W + pw || p.y < -ph * 2) p.phase = 'fadeout';
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Grano de película analógica
  // ════════════════════════════════════════════════════════════════════════
  function drawGrain(W, H) {
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    const n = 700;
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const a = 0.012 + Math.random() * 0.030;
      bgCtx.fillStyle = `rgba(195,180,225,${a})`;
      bgCtx.fillRect(x, y, 1, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Distorsión VHS ocasional
  // ════════════════════════════════════════════════════════════════════════
  function drawVHS(W, H) {
    if (t < nextVHS) return;
    nextVHS = t + 160 + Math.floor(Math.random() * 280);

    bgCtx.save();
    const numBands = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numBands; i++) {
      const y  = Math.random() * H;
      const bh = 1 + Math.random() * 12;
      const dx = (Math.random() - 0.5) * 16;
      bgCtx.fillStyle = `rgba(215,195,240,${0.04 + Math.random() * 0.06})`;
      bgCtx.fillRect(dx, y, W, bh);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Bloom de clic: "YOU WERE HERE"
  // ════════════════════════════════════════════════════════════════════════
  function spawnBloom(x, y) {
    blooms.push({
      x, y, life: 1.0,
      text: Math.random() < 0.5 ? 'YOU WERE HERE' : POOL[Math.floor(Math.random() * POOL.length)],
    });
  }

  function drawBlooms(W, H) {
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b    = blooms[i];
      const prog = 1 - b.life;

      bgCtx.save();
      bgCtx.globalCompositeOperation = 'screen';

      // 5 anillos concéntricos
      for (let ri = 0; ri < 5; ri++) {
        const rp = Math.max(0, prog - ri * 0.06);
        if (rp <= 0) continue;
        const rA  = Math.max(0, (b.life - ri * 0.06) * 0.38);
        const col = ri % 2 === 0 ? '200,180,240' : '240,180,210';
        bgCtx.beginPath(); bgCtx.arc(b.x, b.y, rp * (55 + ri * 14), 0, Math.PI * 2);
        bgCtx.strokeStyle = `rgba(${col},${rA})`; bgCtx.lineWidth = 0.9; bgCtx.stroke();
      }

      // Texto emergente
      if (b.life > 0.3) {
        bgCtx.font = '13px monospace';
        bgCtx.textAlign = 'center';
        bgCtx.fillStyle = `rgba(210,190,240,${(b.life - 0.3) * 0.75})`;
        bgCtx.fillText(b.text, b.x, b.y - 28 - prog * 18);
      }

      bgCtx.restore();

      b.life -= 0.016;
      if (b.life <= 0) blooms.splice(i, 1);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor: círculo pálido + trail de letras que se deshacen
  // ════════════════════════════════════════════════════════════════════════
  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    const breathe = 0.5 + 0.5 * Math.sin(t * 0.022);
    const ringR   = 10 + breathe * 4;

    // Halo exterior muy sutil
    const halo = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 44);
    halo.addColorStop(0,   `rgba(195,175,230,0.050)`);
    halo.addColorStop(1,   'rgba(0,0,0,0)');
    overCtx.fillStyle = halo;
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 44, 0, Math.PI * 2); overCtx.fill();

    // Anillo pálido principal
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, ringR, 0, Math.PI * 2);
    overCtx.strokeStyle = `rgba(205,185,235,${0.18 * breathe + 0.06})`;
    overCtx.lineWidth = 0.9; overCtx.stroke();

    // Cruz de mira (crosshair) fina
    const cs = 5;
    overCtx.strokeStyle = `rgba(205,185,235,0.12)`;
    overCtx.lineWidth = 0.7;
    overCtx.beginPath();
    overCtx.moveTo(mouseX - cs - 5, mouseY); overCtx.lineTo(mouseX - cs, mouseY); overCtx.stroke();
    overCtx.beginPath();
    overCtx.moveTo(mouseX + cs, mouseY); overCtx.lineTo(mouseX + cs + 5, mouseY); overCtx.stroke();
    overCtx.beginPath();
    overCtx.moveTo(mouseX, mouseY - cs - 5); overCtx.lineTo(mouseX, mouseY - cs); overCtx.stroke();
    overCtx.beginPath();
    overCtx.moveTo(mouseX, mouseY + cs); overCtx.lineTo(mouseX, mouseY + cs + 5); overCtx.stroke();

    // Punto central
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 1.4, 0, Math.PI * 2);
    overCtx.fillStyle = 'rgba(220,205,245,0.55)'; overCtx.fill();

    // Trail de letras que se desintegran
    overCtx.font = '10px monospace';
    for (let i = letterTrail.length - 1; i >= 0; i--) {
      const l = letterTrail[i];
      overCtx.fillStyle = `rgba(195,175,230,${l.alpha})`;
      overCtx.fillText(l.ch, l.x, l.y);
      l.alpha -= 0.014;
      l.y -= 0.15;
      if (l.alpha <= 0) letterTrail.splice(i, 1);
    }

    // Reflejo del cursor en el suelo — posición con delay de 22 frames
    cursorHistory.push({ x: mouseX, y: mouseY });
    if (cursorHistory.length > 22) cursorHistory.shift();
    const ghost = cursorHistory.length >= 22 ? cursorHistory[0] : null;
    if (ghost && ghost.x > 0) {
      const vpY   = H * 0.50;                          // horizonte del suelo
      const refY  = vpY + (vpY - ghost.y);             // posición reflejada
      const refX  = ghost.x;
      if (refY > vpY && refY < H * 0.96) {
        const depth = (refY - vpY) / (H - vpY);        // 0=horizonte 1=base
        const rA    = depth * 0.18;

        // Reflejo invertido: anillo más tenue
        overCtx.save();
        overCtx.globalAlpha = rA;
        overCtx.scale(1, -0.55 - depth * 0.15);        // aplana el reflejo

        const ry = -refY / (0.55 + depth * 0.15);      // compensar scale
        overCtx.beginPath();
        overCtx.arc(refX, ry, ringR * (0.5 + depth*0.5), 0, Math.PI*2);
        overCtx.strokeStyle = `rgba(195,175,230,1)`;
        overCtx.lineWidth = 0.7; overCtx.stroke();

        overCtx.beginPath(); overCtx.arc(refX, ry, 1.1, 0, Math.PI*2);
        overCtx.fillStyle = 'rgba(215,200,245,1)'; overCtx.fill();
        overCtx.restore();
      }
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
    drawFloorGrid(W, H);
    drawWindows(W, H);
    drawSilhouettes(W, H);
    drawPolaroids(W, H);
    drawEyes(W, H);
    drawFrags(W, H);
    drawVHS(W, H);
    drawGrain(W, H);
    drawBlooms(W, H);

    drawCursor(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width   = W; bgCanvas.height   = H;
    overCanvas.width = W; overCanvas.height = H;
    initWindows(W, H);
    initEyes(W, H);
    initFrags(W, H);
    initSilhouettes(W, H);
    initPolaroids(W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-wc-bg';
      Object.assign(bgCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'-1' });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-wc-over';
      Object.assign(overCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'9998' });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      _onMove = (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        if (t - lastTrailT > 3) {
          lastTrailT = t;
          letterTrail.push({
            x:   mouseX + (Math.random() - 0.5) * 6,
            y:   mouseY + (Math.random() - 0.5) * 6,
            ch:  ALPHA_CHARS[Math.floor(Math.random() * ALPHA_CHARS.length)],
            alpha: 0.22 + Math.random() * 0.12,
          });
          if (letterTrail.length > 14) letterTrail.shift();
        }
      };
      _onClick = (e) => spawnBloom(e.clientX, e.clientY);

      document.addEventListener('mousemove',  _onMove,  { passive:true });
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
      windows = eyes = frags = silhouettes = polaroids = null;
      letterTrail.length = blooms.length = cursorHistory.length = 0;
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };
})();

export { WeirdcoreRenderer };
