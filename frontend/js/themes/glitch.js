// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/glitch.js
//  Glitch — Sistema en Colapso
//
//  bgCanvas  (z:-1)   → lluvia de código hex (estilo Matrix),
//                        bloques de corrupción de VRAM,
//                        píxeles muertos que parpadean,
//                        viñeta CRT,
//                        evento de glitch mayor cada ~300-500 frames
//                        (franjas desplazadas + split RGB + estática)
//
//  overCanvas (z:9998) → cursor: 3 anillos RGB desfasados (aberración
//                        cromática), trail de energía, chispas;
//                        durante el evento de glitch los anillos se
//                        separan dramáticamente
//
//  Interactividad:
//   · Clic → explosión glitch: 4 anillos expansivos multicolor + partículas
// ════════════════════════════════════════════════════════════════

const GlitchRenderer = (() => {

  let bgCanvas = null, bgCtx = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;

  // ── Chars para la lluvia ────────────────────────────────────────────────
  const CHARS = '0123456789ABCDEF0101%$#!?><{}[]|/\\^~_=+';
  const FONT   = '13px monospace';
  const COL_W  = 15;

  // ── Estado de partículas ────────────────────────────────────────────────
  let cols       = null;
  let deadPixels = null;
  const corrBlocks = [];
  let corrTick = 0;

  // ── Evento de glitch mayor ──────────────────────────────────────────────
  let glitchEvent = null;
  let nextGlitch  = 360 + Math.floor(Math.random() * 280);

  // ── Blooms de clic ──────────────────────────────────────────────────────
  const blooms = [];

  // ── Cursor ──────────────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastTrailT = 0, _onMove = null, _onClick = null;
  const trailDots = [];

  // ════════════════════════════════════════════════════════════════════════
  //  Init partículas
  // ════════════════════════════════════════════════════════════════════════
  function initRain(W, H) {
    const count = Math.ceil(W / COL_W) + 2;
    cols = Array.from({ length: count }, (_, i) => ({
      x:      i * COL_W + 8,
      y:      -(Math.random() * H),
      speed:   1.4 + Math.random() * 2.4,
      len:     9  + Math.floor(Math.random() * 18),
      chars:   Array.from({ length: 32 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
      stale:   0,
      scramble: 2 + Math.floor(Math.random() * 5),
    }));
  }

  function initDeadPixels(W, H) {
    deadPixels = Array.from({ length: 40 }, (_, i) => ({
      x:     ((i * 317.53 + 47) % 1.0 + 1) % 1.0 * W,
      y:     ((i * 241.77 + 83) % 1.0 + 1) % 1.0 * H,
      size:   1.1 + (i * 7.31 % 1.0) * 2.0,
      phase:  i * 0.8341,
      speed:  0.019 + (i * 3.71 % 1.0) * 0.052,
      color:  i % 6 === 0 ? '255,0,96' : i % 4 === 0 ? '0,200,255' : '0,232,144',
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Corrupción de VRAM — bloques semitransparentes efímeros
  // ════════════════════════════════════════════════════════════════════════
  function spawnCorr(W, H, intense = false) {
    const n = intense ? 8 + Math.floor(Math.random() * 16) : 1;
    const COLORS = ['0,232,144', '0,255,200', '255,0,96', '200,255,255'];
    for (let i = 0; i < n; i++) {
      corrBlocks.push({
        x:     Math.random() * W,
        y:     Math.random() * H,
        w:     intense ? 60 + Math.random() * 380 : 14 + Math.random() * 90,
        h:     intense ? 3  + Math.random() * 36  : 1  + Math.random() * 9,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: intense ? 0.10 + Math.random() * 0.28 : 0.04 + Math.random() * 0.11,
        life:  intense ? 3 + Math.floor(Math.random() * 7) : 1 + Math.floor(Math.random() * 4),
      });
    }
  }

  function drawCorr(W, H) {
    corrTick++;
    if (corrTick >= 4) {
      corrTick = 0;
      if (Math.random() < 0.62) spawnCorr(W, H, false);
    }
    if (!corrBlocks.length) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = corrBlocks.length - 1; i >= 0; i--) {
      const b = corrBlocks[i];
      bgCtx.fillStyle = `rgba(${b.color},${b.alpha})`;
      bgCtx.fillRect(b.x, b.y, b.w, b.h);
      b.life--;
      if (b.life <= 0) corrBlocks.splice(i, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Lluvia de código hex
  // ════════════════════════════════════════════════════════════════════════
  function drawRain(W, H) {
    if (!cols) return;
    bgCtx.save();
    bgCtx.font = FONT;
    bgCtx.textAlign = 'center';

    cols.forEach(col => {
      col.stale++;
      if (col.stale >= col.scramble) {
        col.stale = 0;
        const idx = Math.floor(Math.random() * col.chars.length);
        col.chars[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
      }

      for (let j = 0; j <= col.len; j++) {
        const cy = col.y - j * 14;
        if (cy < -14 || cy > H + 14) continue;

        const ch = j === 0
          ? CHARS[Math.floor(t * 0.28 + col.x * 0.17) % CHARS.length]
          : col.chars[j % col.chars.length];

        if (j === 0) {
          bgCtx.fillStyle = 'rgba(190,255,210,0.92)';
        } else {
          const fade = 1 - j / col.len;
          bgCtx.fillStyle = `rgba(0,232,144,${(fade * 0.52).toFixed(3)})`;
        }
        bgCtx.fillText(ch, col.x, cy);
      }

      col.y += col.speed;
      if (col.y - col.len * 14 > H + 20) {
        col.y      = -(Math.random() * H * 0.3);
        col.speed  = 1.4 + Math.random() * 2.4;
        col.len    = 9 + Math.floor(Math.random() * 18);
      }
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Píxeles muertos
  // ════════════════════════════════════════════════════════════════════════
  function drawDeadPixels() {
    if (!deadPixels) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    deadPixels.forEach(p => {
      const flicker = 0.5 + 0.5 * Math.sin(t * p.speed + p.phase);
      if (flicker < 0.35) return;
      bgCtx.fillStyle = `rgba(${p.color},${(flicker * 0.72).toFixed(3)})`;
      bgCtx.fillRect(p.x, p.y, p.size, p.size);
    });
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Viñeta CRT
  // ════════════════════════════════════════════════════════════════════════
  function drawVignette(W, H) {
    const g = bgCtx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.88);
    g.addColorStop(0,   'rgba(0,0,0,0)');
    g.addColorStop(0.65,'rgba(0,0,0,0)');
    g.addColorStop(1,   'rgba(2,6,3,0.58)');
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Evento de Glitch mayor
  // ════════════════════════════════════════════════════════════════════════
  function triggerGlitch(W, H) {
    const numBands = 7 + Math.floor(Math.random() * 11);
    glitchEvent = {
      life:    16 + Math.floor(Math.random() * 12),
      maxLife: 28,
      bands: Array.from({ length: numBands }, () => ({
        y:     Math.random() * H,
        h:     2 + Math.random() * 48,
        dx:    (Math.random() - 0.5) * 110,
        color: Math.random() < 0.50 ? '0,232,144' : Math.random() < 0.5 ? '255,0,96' : '0,180,255',
        alpha: 0.05 + Math.random() * 0.24,
      })),
      rgbShift: 10 + Math.random() * 20,
    };
    spawnCorr(W, H, true);
    nextGlitch = t + 300 + Math.floor(Math.random() * 340);
  }

  function drawGlitchEvent(W, H) {
    if (!glitchEvent) return;
    const intensity = glitchEvent.life / glitchEvent.maxLife;

    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';

    // Franjas horizontales desplazadas
    glitchEvent.bands.forEach(b => {
      bgCtx.fillStyle = `rgba(${b.color},${(b.alpha * intensity).toFixed(3)})`;
      bgCtx.fillRect(b.dx * intensity, b.y, W, b.h);
    });

    // Split RGB global
    const shift = glitchEvent.rgbShift * intensity;
    bgCtx.globalAlpha = 0.07 * intensity;
    bgCtx.fillStyle = 'rgba(255,0,80,1)';   bgCtx.fillRect(-shift, 0, W, H);
    bgCtx.fillStyle = 'rgba(0,255,120,1)';  bgCtx.fillRect(0, 0, W, H);
    bgCtx.fillStyle = 'rgba(0,100,255,1)';  bgCtx.fillRect(shift,  0, W, H);
    bgCtx.globalAlpha = 1;

    bgCtx.restore();

    // Más bloques de corrupción durante el evento
    if (t % 2 === 0) spawnCorr(W, H, true);

    glitchEvent.life--;
    if (glitchEvent.life <= 0) glitchEvent = null;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BG — Bloom de clic: explosión glitch multicolor
  // ════════════════════════════════════════════════════════════════════════
  function spawnBloom(x, y) {
    blooms.push({
      x, y, life: 1.0,
      rings: ['0,232,144', '255,0,96', '0,200,255', '190,255,210'],
      particles: Array.from({ length: 32 }, () => {
        const a   = Math.random() * Math.PI * 2;
        const spd = 1.6 + Math.random() * 3.8;
        const COLS = ['0,232,144', '255,0,96', '0,200,255', '200,255,220'];
        return {
          x, y,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          size: 0.6 + Math.random() * 1.4,
          color: COLS[Math.floor(Math.random() * COLS.length)],
        };
      }),
    });
  }

  function drawBlooms() {
    if (!blooms.length) return;
    bgCtx.save();
    bgCtx.globalCompositeOperation = 'screen';
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i];
      const prog = 1 - b.life;

      b.rings.forEach((col, ri) => {
        const rp = Math.max(0, prog - ri * 0.07);
        if (rp <= 0) return;
        const rA = Math.max(0, (b.life - ri * 0.07) * 0.48);
        bgCtx.beginPath(); bgCtx.arc(b.x, b.y, rp * (68 + ri * 16), 0, Math.PI * 2);
        bgCtx.strokeStyle = `rgba(${col},${rA})`; bgCtx.lineWidth = 1.2; bgCtx.stroke();
      });

      // Flash central
      const fR = 6 + prog * 38;
      const fl = bgCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, fR);
      fl.addColorStop(0, `rgba(190,255,210,${b.life * 0.92})`);
      fl.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.beginPath(); bgCtx.arc(b.x, b.y, fR, 0, Math.PI * 2);
      bgCtx.fillStyle = fl; bgCtx.fill();

      b.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92;
        bgCtx.beginPath(); bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(${p.color},${(b.life * 0.82).toFixed(3)})`; bgCtx.fill();
      });

      b.life -= 0.022;
      if (b.life <= 0) blooms.splice(i, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor RGB split + trail
  // ════════════════════════════════════════════════════════════════════════
  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;

    overCtx.save();
    overCtx.globalCompositeOperation = 'screen';

    const gi        = glitchEvent ? glitchEvent.life / glitchEvent.maxLife : 0;
    const breathe   = 0.5 + 0.5 * Math.sin(t * 0.030);
    const jitter    = Math.sin(t * 0.52) * (1.5 + gi * 12);
    const ringR     = 14 + breathe * 5 + gi * 10;
    const shift     = 10 + gi * 32;

    // Halo ambiente
    const halo = overCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 52);
    halo.addColorStop(0,   `rgba(0,232,144,${0.06 + gi * 0.06})`);
    halo.addColorStop(1,   'rgba(0,0,0,0)');
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 52, 0, Math.PI*2);
    overCtx.fillStyle = halo; overCtx.fill();

    // Canal rojo — desplazado a la izquierda
    overCtx.beginPath();
    overCtx.arc(mouseX - shift + jitter, mouseY, ringR * 0.90, 0, Math.PI * 2);
    overCtx.strokeStyle = `rgba(255,20,60,${0.22 + gi * 0.42})`;
    overCtx.lineWidth = 1.1; overCtx.stroke();

    // Canal verde — centro
    overCtx.beginPath();
    overCtx.arc(mouseX, mouseY, ringR, 0, Math.PI * 2);
    overCtx.strokeStyle = `rgba(0,232,144,${0.28 + gi * 0.35})`;
    overCtx.lineWidth = 1.5; overCtx.stroke();

    // Canal azul — desplazado a la derecha
    overCtx.beginPath();
    overCtx.arc(mouseX + shift - jitter, mouseY, ringR * 0.90, 0, Math.PI * 2);
    overCtx.strokeStyle = `rgba(0,160,255,${0.20 + gi * 0.38})`;
    overCtx.lineWidth = 1.1; overCtx.stroke();

    // Punto central
    overCtx.beginPath(); overCtx.arc(mouseX, mouseY, 1.8, 0, Math.PI * 2);
    overCtx.fillStyle = `rgba(180,255,200,${0.68 + gi * 0.25})`; overCtx.fill();

    // Trail
    for (let i = trailDots.length - 1; i >= 0; i--) {
      const d = trailDots[i];
      overCtx.beginPath(); overCtx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      overCtx.fillStyle = `rgba(0,232,144,${d.alpha})`; overCtx.fill();
      d.alpha -= 0.020;
      if (d.alpha <= 0) trailDots.splice(i, 1);
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

    // Trigger glitch event si toca
    if (t >= nextGlitch) triggerGlitch(W, H);

    drawRain(W, H);
    drawCorr(W, H);
    drawDeadPixels();
    drawGlitchEvent(W, H);
    drawBlooms();
    drawVignette(W, H);

    drawCursor(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    bgCanvas.width   = W; bgCanvas.height   = H;
    overCanvas.width = W; overCanvas.height = H;
    initRain(W, H);
    initDeadPixels(W, H);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════════════
  return {
    start() {
      if (bgCanvas) return;

      bgCanvas = document.createElement('canvas');
      bgCanvas.id = 'orak-glitch-bg';
      Object.assign(bgCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'-1' });
      document.body.appendChild(bgCanvas);
      bgCtx = bgCanvas.getContext('2d');

      overCanvas = document.createElement('canvas');
      overCanvas.id = 'orak-glitch-over';
      Object.assign(overCanvas.style, { position:'fixed', inset:'0', pointerEvents:'none', zIndex:'9998' });
      document.body.appendChild(overCanvas);
      overCtx = overCanvas.getContext('2d');

      resize();

      _onMove = (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        if (t - lastTrailT > 2) {
          lastTrailT = t;
          trailDots.push({ x:mouseX, y:mouseY, size:0.9 + Math.random() * 0.8, alpha:0.25 });
          if (trailDots.length > 18) trailDots.shift();
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
      cols = deadPixels = null;
      corrBlocks.length = trailDots.length = blooms.length = 0;
      glitchEvent = null;
      mouseX = mouseY = -999; raf = null; t = 0;
    },
  };
})();

export { GlitchRenderer };
