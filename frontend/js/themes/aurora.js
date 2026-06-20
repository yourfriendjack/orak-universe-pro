// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/aurora.js
//  Aurora Boreal — renderizador Canvas 2D realista
//  Técnica: path sinusoidal por banda + clip + gradiente vertical
// ════════════════════════════════════════════════════════════════

const AuroraRenderer = (() => {

  let canvas = null;
  let ctx    = null;
  let raf    = null;
  let t      = 0;

  // ── Estrellas de fondo (posiciones deterministas pero bien distribuidas) ──
  const STARS = Array.from({ length: 60 }, (_, i) => ({
    x:     (i * 173.71 + 5.3)  % 100,   // % del ancho
    y:     (i * 127.37 + 8.1)  % 52,    // % de la altura, solo zona superior
    r:     i % 5 === 0 ? 1.5 : i % 3 === 0 ? 1.2 : 0.85,
    phase: i * 0.713,                    // fase única para el brillo
  }));

  // ── Bandas de aurora (cada una es una cortina sinusoidal) ────────────────
  // baseY   : posición vertical central (0=top, 1=bottom)
  // amp     : amplitud de la onda como fracción de pantalla
  // freq    : frecuencia espacial (cuánto ondula horizontalmente)
  // speed   : velocidad del desplazamiento temporal
  // alpha   : opacidad máxima de la banda
  // halfH   : radio vertical de la banda como fracción de pantalla
  const BANDS = [
    // Verde — el color dominante y más icónico de la aurora real
    { r:0,   g:255, b:135, baseY:.33, amp:.070, freq:.0050, speed:.00048, alpha:.68, halfH:.100 },
    // Teal/cyan — segunda capa característica
    { r:0,   g:232, b:212, baseY:.46, amp:.054, freq:.0038, speed:.00034, alpha:.48, halfH:.085 },
    // Violeta profundo — aparece en los bordes superiores de la aurora real
    { r:148, g:52,  b:255, baseY:.22, amp:.078, freq:.0065, speed:.00062, alpha:.38, halfH:.075 },
    // Cyan vivo — destellos y reflejos
    { r:0,   g:215, b:255, baseY:.54, amp:.042, freq:.0055, speed:.00040, alpha:.32, halfH:.065 },
    // Rosa suave — aurora de nitrógeno, rara y espectacular
    { r:210, g:80,  b:255, baseY:.15, amp:.060, freq:.0085, speed:.00070, alpha:.25, halfH:.062 },
    // Verde claro adicional — da profundidad y capas
    { r:55,  g:255, b:165, baseY:.40, amp:.046, freq:.0072, speed:.00055, alpha:.30, halfH:.068 },
  ];

  // ── Renderizar campo de estrellas ─────────────────────────────────────────
  function drawStars(W, H) {
    ctx.save();
    STARS.forEach(s => {
      const alpha = 0.22 + 0.18 * Math.sin(t * 0.0011 + s.phase);
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = 'rgba(195,228,255,1)';
      ctx.beginPath();
      ctx.arc(s.x / 100 * W, s.y / 100 * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ── Renderizar una banda de aurora ────────────────────────────────────────
  function drawBand(band, W, H) {
    const { r, g, b, baseY, amp, freq, speed, alpha, halfH } = band;

    // Pulsación orgánica lenta e independiente por banda
    const pulse   = 0.68 + 0.32 * Math.sin(t * 0.00080 + baseY * 6.5);
    const bandPx  = H * halfH;          // radio de la banda en píxeles
    const N       = 110;                // segmentos del path (más = más suave)

    ctx.save();
    ctx.globalAlpha          = alpha * pulse;
    ctx.globalCompositeOperation = 'screen'; // las bandas suman luz entre sí

    // Construir el path ondulado de la banda
    ctx.beginPath();

    // Borde superior: y = base + onda - radio
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      const y = H * baseY + H * amp * Math.sin(x * freq + t * speed) - bandPx;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    // Borde inferior: misma onda + radio (reversed)
    for (let i = N; i >= 0; i--) {
      const x = (i / N) * W;
      const y = H * baseY + H * amp * Math.sin(x * freq + t * speed) + bandPx;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();   // el path es la máscara de la banda

    // Gradiente vertical dentro de la banda
    // En la aurora real el borde inferior es el más brillante (frente del gas)
    const cy   = H * baseY;
    const yTop = cy - bandPx * 1.6;
    const yBot = cy + bandPx * 1.6;
    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0.00, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},0.18)`);
    grad.addColorStop(0.55, `rgba(${r},${g},${b},0.80)`);
    grad.addColorStop(0.74, `rgba(${r},${g},${b},1.00)`);  // borde inferior: máximo brillo
    grad.addColorStop(0.87, `rgba(${r},${g},${b},0.60)`);
    grad.addColorStop(1.00, `rgba(${r},${g},${b},0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);   // fillRect está clippeado al path ondulado

    ctx.restore();
  }

  // ── Loop principal ────────────────────────────────────────────────────────
  function frame() {
    t++;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    drawStars(W, H);
    BANDS.forEach(band => drawBand(band, W, H));

    raf = requestAnimationFrame(frame);
  }

  // ── Resize handler ────────────────────────────────────────────────────────
  function resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ── API pública ───────────────────────────────────────────────────────────
  return {
    start() {
      if (canvas) return;

      canvas = document.createElement('canvas');
      canvas.id = 'orak-aurora-canvas';
      Object.assign(canvas.style, {
        position:      'fixed',
        inset:         '0',
        pointerEvents: 'none',
        zIndex:        '0',
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
