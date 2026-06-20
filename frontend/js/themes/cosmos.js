// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/cosmos.js
//  Cosmos — renderizador Canvas 2D
//
//  Capas (de atrás hacia adelante):
//    1. Nebulosa difusa de fondo (radial gradient muy sutil)
//    2. Galaxia espiral lejana (elipse girada con halo tenue)
//    3. Cometa lento con cola de polvo (dorada) + cola iónica (azul-blanca)
//    4. Estrellas fugaces rápidas con estela brillante
//
//  El CSS de Cosmos sigue aportando el campo estelar base.
//  Este Canvas solo agrega los elementos dinámicos.
// ════════════════════════════════════════════════════════════════

const CosmosRenderer = (() => {

  let canvas = null;
  let ctx    = null;
  let raf    = null;
  let t      = 0;

  // ── Estado de elementos dinámicos ───────────────────────────────────────
  const shootingStars = [];
  let nextStarIn  = 120;   // frames hasta la próxima estrella fugaz
  let comet       = null;
  let nextCometIn = 300;   // frames hasta el próximo cometa (~5s primer aviso)

  // ── Nebulosa (posición fija, se calcula al iniciar) ───────────────────
  let nebula = null;
  // ── Galaxia (posición fija) ────────────────────────────────────────────
  let galaxy = null;

  // ════════════════════════════════════════════════════════════════════════
  //  NEBULOSA — nube difusa de gas muy tenue
  // ════════════════════════════════════════════════════════════════════════
  function initNebula(W, H) {
    nebula = {
      x:  W * (0.25 + Math.random() * 0.5),
      y:  H * (0.15 + Math.random() * 0.45),
      rx: W * (0.28 + Math.random() * 0.18),
      ry: H * (0.20 + Math.random() * 0.14),
      angle: Math.random() * Math.PI,
      // Tono frío azul-violeta
      r: 40 + Math.floor(Math.random() * 30),
      g: 30 + Math.floor(Math.random() * 20),
      b: 90 + Math.floor(Math.random() * 40),
    };
  }

  function drawNebula() {
    const { x, y, rx, ry, angle, r, g, b } = nebula;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1, ry / rx);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0.00, `rgba(${r+40},${g+35},${b+40},0.055)`);
    grad.addColorStop(0.35, `rgba(${r+20},${g+15},${b+20},0.038)`);
    grad.addColorStop(0.65, `rgba(${r},${g},${b},0.020)`);
    grad.addColorStop(1.00, `rgba(0,0,0,0)`);

    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  GALAXIA — elipse brillante inclinada (vista de canto)
  // ════════════════════════════════════════════════════════════════════════
  function initGalaxy(W, H) {
    // Aseguramos que esté lejos de la nebulosa pero visible
    galaxy = {
      x:     W * (0.55 + Math.random() * 0.30),
      y:     H * (0.08 + Math.random() * 0.30),
      rx:    80  + Math.random() * 60,
      ry:    18  + Math.random() * 14,
      angle: (15 + Math.random() * 30) * Math.PI / 180,
      pulse: Math.random() * Math.PI * 2,  // fase de pulsación
    };
  }

  function drawGalaxy() {
    const { x, y, rx, ry, angle, pulse } = galaxy;
    const breathe = 0.88 + 0.12 * Math.sin(t * 0.0008 + pulse);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1, ry / rx);

    // Halo exterior muy tenue
    const halo = ctx.createRadialGradient(0, 0, rx * 0.5, 0, 0, rx * 1.6);
    halo.addColorStop(0.00, `rgba(200,180,255,${0.06 * breathe})`);
    halo.addColorStop(0.45, `rgba(160,130,220,${0.04 * breathe})`);
    halo.addColorStop(1.00, `rgba(0,0,0,0)`);
    ctx.beginPath();
    ctx.arc(0, 0, rx * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    // Disco principal
    const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    disc.addColorStop(0.00, `rgba(255,245,220,${0.55 * breathe})`);  // núcleo blanco-dorado
    disc.addColorStop(0.18, `rgba(220,200,255,${0.38 * breathe})`);  // zona interior violeta
    disc.addColorStop(0.50, `rgba(160,140,220,${0.18 * breathe})`);  // brazos
    disc.addColorStop(0.80, `rgba(100,80,180,${0.08 * breathe})`);
    disc.addColorStop(1.00, `rgba(0,0,0,0)`);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();

    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  COMETA — núcleo + coma + cola de polvo + cola iónica
  // ════════════════════════════════════════════════════════════════════════
  function spawnComet(W, H) {
    const speed = 0.6 + Math.random() * 0.5;
    const angle = (8 + Math.random() * 22) * Math.PI / 180; // 8-30° descendente
    return {
      x:       -120,
      y:        H * (0.05 + Math.random() * 0.50),
      vx:       Math.cos(angle) * speed,
      vy:       Math.sin(angle) * speed,
      tailLen:  280 + Math.random() * 180,
      alpha:    0,
      active:   true,
    };
  }

  function drawComet(c, W) {
    if (!c.active) return;

    // Fade in/out suave
    if (c.x < W * 0.12)       c.alpha = Math.min(1, c.alpha + 0.018);
    else if (c.x > W * 0.72)  c.alpha = Math.max(0, c.alpha - 0.014);
    if (c.x > W + 160)        { c.active = false; return; }

    const len = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
    const nx  = c.vx / len;   // dirección normalizada
    const ny  = c.vy / len;
    const px  = -ny;          // perpendicular para abanico de polvo
    const py  =  nx;

    const tailEndX = c.x - nx * c.tailLen;
    const tailEndY = c.y - ny * c.tailLen;

    ctx.save();
    ctx.globalAlpha = c.alpha;

    // — Cola de polvo (dorada, ancha, se abre en abanico) —
    const spread = c.tailLen * 0.16;
    const dustGrad = ctx.createLinearGradient(tailEndX, tailEndY, c.x, c.y);
    dustGrad.addColorStop(0.00, 'rgba(180,148,60,0)');
    dustGrad.addColorStop(0.50, 'rgba(210,175,85,0.10)');
    dustGrad.addColorStop(0.85, 'rgba(235,205,110,0.22)');
    dustGrad.addColorStop(1.00, 'rgba(255,228,140,0.35)');

    ctx.beginPath();
    ctx.moveTo(tailEndX + px * spread, tailEndY + py * spread);
    ctx.quadraticCurveTo(c.x - nx * c.tailLen * 0.4, c.y - ny * c.tailLen * 0.4, c.x, c.y);
    ctx.quadraticCurveTo(c.x - nx * c.tailLen * 0.4, c.y - ny * c.tailLen * 0.4, tailEndX - px * spread, tailEndY - py * spread);
    ctx.closePath();
    ctx.fillStyle = dustGrad;
    ctx.fill();

    // — Cola iónica (azul-blanca, estrecha y recta) —
    const ionGrad = ctx.createLinearGradient(tailEndX, tailEndY, c.x, c.y);
    ionGrad.addColorStop(0.00, 'rgba(140,210,255,0)');
    ionGrad.addColorStop(0.45, 'rgba(180,230,255,0.25)');
    ionGrad.addColorStop(0.80, 'rgba(210,242,255,0.55)');
    ionGrad.addColorStop(1.00, 'rgba(240,252,255,0.85)');

    ctx.beginPath();
    ctx.moveTo(tailEndX, tailEndY);
    ctx.lineTo(c.x, c.y);
    ctx.strokeStyle = ionGrad;
    ctx.lineWidth   = 1.8;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // — Coma (halo difuso alrededor del núcleo) —
    const comaGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 22);
    comaGrad.addColorStop(0.00, 'rgba(255,252,230,0.95)');
    comaGrad.addColorStop(0.20, 'rgba(220,240,255,0.65)');
    comaGrad.addColorStop(0.55, 'rgba(180,220,255,0.22)');
    comaGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.arc(c.x, c.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = comaGrad;
    ctx.fill();

    // — Núcleo puntual brillante —
    const nuclGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 4);
    nuclGrad.addColorStop(0, 'rgba(255,255,255,1)');
    nuclGrad.addColorStop(1, 'rgba(200,230,255,0)');

    ctx.beginPath();
    ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = nuclGrad;
    ctx.fill();

    ctx.restore();

    c.x += c.vx;
    c.y += c.vy;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ESTRELLAS FUGACES — rápidas, con estela brillante
  // ════════════════════════════════════════════════════════════════════════
  function spawnShootingStar(W, H) {
    const angle = (18 + Math.random() * 38) * Math.PI / 180;
    const speed = 14 + Math.random() * 12;
    // Colores: blanco puro, azul-blanco tenue, o dorado suave
    const tints = [[255,255,255],[220,235,255],[255,245,200],[210,225,255]];
    const [r, g, b] = tints[Math.floor(Math.random() * tints.length)];
    return {
      x:     Math.random() * W * 1.1,
      y:     Math.random() * H * 0.65,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      len:   90 + Math.random() * 130,
      life:  1.0,
      decay: 0.018 + Math.random() * 0.014,
      w:     0.9 + Math.random() * 1.4,
      r, g, b,
    };
  }

  function drawShootingStar(s) {
    const tailX = s.x - (s.vx / 15) * s.len;
    const tailY = s.y - (s.vy / 15) * s.len;

    const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
    grad.addColorStop(0.00, `rgba(${s.r},${s.g},${s.b},0)`);
    grad.addColorStop(0.60, `rgba(${s.r},${s.g},${s.b},${(s.life * 0.55).toFixed(2)})`);
    grad.addColorStop(1.00, `rgba(${s.r},${s.g},${s.b},${s.life.toFixed(2)})`);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(s.x, s.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = s.w * s.life;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Destello puntual en la cabeza
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.w * 2 * s.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${s.life.toFixed(2)})`;
    ctx.fill();
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LOOP PRINCIPAL
  // ════════════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // 1. Nebulosa de fondo
    drawNebula();

    // 2. Galaxia lejana
    drawGalaxy();

    // 3. Cometa (gestión de spawn)
    if (!comet || !comet.active) {
      nextCometIn--;
      if (nextCometIn <= 0) {
        comet       = spawnComet(W, H);
        nextCometIn = 2400 + Math.floor(Math.random() * 2400); // 40-80 s
      }
    }
    if (comet) drawComet(comet, W);

    // 4. Estrellas fugaces (gestión de spawn)
    nextStarIn--;
    if (nextStarIn <= 0) {
      shootingStars.push(spawnShootingStar(W, H));
      nextStarIn = 200 + Math.floor(Math.random() * 280); // 3-8 s
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      drawShootingStar(s);
      s.x   += s.vx;
      s.y   += s.vy;
      s.life -= s.decay;
      if (s.life <= 0 || s.x > W + 50 || s.y > H + 50) {
        shootingStars.splice(i, 1);
      }
    }

    raf = requestAnimationFrame(frame);
  }

  // ── Resize ───────────────────────────────────────────────────────────────
  function resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    initNebula(canvas.width, canvas.height);
    initGalaxy(canvas.width, canvas.height);
  }

  // ── API pública ──────────────────────────────────────────────────────────
  return {
    start() {
      if (canvas) return;
      canvas = document.createElement('canvas');
      canvas.id = 'orak-cosmos-canvas';
      Object.assign(canvas.style, {
        position:      'fixed',
        inset:         '0',
        pointerEvents: 'none',
        zIndex:        '-1',
      });
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      resize();
      nextStarIn  = 80;   // primera estrella fugaz a ~1.3s
      nextCometIn = 420;  // primer cometa a ~7s para que el usuario lo vea pronto
      window.addEventListener('resize', resize);
      t = 0;
      frame();
    },

    stop() {
      if (!canvas) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
      canvas = ctx = raf = null;
      comet       = null;
      nextCometIn = 420;
      nextStarIn  = 80;
      shootingStars.length = 0;
      t = 0;
    },
  };
})();

export { CosmosRenderer };
