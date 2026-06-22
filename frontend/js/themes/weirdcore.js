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

  // ── Estado global ────────────────────────────────────────────────────────
  let doors    = null;
  let eyes     = null;
  let frags    = null;   // fragmentos de texto activos

  // ── Cursor ───────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastTrailT = 0, _onMove = null, _onClick = null;
  const letterTrail = [];   // { x, y, ch, alpha }

  // ── Blooms de clic ───────────────────────────────────────────────────────
  const blooms = [];

  // ── Próxima distorsión VHS ───────────────────────────────────────────────
  let nextVHS = 120 + Math.floor(Math.random() * 200);

  const ALPHA_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?!@#';

  // ════════════════════════════════════════════════════════════════════════
  //  Init
  // ════════════════════════════════════════════════════════════════════════
  function initDoors(W, H) {
    doors = Array.from({ length: 5 }, (_, i) => {
      const scale   = 0.09 + (i * 0.07 % 1.0) * 0.14;
      const doorH   = scale * H;
      const doorW   = doorH * 0.48;
      return {
        x:         (i * 0.21 + 0.06) * W,
        y:         (0.10 + (i * 0.11 % 1.0) * 0.36) * H,
        doorW, doorH,
        vx:        (Math.sin(i * 1.73) * 0.020),
        vy:        (Math.cos(i * 2.51) * 0.012),
        open:      0,           // 0=cerrada, 1=abierta (ángulo visual)
        phase:     'wait',      // wait / opening / hold / closing
        timer:     60 + Math.floor((i * 173.7) % 300),
        holdMax:   140 + Math.floor((i * 211.3) % 200),
        holdCount: 0,
        glow:      i % 3 !== 2,
        glowR:     i % 2 === 0 ? '255,245,200' : '255,200,220',
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

        bgCtx.beginPath();
        bgCtx.moveTo(x1l, y1); bgCtx.lineTo(x1r, y1);
        bgCtx.lineTo(x2r, y2); bgCtx.lineTo(x2l, y2);
        bgCtx.closePath();
        bgCtx.fillStyle = `rgba(210,190,235,${fill})`;
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
  //  BG — Puertas flotantes
  // ════════════════════════════════════════════════════════════════════════
  function drawDoors(W, H) {
    if (!doors) return;
    doors.forEach(d => {
      // Física de flotación
      d.x += d.vx; d.y += d.vy;
      if (d.x < -d.doorW * 2) d.x = W + d.doorW;
      if (d.x > W + d.doorW * 2) d.x = -d.doorW;
      if (d.y < -d.doorH * 0.5) d.vy =  Math.abs(d.vy);
      if (d.y + d.doorH > H * 0.90) d.vy = -Math.abs(d.vy);

      // Máquina de estado de apertura
      d.timer--;
      if (d.phase === 'wait' && d.timer <= 0) {
        d.phase = 'opening';
      } else if (d.phase === 'opening') {
        d.open = Math.min(1, d.open + 0.008);
        if (d.open >= 1) { d.phase = 'hold'; d.holdCount = 0; }
      } else if (d.phase === 'hold') {
        d.holdCount++;
        if (d.holdCount >= d.holdMax) d.phase = 'closing';
      } else if (d.phase === 'closing') {
        d.open = Math.max(0, d.open - 0.006);
        if (d.open <= 0) {
          d.phase = 'wait';
          d.timer = 180 + Math.floor(Math.random() * 360);
        }
      }

      const { x, y, doorW, doorH, open, glow, glowR } = d;
      const bottom = y + doorH;

      bgCtx.save();

      // Luz detrás de la puerta abierta
      if (glow && open > 0) {
        const gi = bgCtx.createRadialGradient(x, y + doorH * 0.5, 0, x, y + doorH * 0.5, doorW * 2.5);
        gi.addColorStop(0,   `rgba(${glowR},${0.16 * open})`);
        gi.addColorStop(0.5, `rgba(${glowR},${0.06 * open})`);
        gi.addColorStop(1,   'rgba(0,0,0,0)');
        bgCtx.fillStyle = gi;
        bgCtx.fillRect(x - doorW * 3, y - doorH * 0.2, doorW * 6, doorH * 1.6);
      }

      // Interior (hueco de la puerta abierta)
      if (open > 0.05) {
        const interiorW = doorW * open * 0.88;
        const innerGrad = bgCtx.createLinearGradient(x - interiorW * 0.5, 0, x + interiorW * 0.5, 0);
        innerGrad.addColorStop(0,   'rgba(0,0,0,0)');
        innerGrad.addColorStop(0.3, `rgba(${glowR},${0.07 * open})`);
        innerGrad.addColorStop(0.7, `rgba(${glowR},${0.07 * open})`);
        innerGrad.addColorStop(1,   'rgba(0,0,0,0)');
        bgCtx.fillStyle = innerGrad;
        bgCtx.fillRect(x - interiorW * 0.5, y, interiorW, doorH);
      }

      // Marco de la puerta
      const fa = 0.25 + open * 0.25;
      bgCtx.strokeStyle = `rgba(210,195,235,${fa})`;
      bgCtx.lineWidth = 1.4;
      bgCtx.beginPath();
      bgCtx.moveTo(x - doorW * 0.5, bottom);
      bgCtx.lineTo(x - doorW * 0.5, y);
      bgCtx.lineTo(x + doorW * 0.5, y);
      bgCtx.lineTo(x + doorW * 0.5, bottom);
      bgCtx.stroke();

      // Pomo de la puerta
      const knobX = x + doorW * 0.28 * (open > 0.3 ? (1 - open * 0.4) : 1);
      bgCtx.beginPath();
      bgCtx.arc(knobX, y + doorH * 0.55, 2.2, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(220,200,245,${fa * 0.85})`;
      bgCtx.fill();

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
      l.y -= 0.15;   // los caracteres flotan ligeramente hacia arriba
      if (l.alpha <= 0) letterTrail.splice(i, 1);
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
    drawDoors(W, H);
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
    initDoors(W, H);
    initEyes(W, H);
    initFrags(W, H);
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
      doors = eyes = frags = null;
      letterTrail.length = blooms.length = 0;
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };
})();

export { WeirdcoreRenderer };
