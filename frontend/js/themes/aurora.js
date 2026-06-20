// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/aurora.js
//  Aurora Boreal — renderizador Canvas 2D
//
//  El canvas usa z-index:-1 para quedar por debajo de todo el
//  contenido de la página. El theme-engine se encarga de mover
//  el color de fondo de <body> a <html> para que el canvas sea
//  visible a través del body transparente.
// ════════════════════════════════════════════════════════════════

const AuroraRenderer = (() => {

  let canvas = null;
  let ctx    = null;
  let raf    = null;
  let t      = 0;

  // ── Estrellas (posiciones deterministas, bien distribuidas) ──────────────
  const STARS = Array.from({ length: 60 }, (_, i) => ({
    x:     (i * 173.71 + 5.3)  % 100,
    y:     (i * 127.37 + 8.1)  % 52,
    r:     i % 5 === 0 ? 1.5 : i % 3 === 0 ? 1.1 : 0.85,
    phase: i * 0.713,
  }));

  // ── Bandas de aurora ─────────────────────────────────────────────────────
  // baseY : posición vertical central (0=top, 1=bottom)
  // amp   : amplitud de la onda
  // freq  : frecuencia espacial
  // speed : velocidad temporal
  // alpha : opacidad máxima
  // halfH : radio vertical como fracción de pantalla
  const BANDS = [
    // Verde — el color más icónico de la aurora real (O III, 100-150 km altitud)
    { r:0,   g:255, b:135, baseY:.33, amp:.068, freq:.0052, speed:.00050, alpha:.65, halfH:.095 },
    // Teal/cyan — segunda capa característica
    { r:0,   g:232, b:212, baseY:.44, amp:.052, freq:.0040, speed:.00036, alpha:.45, halfH:.080 },
    // Violeta — gas ionizado a mayor altitud (>150 km)
    { r:145, g:55,  b:255, baseY:.21, amp:.075, freq:.0068, speed:.00065, alpha:.35, halfH:.072 },
    // Cyan vivo — destellos y pulsos
    { r:0,   g:215, b:255, baseY:.52, amp:.040, freq:.0058, speed:.00042, alpha:.30, halfH:.060 },
    // Rosa/magenta — emisión de nitrógeno, poco frecuente y hermosa
    { r:205, g:85,  b:255, baseY:.14, amp:.058, freq:.0088, speed:.00072, alpha:.22, halfH:.058 },
    // Verde claro adicional — da profundidad a la cortina
    { r:60,  g:255, b:160, baseY:.38, amp:.044, freq:.0074, speed:.00058, alpha:.28, halfH:.065 },
  ];

  // ── Dibujar estrellas ────────────────────────────────────────────────────
  function drawStars(W, H) {
    ctx.save();
    STARS.forEach(s => {
      const a = 0.22 + 0.18 * Math.sin(t * 0.0011 + s.phase);
      ctx.globalAlpha = a;
      ctx.fillStyle   = 'rgba(195,228,255,1)';
      ctx.beginPath();
      ctx.arc(s.x / 100 * W, s.y / 100 * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ── Dibujar una banda de aurora ──────────────────────────────────────────
  function drawBand(band, W, H) {
    const { r, g, b, baseY, amp, freq, speed, alpha, halfH } = band;

    // Pulsación orgánica lenta e independiente por banda
    const pulse  = 0.68 + 0.32 * Math.sin(t * 0.00080 + baseY * 6.5);
    const bandPx = H * halfH;
    const N      = 100;

    ctx.save();
    ctx.globalAlpha              = alpha * pulse;
    ctx.globalCompositeOperation = 'screen'; // las bandas suman luz entre sí

    // Path sinusoidal de la banda
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      const y = H * baseY + H * amp * Math.sin(x * freq + t * speed) - bandPx;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const x = (i / N) * W;
      const y = H * baseY + H * amp * Math.sin(x * freq + t * speed) + bandPx;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();

    // Gradiente vertical — borde inferior más brillante (física real de aurora)
    const cy   = H * baseY;
    const grad = ctx.createLinearGradient(0, cy - bandPx * 1.6, 0, cy + bandPx * 1.6);
    grad.addColorStop(0.00, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},0.18)`);
    grad.addColorStop(0.55, `rgba(${r},${g},${b},0.80)`);
    grad.addColorStop(0.74, `rgba(${r},${g},${b},1.00)`);
    grad.addColorStop(0.87, `rgba(${r},${g},${b},0.60)`);
    grad.addColorStop(1.00, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  // ── Loop principal ───────────────────────────────────────────────────────
  function frame() {
    t++;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    drawStars(W, H);
    BANDS.forEach(band => drawBand(band, W, H));
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ── API pública ──────────────────────────────────────────────────────────
  return {
    start() {
      if (canvas) return;
      canvas = document.createElement('canvas');
      canvas.id = 'orak-aurora-canvas';
      Object.assign(canvas.style, {
        position:      'fixed',
        inset:         '0',
        pointerEvents: 'none',
        zIndex:        '-1',   // siempre por debajo de todo el contenido
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
      t = 0;
    },
  };
})();

export { AuroraRenderer };
