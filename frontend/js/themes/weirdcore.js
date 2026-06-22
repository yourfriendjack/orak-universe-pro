// ════════════════════════════════════════════════════════════════
//  frontend/js/themes/weirdcore.js
//  Weirdcore — El Lugar Que Ya Conoces
//
//  bgCanvas  (z:-1)   → suelo ajedrezado en perspectiva, 20 ojos
//                        de todos los tamaños siempre observando,
//                        ventanas empañadas con ojo al despejarse,
//                        flores gigantes fuera de proporción,
//                        fragmentos de texto del vacío, grano VHS
//
//  overCanvas (z:9998) → cursor con trail de letras y reflejo en suelo
// ════════════════════════════════════════════════════════════════

const WeirdcoreRenderer = (() => {

  let bgCanvas = null, bgCtx = null;
  let overCanvas = null, overCtx = null;
  let raf = null, t = 0;

  // ── Fragmentos de texto del vacío ─────────────────────────────
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

  // ── Colores del piso pastel ────────────────────────────────────
  const FLOOR_COLS = [
    [255, 182, 205],
    [168, 230, 190],
    [255, 236, 158],
    [195, 178, 238],
  ];

  // ── Flores gigantes: [xFrac, yFrac, radioFrac, color pétalo] ──
  const FLOWER_SPECS = [
    { xF:-0.07, yF:0.68, rF:0.21, petal:'245,245,245' },
    { xF: 1.04, yF:0.15, rF:0.16, petal:'245,245,245' },
    { xF: 0.88, yF:0.88, rF:0.14, petal:'255,200,218' },
    { xF: 0.22, yF:-0.04,rF:0.11, petal:'255,232,130' },
    { xF: 0.52, yF:0.17, rF:0.056,petal:'245,245,245' },
    { xF: 0.16, yF:0.40, rF:0.046,petal:'255,185,208' },
    { xF: 0.76, yF:0.55, rF:0.050,petal:'245,245,245' },
  ];

  // ── 20 ojos: [xFrac, yFrac, tamaño base px] ───────────────────
  // Mezcla de enormes, medianos, pequeños y diminutos
  const EYE_CONFIGS = [
    // Grandes: dominan la escena
    [0.08, 0.18, 72], [0.75, 0.10, 64], [0.45, 0.28, 54],
    [0.90, 0.35, 70], [0.15, 0.62, 60], [0.62, 0.72, 72],
    [0.30, 0.85, 48], [0.84, 0.78, 56], [0.50, 0.46, 44],
    // Medianos: relleno de espacio
    [0.28, 0.20, 34], [0.56, 0.52, 38], [0.05, 0.42, 28],
    [0.70, 0.46, 40], [0.38, 0.65, 32],
    // Pequeños y diminutos: sensación de que hay ojos en todas partes
    [0.18, 0.08, 14], [0.63, 0.15, 12], [0.35, 0.42, 11],
    [0.92, 0.58, 15], [0.48, 0.88, 13], [0.72, 0.28, 10],
  ];

  // ── Estado global ──────────────────────────────────────────────
  let windows = null;
  let eyes    = null;
  let frags   = null;
  let flowers = null;

  // ── Cursor ────────────────────────────────────────────────────
  let mouseX = -999, mouseY = -999;
  let lastTrailT = 0, _onMove = null, _onClick = null;
  const letterTrail   = [];
  const cursorHistory = [];

  // ── Blooms de clic ────────────────────────────────────────────
  const blooms = [];

  let nextVHS = 120 + Math.floor(Math.random() * 200);
  const ALPHA_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?!@#';

  // ════════════════════════════════════════════════════════════════
  //  Ojo — función de dibujo compartida (usada por ojos y ventanas)
  // ════════════════════════════════════════════════════════════════
  function drawEyeShape(cx, cy, size, openAmt, alpha, iris) {
    if (openAmt < 0.01 || alpha < 0.005) return;
    const halfW = size;
    const halfH = size * 0.44 * openAmt;

    bgCtx.save();

    // Halo exterior que brilla en la oscuridad
    if (alpha > 0.15 && halfW > 10) {
      const halo = bgCtx.createRadialGradient(cx, cy, halfW * 0.4, cx, cy, halfW * 2.6);
      halo.addColorStop(0, `rgba(215,200,240,${alpha * 0.12})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = halo;
      bgCtx.beginPath();
      bgCtx.arc(cx, cy, halfW * 2.6, 0, Math.PI * 2);
      bgCtx.fill();
    }

    // Forma almendra
    bgCtx.beginPath();
    bgCtx.moveTo(cx - halfW, cy);
    bgCtx.bezierCurveTo(cx - halfW*0.35, cy - halfH*1.7, cx + halfW*0.35, cy - halfH*1.7, cx + halfW, cy);
    bgCtx.bezierCurveTo(cx + halfW*0.35, cy + halfH*1.7, cx - halfW*0.35, cy + halfH*1.7, cx - halfW, cy);
    bgCtx.closePath();

    // Esclerótica lavanda cremosa
    bgCtx.fillStyle = `rgba(228,220,242,${alpha * 0.90})`;
    bgCtx.fill();
    bgCtx.save();
    bgCtx.clip();

    // Iris profundo
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, halfH * 1.55, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(${iris},${alpha * 0.96})`;
    bgCtx.fill();

    // Pupila negra
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, halfH * 0.72, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(4,2,10,${alpha})`;
    bgCtx.fill();

    // Reflejo principal
    bgCtx.beginPath();
    bgCtx.arc(cx + halfH*0.26, cy - halfH*0.30, halfH * 0.20, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(248,242,255,${alpha * 0.82})`;
    bgCtx.fill();

    // Reflejo secundario pequeño
    bgCtx.beginPath();
    bgCtx.arc(cx - halfH*0.14, cy + halfH*0.22, halfH * 0.09, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(230,225,255,${alpha * 0.35})`;
    bgCtx.fill();

    bgCtx.restore(); // fin clip
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  Init
  // ════════════════════════════════════════════════════════════════
  function initWindows(W, H) {
    const GLOW_COLS = ['255,240,200','255,200,225','190,240,210','210,200,255','255,230,170'];
    const POS = [
      [0.13,0.10],[0.78,0.07],[0.40,0.36],
      [0.88,0.48],[0.20,0.58],[0.62,0.20],
    ];
    windows = Array.from({ length: 6 }, (_, i) => {
      const scale = 0.07 + (i * 0.053 % 1.0) * 0.10;
      const winH  = scale * H;
      const winW  = winH * 1.65;
      return {
        x: POS[i][0]*W, y: POS[i][1]*H, winW, winH,
        vx: Math.sin(i*1.73)*0.016, vy: Math.cos(i*2.51)*0.010,
        fog: 1.0, phase: 'fogged',
        timer:     80 + Math.floor((i*173.7) % 280),
        holdMax:  120 + Math.floor((i*211.3) % 180),
        holdCount: 0,
        glowR: GLOW_COLS[i % GLOW_COLS.length],
        eyeInWindow: i % 3 === 1,
      };
    });
  }

  function initEyes(W, H) {
    const IRIS_COLS = ['100,75,145','80,60,120','130,100,165','90,70,135'];
    eyes = EYE_CONFIGS.map(([xF, yF, baseSize], i) => ({
      x:             xF*W + (Math.random()-0.5)*W*0.05,
      y:             yF*H + (Math.random()-0.5)*H*0.05,
      size:          baseSize * (0.85 + Math.random()*0.30),
      alpha:         0.48 + Math.random()*0.44,
      blinkTimer:    60 + Math.floor(i*47 + Math.random()*240),
      blinking:      false,
      blinkProgress: 0,
      pulseOff:      i*0.31 + Math.random()*Math.PI*2,
      iris:          IRIS_COLS[i % 4],
      vx:            (Math.random()-0.5)*0.015,
      vy:            (Math.random()-0.5)*0.010,
    }));
  }

  function spawnFrag(W, H) {
    return {
      text:    POOL[Math.floor(Math.random()*POOL.length)],
      x:       W*(0.06 + Math.random()*0.88),
      y:       H*(0.06 + Math.random()*0.80),
      alpha:   0,
      size:    9 + Math.floor(Math.random()*7),
      phase:   'fadein',
      life:    0,
      maxLife: 140 + Math.floor(Math.random()*180),
      drift:   (Math.random()-0.5)*0.018,
    };
  }

  function initFrags(W, H) {
    frags = Array.from({ length: 6 }, () => spawnFrag(W, H));
    frags.forEach((f, i) => { f.life = Math.floor(i*55); });
  }

  function initFlowers(W, H) {
    flowers = FLOWER_SPECS.map((spec, i) => ({
      x:        spec.xF*W,
      y:        spec.yF*H,
      r:        spec.rF*Math.min(W, H),
      petal:    spec.petal,
      alpha:    0.24 + (i%3)*0.06,
      rot:      ((i*0.618)%1)*Math.PI*2,
      breathOff: i*0.73,
    }));
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Fondo abismal
  // ════════════════════════════════════════════════════════════════
  function drawBackground(W, H) {
    bgCtx.fillStyle = 'rgba(15,12,30,1)';
    bgCtx.fillRect(0, 0, W, H);

    const cx = W*0.5, cy = H*0.42;
    const ambient = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, H*0.75);
    ambient.addColorStop(0,   'rgba(220,200,240,0.030)');
    ambient.addColorStop(0.4, 'rgba(180,160,220,0.010)');
    ambient.addColorStop(1,   'rgba(0,0,0,0)');
    bgCtx.fillStyle = ambient;
    bgCtx.fillRect(0, 0, W, H);

    const vignette = bgCtx.createRadialGradient(cx, cy, H*0.20, cx, cy, H*1.05);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(5,3,12,0.72)');
    bgCtx.fillStyle = vignette;
    bgCtx.fillRect(0, 0, W, H);
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Suelo en perspectiva ajedrezado
  // ════════════════════════════════════════════════════════════════
  function drawFloorGrid(W, H) {
    const vpX = W*0.50, vpY = H*0.50, botY = H;
    const numV = 24, numH = 16;
    bgCtx.save();

    const fg = bgCtx.createLinearGradient(0, vpY, 0, botY);
    fg.addColorStop(0,   'rgba(190,170,220,0.00)');
    fg.addColorStop(0.5, 'rgba(190,170,220,0.015)');
    fg.addColorStop(1,   'rgba(190,170,220,0.045)');
    bgCtx.fillStyle = fg;
    bgCtx.fillRect(0, vpY, W, botY-vpY);

    for (let row = 0; row < numH-1; row++) {
      const p1 = Math.pow(row/numH, 1.8);
      const p2 = Math.pow((row+1)/numH, 1.8);
      const y1 = vpY+(botY-vpY)*p1, y2 = vpY+(botY-vpY)*p2;
      const t1 = (y1-vpY)/(botY-vpY), t2 = (y2-vpY)/(botY-vpY);
      for (let col = 0; col < numV; col++) {
        if ((row+col)%2 !== 0) continue;
        const bxL=(col/numV)*W, bxR=((col+1)/numV)*W;
        const x1l=vpX+(bxL-vpX)*t1, x1r=vpX+(bxR-vpX)*t1;
        const x2l=vpX+(bxL-vpX)*t2, x2r=vpX+(bxR-vpX)*t2;
        const ci = ((row+col)/2|0)%4;
        const [cr,cg,cb] = FLOOR_COLS[ci];
        bgCtx.beginPath();
        bgCtx.moveTo(x1l,y1); bgCtx.lineTo(x1r,y1);
        bgCtx.lineTo(x2r,y2); bgCtx.lineTo(x2l,y2);
        bgCtx.closePath();
        bgCtx.fillStyle = `rgba(${cr},${cg},${cb},${0.025+t2*0.065})`;
        bgCtx.fill();
      }
    }

    bgCtx.lineWidth = 0.5;
    for (let i = 0; i <= numV; i++) {
      const bx=(i/numV)*W, tt=i/numV;
      bgCtx.strokeStyle = `rgba(205,185,230,${0.06+(1-Math.abs(tt-0.5)*2)*0.04})`;
      bgCtx.beginPath(); bgCtx.moveTo(vpX,vpY); bgCtx.lineTo(bx,botY); bgCtx.stroke();
    }
    for (let j = 1; j < numH; j++) {
      const p = Math.pow(j/numH,1.8);
      const y = vpY+(botY-vpY)*p;
      bgCtx.strokeStyle = `rgba(205,185,230,${0.04+p*0.09})`;
      bgCtx.beginPath(); bgCtx.moveTo(0,y); bgCtx.lineTo(W,y); bgCtx.stroke();
    }
    bgCtx.strokeStyle = 'rgba(210,190,240,0.08)';
    bgCtx.lineWidth = 0.8;
    bgCtx.beginPath(); bgCtx.moveTo(0,vpY); bgCtx.lineTo(W,vpY); bgCtx.stroke();
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Ventanas empañadas (ojo al despejarse)
  // ════════════════════════════════════════════════════════════════
  function drawWindows(W, H) {
    if (!windows) return;
    windows.forEach(w => {
      w.x += w.vx; w.y += w.vy;
      if (w.x < -w.winW)        w.x = W+w.winW;
      if (w.x > W+w.winW)       w.x = -w.winW;
      if (w.y < -w.winH*0.5)    w.vy =  Math.abs(w.vy);
      if (w.y+w.winH > H*0.88)  w.vy = -Math.abs(w.vy);

      w.timer--;
      if      (w.phase==='fogged'   && w.timer<=0) { w.phase='clearing'; }
      else if (w.phase==='clearing') { w.fog=Math.max(0,w.fog-0.007); if(w.fog<=0){w.phase='clear';w.holdCount=0;} }
      else if (w.phase==='clear')    { w.holdCount++; if(w.holdCount>=w.holdMax) w.phase='fogging'; }
      else if (w.phase==='fogging')  { w.fog=Math.min(1,w.fog+0.005); if(w.fog>=1){w.phase='fogged';w.timer=100+Math.floor(Math.random()*320);} }

      const { x, y, winW, winH, fog, glowR } = w;
      const cx = x, cy = y+winH*0.5;
      const clarity = 1-fog;
      bgCtx.save();

      if (clarity > 0.05) {
        const glow = bgCtx.createRadialGradient(cx,cy,0,cx,cy,winW*1.8);
        glow.addColorStop(0,   `rgba(${glowR},${0.18*clarity})`);
        glow.addColorStop(0.5, `rgba(${glowR},${0.07*clarity})`);
        glow.addColorStop(1,   'rgba(0,0,0,0)');
        bgCtx.fillStyle = glow;
        bgCtx.fillRect(cx-winW*2, cy-winH*1.6, winW*4, winH*3.2);
      }
      bgCtx.fillStyle = `rgba(${glowR},${0.03+clarity*0.10})`;
      bgCtx.fillRect(x-winW*0.5, y, winW, winH);
      if (fog>0.3) { bgCtx.fillStyle=`rgba(220,210,240,${fog*0.06})`; bgCtx.fillRect(x-winW*0.5,y,winW,winH); }

      const frameA = 0.22+clarity*0.22;
      bgCtx.strokeStyle = `rgba(215,200,240,${frameA})`;
      bgCtx.lineWidth = 1.6; bgCtx.strokeRect(x-winW*0.5,y,winW,winH);
      bgCtx.lineWidth = 1.0;
      bgCtx.beginPath(); bgCtx.moveTo(x-winW*0.5,y+winH*0.5); bgCtx.lineTo(x+winW*0.5,y+winH*0.5); bgCtx.stroke();
      bgCtx.beginPath(); bgCtx.moveTo(x,y); bgCtx.lineTo(x,y+winH); bgCtx.stroke();
      bgCtx.lineWidth = 2.2; bgCtx.strokeStyle=`rgba(215,200,240,${frameA*0.75})`;
      bgCtx.beginPath(); bgCtx.moveTo(x-winW*0.55,y+winH); bgCtx.lineTo(x+winW*0.55,y+winH); bgCtx.stroke();

      // Ojo al otro lado del cristal
      if (w.eyeInWindow && clarity > 0.35) {
        const er = Math.min(winW, winH)*0.36;
        bgCtx.save();
        bgCtx.beginPath(); bgCtx.rect(x-winW*0.5, y, winW, winH); bgCtx.clip();
        drawEyeShape(cx, cy, er, Math.min(1, clarity*1.1), clarity*0.82, '100,80,150');
        bgCtx.restore();
      }
      bgCtx.restore();
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — 20 ojos siempre observando, tamaños muy variados
  // ════════════════════════════════════════════════════════════════
  function drawEyes(W, H) {
    if (!eyes) return;
    eyes.forEach(e => {
      // Deriva lenta
      e.x += e.vx; e.y += e.vy;
      if (e.x < -e.size*2)    e.vx =  Math.abs(e.vx);
      if (e.x > W+e.size*2)   e.vx = -Math.abs(e.vx);
      if (e.y < -e.size)      e.vy =  Math.abs(e.vy);
      if (e.y > H+e.size)     e.vy = -Math.abs(e.vy);

      // Pulso suave de apertura
      let open = 0.55 + (0.5+0.5*Math.sin(t*0.016+e.pulseOff))*0.45;

      // Parpadeo
      e.blinkTimer--;
      if (e.blinkTimer<=0 && !e.blinking) { e.blinking=true; e.blinkProgress=0; }
      if (e.blinking) {
        e.blinkProgress++;
        if      (e.blinkProgress<=5)  open = Math.max(0.02, 1-e.blinkProgress/5);
        else if (e.blinkProgress<=10) open = (e.blinkProgress-5)/5;
        else { e.blinking=false; e.blinkTimer=80+Math.floor(Math.random()*300); }
      }

      drawEyeShape(e.x, e.y, e.size, open, e.alpha, e.iris);
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Fragmentos de texto
  // ════════════════════════════════════════════════════════════════
  function drawFrags(W, H) {
    if (!frags) return;
    frags.forEach((f, i) => {
      f.life++; f.x += f.drift;
      if      (f.phase==='fadein')  { f.alpha=Math.min(0.58,f.alpha+0.008); if(f.life>=60) f.phase='hold'; }
      else if (f.phase==='hold')    { if(f.life>=f.maxLife) f.phase='fadeout'; }
      else if (f.phase==='fadeout') { f.alpha=Math.max(0,f.alpha-0.007); if(f.alpha<=0){frags[i]=spawnFrag(W,H);return;} }
      bgCtx.save();
      bgCtx.font = `${f.size}px monospace`; bgCtx.textAlign='center';
      const isWrong = POOL.indexOf(f.text)%5===0;
      bgCtx.fillStyle = isWrong ? `rgba(220,160,185,${f.alpha})` : `rgba(195,175,225,${f.alpha})`;
      bgCtx.fillText(f.text, f.x, f.y);
      bgCtx.restore();
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Flores gigantes fuera de proporción
  // ════════════════════════════════════════════════════════════════
  function _drawDaisy(cx, cy, r, alpha, petalCol, rot) {
    bgCtx.save();
    bgCtx.translate(cx, cy); bgCtx.rotate(rot);
    const numP = 14;
    for (let i = 0; i < numP; i++) {
      bgCtx.save(); bgCtx.rotate((i/numP)*Math.PI*2);
      bgCtx.beginPath();
      bgCtx.ellipse(0, -r*0.64, r*0.148, r*0.40, 0, 0, Math.PI*2);
      bgCtx.fillStyle = `rgba(${petalCol},${alpha})`; bgCtx.fill();
      bgCtx.strokeStyle = `rgba(${petalCol},${alpha*0.28})`; bgCtx.lineWidth=0.6;
      bgCtx.beginPath(); bgCtx.moveTo(0,-r*0.27); bgCtx.lineTo(0,-r*0.62); bgCtx.stroke();
      bgCtx.restore();
    }
    const g = bgCtx.createRadialGradient(0,0,0,0,0,r*0.30);
    g.addColorStop(0,    `rgba(255,235,85,${alpha})`);
    g.addColorStop(0.55, `rgba(220,172,38,${alpha*0.92})`);
    g.addColorStop(1,    `rgba(180,115,18,${alpha*0.78})`);
    bgCtx.beginPath(); bgCtx.arc(0,0,r*0.30,0,Math.PI*2);
    bgCtx.fillStyle = g; bgCtx.fill();
    bgCtx.restore();
  }

  function drawFlowers(W, H) {
    if (!flowers) return;
    flowers.forEach(f => {
      const breathe = 0.5+0.5*Math.sin(t*0.007+f.breathOff);
      _drawDaisy(f.x, f.y, f.r, f.alpha*(0.88+breathe*0.12), f.petal, f.rot+t*0.00022);
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Grano de película analógica
  // ════════════════════════════════════════════════════════════════
  function drawGrain(W, H) {
    bgCtx.save(); bgCtx.globalCompositeOperation='screen';
    for (let i = 0; i < 700; i++) {
      bgCtx.fillStyle = `rgba(195,180,225,${0.012+Math.random()*0.030})`;
      bgCtx.fillRect(Math.random()*W, Math.random()*H, 1, 1);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Distorsión VHS ocasional
  // ════════════════════════════════════════════════════════════════
  function drawVHS(W, H) {
    if (t < nextVHS) return;
    nextVHS = t+160+Math.floor(Math.random()*280);
    bgCtx.save();
    for (let i = 0; i < 2+Math.floor(Math.random()*4); i++) {
      bgCtx.fillStyle = `rgba(215,195,240,${0.04+Math.random()*0.06})`;
      bgCtx.fillRect((Math.random()-0.5)*16, Math.random()*H, W, 1+Math.random()*12);
    }
    bgCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  BG — Bloom de clic
  // ════════════════════════════════════════════════════════════════
  function spawnBloom(x, y) {
    blooms.push({ x, y, life:1.0, text: Math.random()<0.5?'YOU WERE HERE':POOL[Math.floor(Math.random()*POOL.length)] });
  }

  function drawBlooms(W, H) {
    for (let i = blooms.length-1; i >= 0; i--) {
      const b = blooms[i], prog = 1-b.life;
      bgCtx.save(); bgCtx.globalCompositeOperation='screen';
      for (let ri = 0; ri < 5; ri++) {
        const rp = Math.max(0, prog-ri*0.06); if(rp<=0) continue;
        const rA = Math.max(0,(b.life-ri*0.06)*0.38);
        bgCtx.beginPath(); bgCtx.arc(b.x, b.y, rp*(55+ri*14), 0, Math.PI*2);
        bgCtx.strokeStyle=`rgba(${ri%2===0?'200,180,240':'240,180,210'},${rA})`; bgCtx.lineWidth=0.9; bgCtx.stroke();
      }
      if (b.life>0.3) {
        bgCtx.font='13px monospace'; bgCtx.textAlign='center';
        bgCtx.fillStyle=`rgba(210,190,240,${(b.life-0.3)*0.75})`;
        bgCtx.fillText(b.text, b.x, b.y-28-prog*18);
      }
      bgCtx.restore();
      b.life-=0.016; if(b.life<=0) blooms.splice(i,1);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  OVERLAY — cursor con trail y reflejo en suelo
  // ════════════════════════════════════════════════════════════════
  function drawCursor(W, H) {
    overCtx.clearRect(0, 0, W, H);
    if (mouseX < 0) return;
    overCtx.save(); overCtx.globalCompositeOperation='screen';

    const breathe = 0.5+0.5*Math.sin(t*0.022);
    const ringR   = 10+breathe*4;

    const halo = overCtx.createRadialGradient(mouseX,mouseY,0,mouseX,mouseY,44);
    halo.addColorStop(0,'rgba(195,175,230,0.050)'); halo.addColorStop(1,'rgba(0,0,0,0)');
    overCtx.fillStyle=halo; overCtx.beginPath(); overCtx.arc(mouseX,mouseY,44,0,Math.PI*2); overCtx.fill();

    overCtx.beginPath(); overCtx.arc(mouseX,mouseY,ringR,0,Math.PI*2);
    overCtx.strokeStyle=`rgba(205,185,235,${0.18*breathe+0.06})`; overCtx.lineWidth=0.9; overCtx.stroke();

    const cs=5; overCtx.strokeStyle='rgba(205,185,235,0.12)'; overCtx.lineWidth=0.7;
    overCtx.beginPath(); overCtx.moveTo(mouseX-cs-5,mouseY); overCtx.lineTo(mouseX-cs,mouseY); overCtx.stroke();
    overCtx.beginPath(); overCtx.moveTo(mouseX+cs,mouseY); overCtx.lineTo(mouseX+cs+5,mouseY); overCtx.stroke();
    overCtx.beginPath(); overCtx.moveTo(mouseX,mouseY-cs-5); overCtx.lineTo(mouseX,mouseY-cs); overCtx.stroke();
    overCtx.beginPath(); overCtx.moveTo(mouseX,mouseY+cs); overCtx.lineTo(mouseX,mouseY+cs+5); overCtx.stroke();

    overCtx.beginPath(); overCtx.arc(mouseX,mouseY,1.4,0,Math.PI*2);
    overCtx.fillStyle='rgba(220,205,245,0.55)'; overCtx.fill();

    overCtx.font='10px monospace';
    for (let i = letterTrail.length-1; i >= 0; i--) {
      const l=letterTrail[i];
      overCtx.fillStyle=`rgba(195,175,230,${l.alpha})`; overCtx.fillText(l.ch,l.x,l.y);
      l.alpha-=0.014; l.y-=0.15; if(l.alpha<=0) letterTrail.splice(i,1);
    }

    cursorHistory.push({x:mouseX,y:mouseY});
    if (cursorHistory.length>22) cursorHistory.shift();
    const ghost = cursorHistory.length>=22 ? cursorHistory[0] : null;
    if (ghost && ghost.x>0) {
      const vpY=H*0.50, refY=vpY+(vpY-ghost.y);
      if (refY>vpY && refY<H*0.96) {
        const depth=(refY-vpY)/(H-vpY);
        overCtx.save(); overCtx.globalAlpha=depth*0.18;
        overCtx.scale(1,-0.55-depth*0.15);
        const ry=-refY/(0.55+depth*0.15);
        overCtx.beginPath(); overCtx.arc(ghost.x,ry,ringR*(0.5+depth*0.5),0,Math.PI*2);
        overCtx.strokeStyle='rgba(195,175,230,1)'; overCtx.lineWidth=0.7; overCtx.stroke();
        overCtx.beginPath(); overCtx.arc(ghost.x,ry,1.1,0,Math.PI*2);
        overCtx.fillStyle='rgba(215,200,245,1)'; overCtx.fill();
        overCtx.restore();
      }
    }
    overCtx.restore();
  }

  // ════════════════════════════════════════════════════════════════
  //  Loop principal
  // ════════════════════════════════════════════════════════════════
  function frame() {
    t++;
    const W=bgCanvas.width, H=bgCanvas.height;
    bgCtx.clearRect(0,0,W,H);
    drawBackground(W,H);
    drawFloorGrid(W,H);
    drawWindows(W,H);
    drawEyes(W,H);
    drawFrags(W,H);
    drawFlowers(W,H);
    drawVHS(W,H);
    drawGrain(W,H);
    drawBlooms(W,H);
    drawCursor(W,H);
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    if (!bgCanvas) return;
    const W=window.innerWidth, H=window.innerHeight;
    bgCanvas.width=W; bgCanvas.height=H;
    overCanvas.width=W; overCanvas.height=H;
    initWindows(W,H);
    initEyes(W,H);
    initFrags(W,H);
    initFlowers(W,H);
  }

  // ════════════════════════════════════════════════════════════════
  //  API
  // ════════════════════════════════════════════════════════════════
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
        mouseX=e.clientX; mouseY=e.clientY;
        if (t-lastTrailT>3) {
          lastTrailT=t;
          letterTrail.push({
            x: mouseX+(Math.random()-0.5)*6,
            y: mouseY+(Math.random()-0.5)*6,
            ch: ALPHA_CHARS[Math.floor(Math.random()*ALPHA_CHARS.length)],
            alpha: 0.22+Math.random()*0.12,
          });
          if (letterTrail.length>14) letterTrail.shift();
        }
      };
      _onClick = (e) => spawnBloom(e.clientX, e.clientY);

      document.addEventListener('mousemove',  _onMove,  { passive:true });
      document.addEventListener('click',      _onClick);
      document.addEventListener('mouseleave', () => { mouseX=-999; mouseY=-999; });
      window.addEventListener('resize', resize);
      t=0; frame();
    },

    stop() {
      if (!bgCanvas) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (_onMove)  { document.removeEventListener('mousemove', _onMove);  _onMove=null;  }
      if (_onClick) { document.removeEventListener('click',     _onClick); _onClick=null; }
      bgCanvas.remove();   bgCanvas=bgCtx=null;
      overCanvas.remove(); overCanvas=overCtx=null;
      windows=eyes=frags=flowers=null;
      letterTrail.length=blooms.length=cursorHistory.length=0;
      mouseX=mouseY=-999; raf=null; t=0;
    },
  };
})();

export { WeirdcoreRenderer };
