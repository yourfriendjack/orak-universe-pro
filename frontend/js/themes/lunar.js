// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/lunar.js
//  Observatorio Lunar — renderizador Canvas 2D premium
//
//  Capas (de atrás hacia adelante, z-index:-1):
//    1. Luz de luna ambiental difusa
//    2. Campo estelar — 160 estrellas con parpadeo y difracción
//    3. Polvo cósmico — 65 partículas ultralentas ascendentes
//    4. Luna llena — halo volumétrico + esfera con mare y cráteres
//
//  La UI (feed, topbar, cards) flota encima con Soul Glass (CSS).
// ════════════════════════════════════════════════════════════════

const LunarRenderer = (() => {

  let canvas = null;
  let ctx    = null;
  let raf    = null;
  let t      = 0;

  // ── Posición de la luna (fracción de pantalla) ──────────────────────────
  const MOON_XF = 0.835;   // derecha
  const MOON_YF = 0.145;   // arriba
  const MOON_R  = 72;      // radio fijo en px (igual que el CSS: 140px/2)

  // ── Campo estelar — distribución determinista (sin Math.random en init) ─
  const STARS = Array.from({ length: 160 }, (_, i) => {
    const x     = (i * 173.71 + 5.30) % 100;    // porcentaje del ancho
    const y     = (i * 127.37 + 8.10) % 88;     // porcentaje del alto (zona cielo)
    const r     = i % 7 === 0 ? 1.55 : i % 4 === 0 ? 1.15 : i % 3 === 0 ? 0.85 : 0.58;
    const phase = i * 0.7131;
    const spd   = 0.000520 + (i % 7) * 0.000175; // velocidades de parpadeo distintas
    return {
      x, y, r, phase, spd,
      warm:  i % 9 === 0,   // estrella cálida (amarillo tenue)
      cold:  i % 5 === 0,   // estrella fría (azul-blanco)
    };
  });

  // ── Cráteres de la luna — [cx%, cy%, radio%, profundidad 0-1] ───────────
  const CRATERS = [
    [-0.280, -0.220, 0.115, 0.62],
    [ 0.240,  0.300, 0.080, 0.52],
    [-0.120,  0.420, 0.062, 0.56],
    [ 0.400, -0.280, 0.068, 0.50],
    [-0.420,  0.120, 0.048, 0.44],
    [ 0.100, -0.400, 0.042, 0.50],
    [ 0.360,  0.120, 0.092, 0.55],
    [-0.080,  0.080, 0.052, 0.38],
    [ 0.180, -0.140, 0.035, 0.42],
    [-0.340,  0.380, 0.038, 0.46],
  ];

  // ── Mares lunares — [ox%, oy%, tamaño%, opacidad] ───────────────────────
  const MARES = [
    [ 0.14, -0.20, 0.42, 0.36],
    [-0.22,  0.18, 0.30, 0.32],
    [ 0.28,  0.30, 0.22, 0.28],
    [-0.05, -0.05, 0.18, 0.24],
  ];

  // ── Polvo cósmico — se inicializa en start() / resize() ─────────────────
  let dust = null;

  function initDust(W, H) {
    dust = Array.from({ length: 65 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      size:  0.35 + Math.random() * 0.90,
      vx:    (Math.random() - 0.5) * 0.060,
      vy:   -0.032 - Math.random() * 0.055,
      alpha: 0.038 + Math.random() * 0.098,
      phase: Math.random() * Math.PI * 2,
      lit:   Math.random() < 0.28,
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  //  MOONLIGHT — iluminación ambiental diagonal
  // ════════════════════════════════════════════════════════════════════════
  function drawMoonlight(W, H) {
    const bv = 1 + 0.065 * Math.sin(t * 0.00048);
    const mx = W * MOON_XF;

    const beam = ctx.createRadialGradient(mx, 0, 0, mx, 0, W * 0.95);
    beam.addColorStop(0.00, `rgba(178,206,242,${0.020 * bv})`);
    beam.addColorStop(0.38, `rgba(158,188,230,${0.011 * bv})`);
    beam.addColorStop(0.72, `rgba(128,162,218,${0.005 * bv})`);
    beam.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.fill();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ESTRELLAS — campo con parpadeo orgánico y difracción
  // ════════════════════════════════════════════════════════════════════════
  function drawStars(W, H) {
    const mx   = W * MOON_XF;
    const my   = H * MOON_YF;
    const excl = (MOON_R * 1.18) ** 2;  // zona de exclusión alrededor de la luna

    ctx.save();
    STARS.forEach(s => {
      const sx = s.x / 100 * W;
      const sy = s.y / 100 * H;

      // No dibujar estrellas que quedarían "detrás" de la luna
      const dx = sx - mx, dy = sy - my;
      if (dx * dx + dy * dy < excl) return;

      const tw = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * s.spd + s.phase));
      const al = tw * (0.36 + s.r * 0.24);

      const col = s.warm ? `rgba(255,245,215,${al})`
                : s.cold ? `rgba(210,228,255,${al})`
                :           `rgba(218,230,255,${al})`;
      ctx.globalAlpha = 1;
      ctx.fillStyle   = col;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();

      // Difracción de 4 rayos para estrellas más brillantes
      if (s.r > 1.1 && tw > 0.70) {
        const len = s.r * 3.5 * tw;
        ctx.globalAlpha  = tw * 0.25;
        ctx.strokeStyle  = s.warm ? 'rgba(255,245,215,1)' : 'rgba(210,228,255,1)';
        ctx.lineWidth    = 0.4;
        ctx.beginPath();
        ctx.moveTo(sx - len, sy); ctx.lineTo(sx + len, sy);
        ctx.moveTo(sx, sy - len); ctx.lineTo(sx, sy + len);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  POLVO CÓSMICO — partículas ultralentas
  // ════════════════════════════════════════════════════════════════════════
  function drawDust(W, H) {
    if (!dust) return;
    ctx.save();
    dust.forEach(p => {
      const tw = 0.65 + 0.35 * Math.sin(t * 0.00180 + p.phase);
      ctx.fillStyle = p.lit
        ? `rgba(205,222,252,${p.alpha * tw})`
        : `rgba(182,198,232,${p.alpha * tw})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -4)    { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -4)    { p.x = W + 4; }
      if (p.x > W + 4) { p.x = -4; }
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  LUNA — esfera volumétrica con textura real
  // ════════════════════════════════════════════════════════════════════════
  function drawMoon(W, H) {
    const mx = W * MOON_XF;
    const my = H * MOON_YF;
    const r  = MOON_R;
    const bv = 1 + 0.065 * Math.sin(t * 0.00048); // respiración muy lenta

    // ── 1. Halo lejano (atmósfera) ───────────────────────────────
    const farHalo = ctx.createRadialGradient(mx, my, r * 1.28, mx, my, r * 6.5);
    farHalo.addColorStop(0.00, `rgba(168,200,238,${0.050 * bv})`);
    farHalo.addColorStop(0.28, `rgba(148,182,228,${0.028 * bv})`);
    farHalo.addColorStop(0.60, `rgba(120,158,212,${0.012 * bv})`);
    farHalo.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(mx, my, r * 6.5, 0, Math.PI * 2);
    ctx.fillStyle = farHalo;
    ctx.fill();

    // ── 2. Halo cercano (corona) ─────────────────────────────────
    const nearHalo = ctx.createRadialGradient(mx, my, r * 0.90, mx, my, r * 2.6);
    nearHalo.addColorStop(0.00, `rgba(195,218,250,${0.24 * bv})`);
    nearHalo.addColorStop(0.38, `rgba(175,205,244,${0.14 * bv})`);
    nearHalo.addColorStop(0.72, `rgba(155,188,235,${0.055 * bv})`);
    nearHalo.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(mx, my, r * 2.6, 0, Math.PI * 2);
    ctx.fillStyle = nearHalo;
    ctx.fill();

    // ── 3. Esfera lunar (clipeada) ───────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.clip();

    // Esfera base — iluminada desde arriba-izquierda
    const sphere = ctx.createRadialGradient(
      mx - r * 0.30, my - r * 0.28, r * 0.02,
      mx + r * 0.06, my + r * 0.05, r * 1.08
    );
    sphere.addColorStop(0.00, '#ffffff');
    sphere.addColorStop(0.10, '#f5f8ff');
    sphere.addColorStop(0.32, '#edf1ff');
    sphere.addColorStop(0.58, '#dee8fc');
    sphere.addColorStop(0.80, '#ccd5f0');
    sphere.addColorStop(1.00, '#b2c2e4');
    ctx.fillStyle = sphere;
    ctx.fillRect(mx - r - 1, my - r - 1, r * 2 + 2, r * 2 + 2);

    // Mares (manchas oscuras — "mares lunares")
    ctx.globalCompositeOperation = 'multiply';
    MARES.forEach(([ox, oy, sz, depth]) => {
      const gx = mx + ox * r, gy = my + oy * r, gr = sz * r;
      const mare = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      mare.addColorStop(0.00, `rgba(150,165,208,${depth})`);
      mare.addColorStop(0.50, `rgba(168,182,216,${depth * 0.60})`);
      mare.addColorStop(1.00, 'rgba(200,210,230,0)');
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fillStyle = mare;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    // Cráteres (sombra + borde iluminado)
    CRATERS.forEach(([cx, cy, cr, depth]) => {
      const crx = mx + cx * r;
      const cry = my + cy * r;
      const crr = cr * r;

      const shadow = ctx.createRadialGradient(
        crx + crr * 0.18, cry + crr * 0.18, 0,
        crx, cry, crr
      );
      shadow.addColorStop(0.00, `rgba(90,112,162,${depth * 0.44})`);
      shadow.addColorStop(0.55, `rgba(122,142,188,${depth * 0.22})`);
      shadow.addColorStop(1.00, 'rgba(192,208,232,0)');
      ctx.beginPath();
      ctx.arc(crx, cry, crr, 0, Math.PI * 2);
      ctx.fillStyle = shadow;
      ctx.fill();

      // Borde iluminado (arco en el lado de la luz)
      ctx.save();
      ctx.beginPath();
      ctx.arc(crx, cry, crr * 0.88, Math.PI * 0.62, Math.PI * 1.88);
      ctx.strokeStyle = `rgba(255,255,255,${depth * 0.30})`;
      ctx.lineWidth   = crr * 0.22;
      ctx.lineCap     = 'round';
      ctx.stroke();
      ctx.restore();
    });

    // Oscurecimiento de limbo (borde de la esfera más oscuro — real)
    const limb = ctx.createRadialGradient(
      mx - r * 0.05, my - r * 0.05, r * 0.68,
      mx, my, r
    );
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(1, 'rgba(28,40,80,0.24)');
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fillStyle = limb;
    ctx.fill();

    ctx.restore();

    // ── 4. Brillo especular del borde ────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    const rim = ctx.createLinearGradient(mx - r, my - r, mx + r * 0.28, my + r * 0.28);
    rim.addColorStop(0.00, 'rgba(255,255,255,0.22)');
    rim.addColorStop(0.45, 'rgba(255,255,255,0.05)');
    rim.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.strokeStyle = rim;
    ctx.lineWidth   = 1.8;
    ctx.stroke();
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

    drawMoonlight(W, H);
    drawStars(W, H);
    drawDust(W, H);
    drawMoon(W, H);

    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    initDust(canvas.width, canvas.height);
  }

  // ── API pública ──────────────────────────────────────────────────────────
  return {
    start() {
      if (canvas) return;
      canvas = document.createElement('canvas');
      canvas.id = 'orak-lunar-canvas';
      Object.assign(canvas.style, {
        position:      'fixed',
        inset:         '0',
        pointerEvents: 'none',
        zIndex:        '-1',
      });
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      resize();
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
      dust = null;
      t = 0;
    },
  };
})();

export { LunarRenderer };
