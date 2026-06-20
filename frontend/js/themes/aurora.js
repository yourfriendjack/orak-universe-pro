// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/aurora.js
//  Aurora Boreal — renderizador Canvas 2D realista
//
//  Técnica de mezcla suave:
//    Las bandas se dibujan en un canvas secundario a 1/4 de
//    resolución y se escalan al canvas principal. La interpolación
//    bilineal del navegador funde los bordes exactamente como
//    ocurre en una aurora real, sin que se noten divisiones.
//    Las estrellas se pintan en alta resolución encima.
// ════════════════════════════════════════════════════════════════

const AuroraRenderer = (() => {

  let canvas    = null;   // canvas principal (resolución completa)
  let ctx       = null;
  let offscreen = null;   // canvas de bandas (¼ de resolución)
  let offCtx    = null;
  let raf       = null;
  let t         = 0;

  const SCALE = 4;  // factor de reducción para las bandas

  // ── Estrellas (posiciones deterministas, bien distribuidas) ──────────────
  const STARS = Array.from({ length: 65 }, (_, i) => ({
    x:     (i * 173.71 + 5.3)  % 100,
    y:     (i * 127.37 + 8.1)  % 52,
    r:     i % 5 === 0 ? 1.5 : i % 3 === 0 ? 1.1 : 0.8,
    phase: i * 0.713,
  }));

  // ── Bandas de aurora — más bandas, más solapamiento, más mezcla ──────────
  // Con la técnica de escala ¼, los colores se funden de forma orgánica.
  // baseY  : posición vertical central (0=top, 1=bottom)
  // amp    : amplitud de la onda
  // freq   : frecuencia espacial de la onda
  // speed  : velocidad de avance en el tiempo
  // alpha  : opacidad máxima de la banda
  // halfH  : radio vertical como fracción de pantalla (más grande = más mezcla)
  const BANDS = [
    // Verde brillante — el color más icónico de la aurora (O III, 100-150 km)
    { r:0,   g:255, b:130, baseY:.33, amp:.078, freq:.0046, speed:.00044, alpha:.62, halfH:.130 },
    // Verde-teal suave — segunda capa que se solapa con la anterior
    { r:15,  g:242, b:168, baseY:.42, amp:.062, freq:.0060, speed:.00050, alpha:.45, halfH:.110 },
    // Teal puro — transición hacia los azules
    { r:0,   g:225, b:208, baseY:.50, amp:.050, freq:.0036, speed:.00032, alpha:.42, halfH:.095 },
    // Verde brillante superior — corona de la cortina
    { r:95,  g:255, b:108, baseY:.26, amp:.058, freq:.0056, speed:.00041, alpha:.28, halfH:.085 },
    // Violeta — gas ionizado a mayor altitud (>150 km)
    { r:142, g:48,  b:255, baseY:.21, amp:.085, freq:.0062, speed:.00058, alpha:.35, halfH:.090 },
    // Azul-violeta suave — mezcla entre violeta y cyan
    { r:68,  g:110, b:255, baseY:.29, amp:.068, freq:.0074, speed:.00065, alpha:.25, halfH:.080 },
    // Cyan vivo — destellos y pulsos rápidos
    { r:0,   g:212, b:255, baseY:.56, amp:.044, freq:.0052, speed:.00038, alpha:.30, halfH:.078 },
    // Rosa suave — emisión de nitrógeno, poco frecuente pero hermosa
    { r:212, g:78,  b:255, baseY:.15, amp:.068, freq:.0080, speed:.00066, alpha:.22, halfH:.072 },
    // Verde oscuro en la base — profundidad visual de la cortina
    { r:0,   g:195, b:175, baseY:.62, amp:.036, freq:.0070, speed:.00046, alpha:.28, halfH:.068 },
  ];

  // ── Dibujar una banda en el canvas de baja resolución ───────────────────
  function drawBand(oc, ow, oh, band) {
    const { r, g, b, baseY, amp, freq, speed, alpha, halfH } = band;

    // Cada banda respira con su propio ritmo
    const pulse  = 0.65 + 0.35 * Math.sin(t * 0.00078 + baseY * 6.8);
    const bandPx = oh * halfH;
    const N      = 80;    // segmentos del path ondulado

    oc.save();
    oc.globalAlpha              = alpha * pulse;
    oc.globalCompositeOperation = 'screen';

    // Construir la silueta sinusoidal de la banda
    oc.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * ow;
      const y = oh * baseY + oh * amp * Math.sin(x * freq * SCALE + t * speed) - bandPx;
      i === 0 ? oc.moveTo(x, y) : oc.lineTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const x = (i / N) * ow;
      const y = oh * baseY + oh * amp * Math.sin(x * freq * SCALE + t * speed) + bandPx;
      oc.lineTo(x, y);
    }
    oc.closePath();
    oc.clip();

    // Gradiente vertical con transición muy suave
    // (el borde inferior es el más brillante — física real de la aurora)
    const cy   = oh * baseY;
    const grad = oc.createLinearGradient(0, cy - bandPx * 1.8, 0, cy + bandPx * 1.8);
    grad.addColorStop(0.00, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.18, `rgba(${r},${g},${b},0.10)`);
    grad.addColorStop(0.48, `rgba(${r},${g},${b},0.72)`);
    grad.addColorStop(0.70, `rgba(${r},${g},${b},1.00)`);
    grad.addColorStop(0.84, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(1.00, `rgba(${r},${g},${b},0)`);

    oc.fillStyle = grad;
    oc.fillRect(0, 0, ow, oh);

    oc.restore();
  }

  // ── Dibujar estrellas en alta resolución ────────────────────────────────
  function drawStars(W, H) {
    ctx.save();
    STARS.forEach(s => {
      const a = 0.20 + 0.18 * Math.sin(t * 0.0010 + s.phase);
      ctx.globalAlpha = a;
      ctx.fillStyle   = 'rgba(198,230,255,1)';
      ctx.beginPath();
      ctx.arc(s.x / 100 * W, s.y / 100 * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ── Loop principal ───────────────────────────────────────────────────────
  function frame() {
    t++;
    const W  = canvas.width;
    const H  = canvas.height;
    const ow = Math.ceil(W / SCALE);
    const oh = Math.ceil(H / SCALE);

    // Ajustar tamaño del canvas secundario si la ventana cambió
    if (offscreen.width !== ow || offscreen.height !== oh) {
      offscreen.width  = ow;
      offscreen.height = oh;
    }

    // 1. Renderizar bandas a baja resolución
    offCtx.clearRect(0, 0, ow, oh);
    BANDS.forEach(band => drawBand(offCtx, ow, oh, band));

    // 2. Escalar al canvas principal — la interpolación bilineal funde los bordes
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, W, H);

    // 3. Estrellas encima, en alta resolución y nítidas
    drawStars(W, H);

    raf = requestAnimationFrame(frame);
  }

  // ── Resize ───────────────────────────────────────────────────────────────
  function resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ── API pública ──────────────────────────────────────────────────────────
  return {
    start() {
      if (canvas) return;

      // Canvas principal (full res) — solo estrellas y la imagen escalada
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

      // Canvas secundario (¼ res) — donde se dibujan las bandas de aurora
      offscreen = document.createElement('canvas');
      offCtx    = offscreen.getContext('2d');

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
      canvas = ctx = offscreen = offCtx = raf = null;
      t = 0;
    },
  };
})();

export { AuroraRenderer };
