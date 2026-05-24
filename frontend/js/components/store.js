//  TIENDA DE SKINS
//  CAPA 4: FactionsIcon — icono rúnico dinámico
// ════════════════════════════════════════
const SKINS = [
  { id:'default',      nombre:'ORAK Classic',   desc:'El cristal oscuro original del universo.',         precio:0,   clase:'skin-default', emoji:'⚔️', faccion:'orak'   },
  { id:'dark_fantasy', nombre:'Dark Fantasy',   desc:'Púrpura abismal y fuego carmesí para los oscuros.',precio:200, clase:'skin-dark',    emoji:'🌑', faccion:'arcane' },
  { id:'neon',         nombre:'Neon Cyber',     desc:'Luz de neón y teal eléctrico del futuro.',         precio:300, clase:'skin-neon',    emoji:'⚡', faccion:'arcane' },
  { id:'bio_utopia',   nombre:'Bio-Utopía',     desc:'Verde orgánico y bioluminiscencia viviente.',      precio:350, clase:'skin-bio',     emoji:'🌿', faccion:'bio'    },
  { id:'crimson',      nombre:'Crimson Order',  desc:'Rojo sangre de la orden guerrera ancestral.',      precio:500, clase:'skin-crimson', emoji:'🔴', faccion:'crimson'},
];

let _skinActivo = localStorage.getItem('orak_skin') || 'default';

// Función de ícono rúnico que cambia color según facción:
// Verde Neón → Bio-Utopía | Oro → Orak Central | Púrpura → Arcane | Rojo → Crimson
function getFactionIconHTML(factionId) {
  const symbols = { orak:'⬡', bio:'✦', arcane:'✦', crimson:'⬟' };
  return `<span class="faction-icon-rune" data-faction="${factionId}" title="${factionId}">${symbols[factionId]||'⬡'}</span>`;
}

function renderTienda() {
  const cards = SKINS.map(s => {
    const activo = _skinActivo === s.id;
    return `
      <div class="skin-card ${activo?'activo':''}" onclick="previsualizarSkin('${s.id}')">
        <div class="skin-preview ${s.clase}">
          <span style="z-index:1;position:relative">${s.emoji}</span>
          ${getFactionIconHTML(s.faccion)}
        </div>
        <div class="skin-info">
          <div class="skin-nombre">${s.nombre}</div>
          <div class="skin-desc">${s.desc}</div>
          ${s.precio>0?`<div class="skin-precio"><span class="orun-icon">🪙</span> ${s.precio} Orun's</div>`:'<div style="font-size:11px;color:var(--green-lt);font-weight:600">✓ Gratis</div>'}
          <button class="skin-btn ${s.precio===0||activo?'gratis':'comprar'}"
            onclick="event.stopPropagation();aplicarSkin('${s.id}',${s.precio})"
            ${activo?'disabled':''}>
            ${activo?'✔ Activo':s.precio===0?'Aplicar gratis':`Comprar por ${s.precio} 🪙`}
          </button>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">TIENDA</span></div>
    <div class="feed-header"><div><div class="feed-title">🏪 Tienda del Universe</div><div class="feed-sub">Cambia la apariencia del universo con Orun's</div></div></div>
    <div class="tienda-grid">${cards}</div>`;
}

function previsualizarSkin(id) {
  aplicarSkinCSS(id);
  setTimeout(() => aplicarSkinCSS(_skinActivo), 2000);
}

function aplicarSkinCSS(id) {
  const root = document.documentElement;
  const temas = {
    default:      { '--bg':'#06080f','--bg2':'#0a0c18','--gold':'#d4af37','--gold-lt':'#f0ac3a' },
    dark_fantasy: { '--bg':'#050208','--bg2':'#0a030f','--gold':'#9b3daa','--gold-lt':'#c060d0' },
    neon:         { '--bg':'#000a0a','--bg2':'#001212','--gold':'#00c8a0','--gold-lt':'#00f0c0' },
    bio_utopia:   { '--bg':'#010a03','--bg2':'#021205','--gold':'#18a050','--gold-lt':'#28c868' },
    crimson:      { '--bg':'#0a0303','--bg2':'#120505','--gold':'#b02020','--gold-lt':'#e03030' },
  };
  const tema = temas[id] || temas.default;
  Object.entries(tema).forEach(([k,v]) => root.style.setProperty(k, v));
}

async function aplicarSkin(id, precio) {
  if(_skinActivo === id) return;
  if(precio > 0) toast(`🪙 Skin aplicado (costo: ${precio} Orun's)`);
  _skinActivo = id;
  localStorage.setItem('orak_skin', id);
  aplicarSkinCSS(id);
  renderVista();
  toast(`✔ Skin "${SKINS.find(s=>s.id===id)?.nombre}" activado`);
}

// ════════════════════════════════════════
//  FICHA PERSONAJE D&D
// ════════════════════════════════════════
function abrirFichaPersonaje(libro, nombre) {
  const l = _libros.find(x => x.titulo === libro);
  const p = l?.personajes?.find(x => x.nombre === nombre);
  if(!p) return;

  const seed = nombre.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  const statFn = (base) => Math.min(20, Math.max(6, base + (seed % 7) - 3));
  const stats = { FUE: statFn(10), DES: statFn(12), CON: statFn(11), INT: statFn(13), SAB: statFn(10), CAR: statFn(14) };
  const habs  = p.habilidades||[];
  const armas = p.armas||[];
  const vivo  = !p.muerte;
  const ini   = nombre[0].toUpperCase();

  const overlay = document.getElementById('fichaOverlay');
  document.getElementById('fichaContent').innerHTML = `
    <div class="ficha-cost"><span class="orun-icon">🪙</span><span>Ficha técnica desbloqueada · <strong>1 Orun</strong> gastado</span></div>
    <div class="ficha-top">
      <div class="ficha-avatar">${ini}</div>
      <div><div class="ficha-nombre">${esc(p.nombre)}</div>
        <div class="ficha-sub"><span class="tag ${vivo?'tag-green':'tag-red'}">${vivo?'Vivo':'Muerto'}</span>&nbsp; Año ${p.nacimiento}${p.muerte?' – '+p.muerte:''}  &nbsp;·&nbsp; ${esc(libro)}</div>
      </div>
    </div>
    <div class="ficha-section">Estadísticas D&D</div>
    <div class="ficha-stats">
      ${Object.entries(stats).map(([k,v])=>`<div class="ficha-stat"><div class="ficha-stat-val">${v}</div><div class="ficha-stat-lbl">${k}</div></div>`).join('')}
    </div>
    ${habs.length?`<div class="ficha-section">Habilidades</div><div>${habs.map(h=>`<span class="ficha-chip chip-skill">⚡ ${esc(h)}</span>`).join('')}</div>`:''}
    ${armas.length?`<div class="ficha-section">Armas</div><div>${armas.map(a=>`<span class="ficha-chip chip-weapon">🗡 ${esc(a)}</span>`).join('')}</div>`:''}`;
  overlay.classList.add('open');
}

// ════════════════════════════════════════
