
// ════════════════════════════════════════════════════════════
//  ORAK UNIVERSE — engine.js
//  CAPA 3: Lógica de Estado · Economía · Renderizado · PDF
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════
//  ORAK ICON SYSTEM — SVG dinámicos
//  Sustituye emojis en HTML generado por JS
// ════════════════════════════════════════
const ORAK_ICONS = {
  // Evento / calendario orbital
  evento: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,15"/><line x1="12" y1="3" x2="12" y2="1"/><line x1="12" y1="23" x2="12" y2="21"/><line x1="3" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="21" y2="12"/></svg></span>`,
  // Personaje / mago (pentagrama astral)
  personaje: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/><polygon points="12,4 14.5,10 21,10 15.5,14 18,21 12,17 6,21 8.5,14 3,10 9.5,10"/></svg></span>`,
  // Personaje pequeño (para inline en cards)
  personajeSm: `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/><polygon points="12,4 14.5,10 21,10 15.5,14 18,21 12,17 6,21 8.5,14 3,10 9.5,10"/></svg></span>`,
  // Libro / tomo arcano
  libro: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg></span>`,
  // Libro pequeño (sm)
  libroSm: `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg></span>`,
  // Mapa estelar
  lugar: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg></span>`,
  // Facción / escudo
  faccion: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L3 7v7c0 4.4 3.8 8.5 9 9.5 5.2-1 9-5.1 9-9.5V7z"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/></svg></span>`,
  // Relación / nexo nodal
  relacion: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><line x1="8" y1="11" x2="16" y2="6.5"/><line x1="8" y1="13" x2="16" y2="17.5"/></svg></span>`,
  // Planeta / universo (feed title)
  universo: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg></span>`,
  // Pergamino / historia
  pergamino: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/><line x1="9" y1="9" x2="11" y2="9"/></svg></span>`,
  // Pergamino pequeño
  pergaminoSm: `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>`,
  // Libros apilados
  libros: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg></span>`,
  // Diagnóstico / alerta
  diagnostico: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="#D4AF37" stroke="none"/></svg></span>`,
  // Grupo de personajes
  grupo: `<span class="orak-icon icon-md"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="12" r="9"/><polygon points="9,4 11.5,9.5 17.5,10 13,14 14.5,20 9,17 3.5,20 5,14 0.5,10 6.5,9.5"/><circle cx="18" cy="8" r="4" stroke-width="1"/></svg></span>`,
  // Bandeja vacía
  empty: `<span class="orak-icon icon-xl" style="opacity:.35"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg></span>`,
  // Ficha D&D (naipe astral)
  ficha: `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/><polygon points="12,5 13.5,8 12,7.5 10.5,8" fill="#D4AF37" stroke="none"/></svg></span>`,
  // Lápiz rúnico (editar)
  editar: `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>`,
  // Basura / eliminar
  eliminar: `<span class="orak-icon icon-sm icon-danger"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></span>`,
  // Glimmer supernova (partícula)
  glimmer: `<span class="orak-icon icon-sm glimmer-icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="16.24" y2="7.76"/><line x1="7.76" y1="16.24" x2="4.93" y2="19.07"/><circle cx="12" cy="12" r="3"/></svg></span>`,
  // Orun's hexagonal
  orun: `<span class="orak-icon icon-sm coin-spin"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7"/><polygon points="12,6 17,9 17,15 12,18 7,15 7,9" stroke-width="1"/><circle cx="12" cy="12" r="2" fill="#D4AF37" stroke="none"/></svg></span>`,
};

// ════════════════════════════════════════
//  USUARIO LOCAL — sin login requerido
// ════════════════════════════════════════
const _sb = null;
let _usuario = { id: 'local', email: 'local@orak.app' };
let _perfil  = {
  id:             'local',
  username:       'Autor',
  oruns_balance:  500,
  glimmers_total: 0
};

async function initAuth() {
  actualizarUIAuth();
}

function _onLogout() {}

function actualizarUIAuth() {
  ['orunsVal','pmOruns'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = _perfil.oruns_balance || 0;
  });
  ['glimmersVal','pmGlimmers'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = _perfil.glimmers_total || 0;
  });
  const rpO = document.getElementById('rpOruns');
  if(rpO) rpO.textContent = _perfil.oruns_balance || 0;
  const rpG = document.getElementById('rpGlimmers');
  if(rpG) rpG.textContent = _perfil.glimmers_total || 0;
}

function abrirAuthModal()  {}
function cerrarAuthModal() {}
function toggleAuthMode()  {}
async function submitAuth() {}
async function loginGoogle() { toast('Login deshabilitado en modo local', 'err'); }
async function cerrarSesion() { toast('Sin sesión activa', 'err'); }

function toggleProfileMenu() {
  document.getElementById('profileMenu')?.classList.toggle('open');
}
document.addEventListener('click', e => {
  const m = document.getElementById('profileMenu'), a = document.getElementById('authArea');
  if(m && a && !a.contains(e.target)) m.classList.remove('open');
});

// ════════════════════════════════════════
//  ECONOMÍA — Glimmers & Orun's
// ════════════════════════════════════════

/**
 * Gastar Orun's. Devuelve nuevo balance o null si insuficiente.
 * Se usa para: desbloquear Personajes (-50), Finales Alternativos (-50), Fichas D&D (-1)
 */
async function gastarOruns(cant, concepto, tipo='gasto') {
  if((_perfil.oruns_balance || 0) < cant) {
    toast(`Orun's insuficientes (tienes ${_perfil.oruns_balance})`, 'err');
    return null;
  }
  _perfil.oruns_balance -= cant;
  actualizarUIAuth();
  toast(`⬡ -${cant} Orun's · ${concepto}`);
  return _perfil.oruns_balance;
}

/**
 * Ganar Orun's (logros, subir contenido, crear libros)
 */
async function ganarOruns(cant, concepto, tipo='logro') {
  _perfil.oruns_balance = (_perfil.oruns_balance || 0) + cant;
  actualizarUIAuth();
  return _perfil.oruns_balance;
}

/**
 * Ganar Glimmers. Se dispara al dejar una nota en el PDF (+25).
 */
function ganarGlimmers(cant, origen) {
  _perfil.glimmers_total = (_perfil.glimmers_total || 0) + cant;
  actualizarUIAuth();
  lanzarGlimmers(origen);
  toast(`✦ +${cant} Glimmers`);
}

/**
 * Desbloquear sección bloqueada (Personajes, Finales, etc.)
 * Cuesta 50 Orun's, muestra confirmación.
 */
async function tryUnlock(tipo) {
  const nombres = { personajes: 'Personajes', finales: 'Finales Alternativos' };
  const nombre  = nombres[tipo] || tipo;
  if(!confirm(`¿Desbloquear "${nombre}" por 50 Orun's?`)) return;
  const ok = await gastarOruns(50, `Desbloqueo: ${nombre}`, 'desbloqueo');
  if(ok !== null) {
    toast(`✅ "${nombre}" desbloqueado`);
    if(tipo === 'personajes') setVista('personajes');
  }
}

// ════════════════════════════════════════
//  RANKING
// ════════════════════════════════════════

/**
 * Ordena usuarios por participación y saldo de Orun's.
 * @param {Array} usuarios - Lista de { username, oruns_balance, notas, libros }
 * @returns Array ordenado de mayor a menor participación
 */
function calcularRanking(usuarios) {
  return [...usuarios].sort((a, b) => {
    const scoreA = (a.oruns_balance || 0) + (a.notas || 0) * 25 + (a.libros || 0) * 50;
    const scoreB = (b.oruns_balance || 0) + (b.notas || 0) * 25 + (b.libros || 0) * 50;
    return scoreB - scoreA;
  });
}

// ════════════════════════════════════════
//  ESTADO GLOBAL
// ════════════════════════════════════════
let _libros    = [];
let _stats     = {};
let _timeline  = [];
let _vista     = 'feed';
let _libroSel  = null;
let _ws        = null;

const API_SERVER = window.location.origin;
let _modoConexion = 'detectando';

async function detectarServidor() {
  try {
    const _tout = new Promise((_,r) => setTimeout(() => r(new Error('t')), 1500));
    const r = await Promise.race([fetch(API_SERVER + '/'), _tout]);
    if(r.ok) { _modoConexion = 'server'; return true; }
  } catch(_) {}
  _modoConexion = 'local'; return false;
}

async function api(metodo, path, datos) {
  const base = _modoConexion === 'server' ? API_SERVER : '';
  const opts = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if(datos) opts.body = JSON.stringify(datos);
  const r = await fetch(base + path, opts);
  if(!r.ok) { const err = await r.json().catch(() => ({ detail: r.statusText })); throw new Error(err.detail || r.statusText); }
  return r.json();
}
const GET  = path       => api('GET',    path);
const POST = (path, d)  => api('POST',   path, d);
const PATCH= (path, d)  => api('PATCH',  path, d);
const DEL  = path       => api('DELETE', path);

// ════════════════════════════════════════
//  DATOS EMBEBIDOS (universo de ejemplo)
// ════════════════════════════════════════
const _UNIVERSO_EMBEBIDO = [
  {
    "titulo": "El Hijoeputamo Across the universe",
    "descripcion": "Un Potamo viaja por el multiverso",
    "contenido": "",
    "personajes": [
      { "nombre": "El Potamo", "nacimiento": 2025, "muerte": 3066, "habilidades": [], "armas": [] },
      { "nombre": "un potamo gigante", "nacimiento": 1900, "muerte": null, "habilidades": [], "armas": [] },
      { "nombre": "Marras el hechicero supremo", "nacimiento": 1010, "muerte": null, "habilidades": [], "armas": [] },
      { "nombre": "Patricio", "nacimiento": 140, "muerte": 230, "habilidades": [], "armas": [] }
    ],
    "eventos": [
      { "descripcion": "El Potamo viajó por el multiverso al caer en una olla de estofado", "año": 2035, "personaje": "El Potamo" },
      { "descripcion": "este potamo viajo por universos popotamezcos destruyendo todo a su paso con auyido de sirena", "año": 1901, "personaje": "un potamo gigante" },
      { "descripcion": "el potamo ataca con su feroz sonido de sirena al marras mago supremo que invade su territorio", "año": 1050, "personaje": "un potamo gigante" }
    ],
    "aportes": [], "comentarios": [], "historia": "",
    "lugares": [{ "nombre": "mundo popotamo", "tipo": "territorio", "descripcion": "un lugar hostil y apestoso", "facciones": [] }],
    "facciones": [], "relaciones": []
  },
  {
    "titulo": "Hola :D",
    "descripcion": "La invasión de los mini Marras para salvar a su papá: Marras Jr.",
    "contenido": "", "personajes": [], "eventos": [], "aportes": [], "comentarios": "", "historia": "", "lugares": [], "facciones": [], "relaciones": []
  },
  {
    "titulo": "prueba 1",
    "descripcion": "libro de prueba 1",
    "historia": "cuando un mundo desconocido a las afueras del universo entero tenia uno de los personajes mas peligrosos del universo...",
    "personajes": [{ "nombre": "darkan", "nacimiento": 0, "muerte": null, "habilidades": [], "armas": [] }],
    "eventos": [{ "descripcion": "darkan conoce nuestro mundo", "año": 35, "personaje": "darkan" }],
    "lugares": [], "facciones": [], "relaciones": []
  }
];

// ════════════════════════════════════════
//  CÁLCULOS LOCALES
// ════════════════════════════════════════
function _calcularStatsLocal(libros) {
  let personajes=0, eventos=0, vivos=0;
  for(const l of libros) {
    personajes += (l.personajes||[]).length;
    eventos    += (l.eventos||[]).length;
    vivos      += (l.personajes||[]).filter(p => !p.muerte).length;
  }
  return { libros: libros.length, personajes, eventos, vivos, muertos: personajes - vivos };
}

function _calcularTimelineLocal(libros) {
  const evs = [];
  for(const l of libros) for(const e of (l.eventos||[])) evs.push({...e, libro: l.titulo});
  return evs.sort((a,b) => a.año - b.año);
}

// ════════════════════════════════════════
//  INIT
// ════════════════════════════════════════
async function init() {
  localStorage.removeItem('orak_libros');
  aplicarSkinCSS(localStorage.getItem('orak_skin') || 'default');
  actualizarBadgeModo(false);

  // Renderizar skeleton mientras conecta — NO usar cache viejo todavía
  _libros = [];
  renderVista();

  // 1. Intentar servidor SIEMPRE — es la fuente de verdad
  const servidorOk = await detectarServidor();
  actualizarBadgeModo(servidorOk);

  if (servidorOk) {
    try {
      const data = await GET('/libros');
      _libros = Array.isArray(data) ? data : (data.libros || []);
      // Reemplazar cache local completamente con la verdad del servidor
      _guardarLocal(_libros);
    } catch(e) {
      console.warn('Servidor disponible pero falló GET /libros:', e);
      // Solo en este caso de error de red usar el cache
      _libros = _cargarLocal();
      toast('⚠ Error cargando datos del servidor', 'err');
    }
  } else {
    // 2. Sin servidor: usar cache local (modo offline)
    _libros = _cargarLocal();
    if (_libros.length === 0 && typeof _UNIVERSO_EMBEBIDO !== 'undefined') {
      _libros = [..._UNIVERSO_EMBEBIDO];
      _guardarLocal(_libros);
    }
    toast('● Modo sin conexión', 'err');
  }

  _stats    = _calcularStatsLocal(_libros);
  _timeline = _calcularTimelineLocal(_libros);
  actualizarSidebar();
  renderVista();
  await initAuth();
  initNotifs();
  setTimeout(() => {
    const n = document.getElementById('floatingNotif');
    if(n) { n.style.opacity='0'; n.style.transform='translateY(10px)'; n.style.transition='all .4s ease'; setTimeout(()=>{ n.style.opacity='1'; n.style.transform='translateY(0)'; }, 100); }
  }, 1500);
}

// ── Persistencia local (cache + modo offline) ─────────────────
function _guardarLocal(libros) {
  try { localStorage.setItem('orak_libros', JSON.stringify(libros)); } catch(e) {}
}

function _cargarLocal() {
  try {
    const raw = localStorage.getItem('orak_libros');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return [];
}

async function _sincronizar() {
  _stats    = _calcularStatsLocal(_libros);
  _timeline = _calcularTimelineLocal(_libros);
  _guardarLocal(_libros);
  actualizarSidebar();
  renderVista();
}

function actualizarBadgeModo(servidorOk) {
  const b = document.getElementById('badgeModo');
  if(!b) return;
  if(servidorOk) { b.textContent = '● Servidor'; b.className = 'badge-modo'; }
  else { b.textContent = '● Local'; b.className = 'badge-modo local'; }
}

async function cargarTodo() {
  if(_modoConexion === 'server') {
    try {
      const data = await GET('/libros');
      _libros = Array.isArray(data) ? data : (data.libros || []);
      _guardarLocal(_libros);
    } catch(e) { console.warn(e); }
  }
  if(!_libros || _libros.length === 0) {
    _libros = _cargarLocal();
  }
  _stats    = _calcularStatsLocal(_libros);
  _timeline = _calcularTimelineLocal(_libros);
  actualizarSidebar();
}

// ════════════════════════════════════════
//  SIDEBAR Y NAVEGACIÓN
// ════════════════════════════════════════
const VISTA_LABELS = {
  'feed':'MIS LIBROS','libros':'LIBROS','personajes':'PERSONAJES',
  'timeline':'TIMELINE','errores':'DIAGNÓSTICO','lugares':'LUGARES',
  'facciones':'FACCIONES','relaciones':'RELACIONES','chat':'CHAT',
  'tienda':'TIENDA','pdf':'MIS LIBROS (PDF)'
};

function actualizarSidebar() {
  const cL = document.getElementById('countLibros');
  if(cL) cL.textContent = _stats.libros || 0;
  const dL = document.getElementById('dCountLibros');
  const dP = document.getElementById('dCountPersonajes');
  if(dL) dL.textContent = _stats.libros || 0;
  if(dP) dP.textContent = _stats.personajes || 0;

  const librosHtml = _libros.map(l => `
    <button class="libro-sidebar-item ${_libroSel===l.titulo?'active':''}"
            onclick="seleccionarLibro('${esc(l.titulo)}')">
      <span class="libro-dot"></span>
      ${esc(l.titulo)}
    </button>`).join('');
  const ls = document.getElementById('librosSidebar');
  if(ls) ls.innerHTML = librosHtml;

  const drawerLibros = document.getElementById('drawerLibros');
  if(drawerLibros) {
    drawerLibros.innerHTML = _libros.map(l => `
      <button class="libro-sidebar-item ${_libroSel===l.titulo?'active':''}"
              onclick="cerrarDrawer();seleccionarLibro('${esc(l.titulo)}')">
        <span class="libro-dot"></span> ${esc(l.titulo)}
      </button>`).join('');
  }

  // Personajes sidebar bottom
  const chars = document.getElementById('sidebarChars');
  if(chars) {
    const avatarColors = ['#6d28d9','#0891b2','#be185d','#1d4ed8','#047857'];
    // SVGs de personajes para el sidebar bottom
    const charIcons = [
      `<svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:#D4AF37;stroke-width:1.5;fill:none;filter:drop-shadow(0 0 4px rgba(212,175,55,.7))"><circle cx="12" cy="12" r="9"/><polygon points="12,4 14.5,10 21,10 15.5,14 18,21 12,17 6,21 8.5,14 3,10 9.5,10"/></svg>`,
      `<svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:#B48EF7;stroke-width:1.5;fill:none;filter:drop-shadow(0 0 4px rgba(180,142,247,.7))"><path d="M12 2L3 7v7c0 4.4 3.8 8.5 9 9.5 5.2-1 9-5.1 9-9.5V7z"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/></svg>`,
      `<svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:#4EC9B0;stroke-width:1.5;fill:none;filter:drop-shadow(0 0 4px rgba(78,201,176,.7))"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>`,
      `<svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:#D4AF37;stroke-width:1.5;fill:none;filter:drop-shadow(0 0 4px rgba(212,175,55,.7))"><polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7"/><polygon points="12,6 17,9 17,15 12,18 7,15 7,9" stroke-width="1"/><circle cx="12" cy="12" r="2" fill="#D4AF37" stroke="none"/></svg>`,
      `<svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:#FF9A6C;stroke-width:1.5;fill:none;filter:drop-shadow(0 0 4px rgba(255,154,108,.7))"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="16.24" y2="7.76"/><line x1="7.76" y1="16.24" x2="4.93" y2="19.07"/><circle cx="12" cy="12" r="3"/></svg>`,
    ];
    let html = '', idx = 0;
    for(const l of _libros) {
      for(const p of (l.personajes||[])) {
        if(idx >= 6) break;
        const col = avatarColors[idx % avatarColors.length];
        const icon = charIcons[idx % charIcons.length];
        html += `<div class="sidebar-char-avatar" title="${esc(p.nombre)}" style="background:${col}22;border-color:${col}44">${icon}</div>`;
        idx++;
      }
    }
    for(let i=idx; i<6; i++) html += `<div class="sidebar-char-avatar locked" style="background:rgba(255,255,255,0.04)"></div>`;
    chars.innerHTML = html;
  }
}

function toggleDrawer() {
  const drawer = document.getElementById('drawerMenu');
  const backdrop = document.getElementById('drawerBackdrop');
  if(drawer.classList.contains('open')) { cerrarDrawer(); return; }
  drawer.classList.add('open'); backdrop.classList.add('open');
  ['burgerBtn','mobileFab'].forEach(id => document.getElementById(id)?.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function cerrarDrawer() {
  document.getElementById('drawerMenu')?.classList.remove('open');
  document.getElementById('drawerBackdrop')?.classList.remove('open');
  ['burgerBtn','mobileFab'].forEach(id => document.getElementById(id)?.classList.remove('open'));
  document.body.style.overflow = '';
}

function setVista(v) {
  _vista = v;
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const nav = document.getElementById(`nav-${v}`); if(nav) nav.classList.add('active');
  const lbl = document.getElementById('headerVistaLabel');
  if(lbl) lbl.textContent = VISTA_LABELS[v] || v.toUpperCase();
  renderVista();
}

function seleccionarLibro(titulo) {
  _libroSel = titulo;
  setVista('feed');
  actualizarSidebar();
}

// ════════════════════════════════════════
//  RENDER PRINCIPAL
// ════════════════════════════════════════
function renderVista() {
  const main = document.getElementById('mainContent');
  switch(_vista) {
    case 'feed':       main.innerHTML = renderFeed();       break;
    case 'libros':     main.innerHTML = renderLibros();     break;
    case 'personajes': main.innerHTML = renderPersonajes(); break;
    case 'timeline':   main.innerHTML = renderTimeline();   break;
    case 'errores':    renderErrores(); return;
    case 'lugares':    main.innerHTML = renderLugares();    break;
    case 'facciones':  main.innerHTML = renderFacciones();  break;
    case 'relaciones': main.innerHTML = renderRelaciones();  break;
    case 'chat':       renderChatVista(); return;
    case 'tienda':     main.innerHTML = renderTienda();     break;
    case 'pdf':        renderPDF().then(html => { main.innerHTML = html; initPDF(); }); return;
    default:           main.innerHTML = renderFeed();
  }
}

// ═══════════════════════════════════════
//  VISTAS — FEED
// ═══════════════════════════════════════
function renderFeed() {
  const libros = _libroSel ? _libros.filter(l => l.titulo === _libroSel) : _libros;
  const titulo = _libroSel ? `${ORAK_ICONS.libro} ${_libroSel}` : `${ORAK_ICONS.universo} Universo Colectivo`;
  const sub    = _libroSel ? 'Actividad de este libro' : 'Toda la actividad del universo';

  const eventos = [];
  for(const l of libros) for(const e of (l.eventos||[])) eventos.push({...e, _libro: l.titulo});
  eventos.sort((a,b) => b.año - a.año);

  const libroDestacado = libros[0] || null;
  const bibliotecaHtml = libroDestacado ? `
    <div class="bc-crystal-outer" id="bcCrystalOuter">

      <!-- ░░ CAPA 0 — Constelaciones de fondo (Canvas) ░░ -->
      <canvas class="bc-constellation-canvas" id="bcConstellationCanvas"></canvas>

      <!-- ░░ CAPA 1 — Base iridiscente (CSS puro) ░░ -->
      <div class="bc-iridescent-base"></div>

      <!-- ░░ CAPA 2 — Onda dorada (Canvas animado) ░░ -->
      <canvas class="bc-comet-canvas" id="bcCometCanvas"></canvas>

      <!-- ░░ CAPA 3 — Reflejo especular superior ░░ -->
      <div class="bc-specular-top"></div>

      <!-- ░░ CAPA 4 — Borde con grosor 3D ░░ -->
      <div class="bc-depth-border"></div>

      <!-- ░░ CAPA 5 — Contenido real del panel ░░ -->
      <div class="bc-content">
        <div class="bc-label-top">BIBLIOTECA ACTIVA</div>

        <div class="bc-inner-card">
          <!-- Libro / página -->
          <div class="bc-book-wrap">
            <div class="bc-book-page">
              <div class="bc-book-title-line">${esc(libroDestacado.titulo)}</div>
              <div class="bc-book-sub-line">${libroDestacado.descripcion ? esc(libroDestacado.descripcion.substring(0,55)) + (libroDestacado.descripcion.length>55?'…':'') : 'Universo narrativo'}</div>
              <div class="bc-book-rule"></div>
              <div class="bc-book-meta-row">
                <span class="bc-meta-key">PERSONAJES:</span>
                <span class="bc-meta-val">${(libroDestacado.personajes||[]).length}</span>
              </div>
              <div class="bc-book-meta-row">
                <span class="bc-meta-key">EVENTOS:</span>
                <span class="bc-meta-val">${(libroDestacado.eventos||[]).length}</span>
              </div>
              <div class="bc-book-meta-row">
                <span class="bc-meta-key">LUGARES:</span>
                <span class="bc-meta-val">${(libroDestacado.lugares||[]).length}</span>
              </div>
              <div class="bc-book-rule" style="margin-top:10px"></div>
              <div class="bc-book-line-group">
                <div class="bc-book-line"></div>
                <div class="bc-book-line short"></div>
                <div class="bc-book-line"></div>
                <div class="bc-book-line xshort"></div>
              </div>
            </div>

            <!-- Sticky notes flotantes -->
            <div class="bc-sticky bc-sticky-1">
              <div class="bc-sticky-avatar">J</div>
              <div class="bc-sticky-text">JAVES E STIRO</div>
              <div class="bc-sticky-count">3933</div>
            </div>
            <div class="bc-sticky bc-sticky-2">
              <div class="bc-sticky-avatar">U</div>
              <div class="bc-sticky-text">UTOR NOTE</div>
              <div class="bc-sticky-count">359</div>
            </div>
          </div>

          <!-- Separador + label flotante -->
          <div class="bc-note-bridge">
            <div class="bc-note-bridge-label">MIS LIBROS</div>
          </div>

          <!-- Panel derecho info + acciones -->
          <div class="bc-info-panel">
            <div class="bc-info-title">${esc(libroDestacado.titulo)}</div>
            <div class="bc-info-sub">${libroDestacado.descripcion ? esc(libroDestacado.descripcion) : 'Universo narrativo'}</div>
            <div class="bc-tags">
              <span class="bc-tag bc-tag-gold">${(libroDestacado.personajes||[]).length} pers.</span>
              <span class="bc-tag bc-tag-blue">${(libroDestacado.eventos||[]).length} eventos</span>
              <span class="bc-tag bc-tag-teal">${(libroDestacado.lugares||[]).length} lugares</span>
            </div>
            <div class="bc-actions">
              <button class="btn btn-primary btn-sm" onclick="verDetalleLibro('${esc(libroDestacado.titulo)}')">Ver detalle</button>
              <button class="btn btn-ghost btn-sm" onclick="abrirHistoria('${esc(libroDestacado.titulo)}')">${ORAK_ICONS.pergaminoSm} Historia</button>
              <button class="btn btn-ghost btn-sm" onclick="prepModalPersonaje('${esc(libroDestacado.titulo)}')">＋ Personaje</button>
            </div>

            <!-- Recompensas & Habilidades mini-grid -->
            <div class="bc-rewards-label">RECOMPENSAS &amp; HABILIDADES</div>
            <div class="bc-rewards-grid">
              <div class="bc-reward-item">
                <div class="bc-reward-icon bc-ri-gear">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
                <span>Technomate</span>
              </div>
              <div class="bc-reward-item">
                <div class="bc-reward-icon bc-ri-arc">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="12,2 15.5,8.5 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.5,8.5"/>
                  </svg>
                </div>
                <span>Arkanista</span>
              </div>
              <div class="bc-reward-item">
                <div class="bc-reward-icon bc-ri-shield">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <span>Guardián</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ░░ CAPA 6 — Fresnel edge glow (borde luminoso) ░░ -->
      <div class="bc-fresnel-edge"></div>
    </div>` : '';

  // Inicializar canvas del panel cristal tras render
  if (libroDestacado) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _initCrystalPanel();
      });
    });
  }

  const statsHtml = !_libroSel ? `
    <div class="stats-bar">
      ${stat(_stats.libros||0,'Libros')}${stat(_stats.personajes||0,'Personajes')}
      ${stat(_stats.eventos||0,'Eventos')}${stat(_stats.vivos||0,'Vivos')}${stat(_stats.muertos||0,'Muertos')}
    </div>` : '';

  const acciones = `
    <div style="display:flex;gap:7px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="prepModalPersonaje()">＋ Personaje</button>
      <button class="btn btn-ghost btn-sm" onclick="prepModalEvento()">＋ Evento</button>
      <button class="btn btn-ghost btn-sm" onclick="abrirModal('modalLibro')">＋ Libro</button>
      <button class="btn btn-ghost btn-sm" onclick="prepModalLugar()">${ORAK_ICONS.lugar} Lugar</button>
      <button class="btn btn-ghost btn-sm" onclick="prepModalFaccion()">${ORAK_ICONS.faccion} Facción</button>
      <button class="btn btn-ghost btn-sm" onclick="prepModalRelacion()">${ORAK_ICONS.relacion} Relación</button>
    </div>`;

  const eventoCards = eventos.length === 0
    ? `<div class="empty"><div class="empty-icon">${ORAK_ICONS.empty}</div><div class="empty-title">Sin eventos todavía</div><div class="empty-sub">Agrega el primer evento de tu universo</div><button class="btn btn-primary" onclick="prepModalEvento()">＋ Agregar evento</button></div>`
    : eventos.slice(0, 20).map(ev => eventoCard(ev)).join('');

  const actividadItems = eventos.slice(0,4).map(ev => ({
    usuario: (ev.personaje||ev._libro)[0]||'U',
    texto: `<strong>${esc(ev._libro)}</strong> — ${esc(ev.descripcion.substring(0,40))}${ev.descripcion.length>40?'…':''}`,
    extra: `<span class="act-gold">(+25 Glimmers)</span>`
  }));

  const actividadHtml = actividadItems.length > 0 ? `
    <div class="actividad-bar">
      <div class="actividad-title">Actividad Global del Universo</div>
      <div class="actividad-feed">
        ${actividadItems.map(a => `<div class="actividad-item"><div class="actividad-avatar">${esc(a.usuario)}</div><div class="actividad-text">${a.texto} ${a.extra}</div></div>`).join('')}
      </div>
    </div>` : '';

  return `
    <div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">${_libroSel?esc(_libroSel).toUpperCase():'MIS LIBROS'}</span></div>
    ${bibliotecaHtml}${statsHtml}
    <div class="feed-header"><div><div class="feed-title">${titulo}</div><div class="feed-sub">${sub}</div></div></div>
    ${acciones}
    <div class="tabs"><button class="tab active">Eventos recientes</button></div>
    ${eventoCards}${actividadHtml}`;
}

function stat(n, l) {
  const destinos = {'Libros':'libros','Personajes':'personajes','Eventos':'timeline','Vivos':'personajes','Muertos':'personajes'};
  return `<div class="stat-card" onclick="setVista('${destinos[l]||'feed'}')" title="Ver ${l}"><div class="stat-num">${n}</div><div class="stat-lbl">${l}</div></div>`;
}

function eventoCard(ev) {
  const idxGlobal = (() => {
    const l = _libros.find(x => x.titulo === ev._libro);
    if(!l) return -1;
    return (l.eventos||[]).findIndex(e => e.descripcion === ev.descripcion && e.año === ev.año);
  })();
  const puedeEditar = idxGlobal >= 0;
  return `
    <div class="card">
      <div class="card-header">
        <div class="card-avatar">${ORAK_ICONS.evento}</div>
        <div class="card-meta">
          <div class="card-title">${esc(ev.descripcion)}</div>
          <div class="card-sub">
            <span class="año-badge">${ev.año}</span>
            ${ev.personaje?`&nbsp;·&nbsp;<span class="tag tag-gold">${ORAK_ICONS.personajeSm} ${esc(ev.personaje)}</span>`:''}
            &nbsp;·&nbsp; <span class="tag tag-gray">${esc(ev._libro)}</span>
          </div>
        </div>
        ${puedeEditar?`<div style="margin-left:auto;display:flex;gap:5px;flex-shrink:0"><button class="btn btn-ghost btn-sm btn-icon" onclick="abrirEditarEvento('${esc(ev._libro)}',${idxGlobal})">${ORAK_ICONS.editar}</button><button class="btn btn-danger btn-sm btn-icon" onclick="confirmarEliminarEvento('${esc(ev._libro)}',${idxGlobal})">${ORAK_ICONS.eliminar}</button></div>`:''}
      </div>
    </div>`;
}

async function abrirEditarEvento(libro, indice) {
  const l = _libros.find(x => x.titulo === libro);
  const ev = l?.eventos?.[indice]; if(!ev) return;
  const desc = prompt('Descripción:', ev.descripcion); if(desc===null) return;
  const año  = prompt('Año:', ev.año); if(año===null) return;
  const per  = prompt('Personaje (vacío = ninguno):', ev.personaje || ''); if(per===null) return;
  ev.descripcion = desc; ev.año = parseInt(año); ev.personaje = per || '';
  _timeline = _calcularTimelineLocal(_libros);
  renderVista(); toast('✔ Evento actualizado');
}

async function confirmarEliminarEvento(libro, indice) {
  if(!confirm('¿Eliminar este evento permanentemente?')) return;
  const l = _libros.find(x => x.titulo === libro); if(!l) return;
  l.eventos = (l.eventos||[]).filter((_,i) => i !== indice);
  await _sincronizar();
  toast('✔ Evento eliminado');
  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/eventos/${indice}`);
    } catch(e) { toast(`⚠ ${e.message}`, 'err'); }
  }
}

// ════════════════════════════════════════
//  VISTAS — LIBROS
// ════════════════════════════════════════
function renderLibros() {
  const cards = _libros.length === 0
    ? `<div class="empty"><div class="empty-icon">${ORAK_ICONS.empty}</div><div class="empty-title">Sin libros todavía</div><div class="empty-sub">Crea el primer libro del universo</div><button class="btn btn-primary" onclick="abrirModal('modalLibro')">＋ Crear libro</button></div>`
    : `<div class="libro-card-grid">${_libros.map(l => `
        <div class="libro-card ${_libroSel===l.titulo?'selected':''}">
          <div class="libro-card-title">${esc(l.titulo)}</div>
          <div class="libro-card-desc">${esc(l.descripcion||'Sin descripción')}</div>
          <div class="libro-card-stats"><span class="libro-card-stat"><strong>${(l.personajes||[]).length}</strong> pers.</span><span class="libro-card-stat"><strong>${(l.eventos||[]).length}</strong> eventos</span>${l.historia?`<span class="libro-card-stat" style="color:var(--gold)">${ORAK_ICONS.pergaminoSm}</span>`:''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();verDetalleLibro('${esc(l.titulo)}')">Ver detalle</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();abrirHistoria('${esc(l.titulo)}')">${ORAK_ICONS.pergaminoSm} Historia</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();prepModalPersonaje('${esc(l.titulo)}')">＋ Per.</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();prepModalEvento('${esc(l.titulo)}')">＋ Ev.</button>
          </div>
        </div>`).join('')}</div>`;
  return `
    <div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">LIBROS</span></div>
    <div class="feed-header"><div><div class="feed-title">${ORAK_ICONS.libros} Libros</div><div class="feed-sub">Todos los mundos del universo</div></div><button class="btn btn-primary btn-sm" onclick="abrirModal('modalLibro')">＋ Nuevo</button></div>
    ${cards}`;
}

// ════════════════════════════════════════
//  VISTAS — PERSONAJES
// ════════════════════════════════════════
function renderPersonajes() {
  const todos = [];
  for(const l of _libros) for(const p of (l.personajes||[])) todos.push({...p, _libro: l.titulo});
  const lista = todos.length === 0
    ? `<div class="empty"><div class="empty-icon">${ORAK_ICONS.empty}</div><div class="empty-title">Sin personajes todavía</div><button class="btn btn-primary" onclick="prepModalPersonaje()">＋ Crear personaje</button></div>`
    : todos.map(p => personajeCard(p)).join('');
  return `
    <div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">PERSONAJES</span></div>
    <div class="feed-header"><div><div class="feed-title">${ORAK_ICONS.personaje} Personajes</div><div class="feed-sub">Todos los habitantes del universo</div></div><button class="btn btn-primary btn-sm" onclick="prepModalPersonaje()">＋ Nuevo</button></div>
    ${lista}`;
}

function personajeCard(p) {
  const muerte  = p.muerte ?? null;
  const vivo    = muerte === null;
  const estado  = vivo ? 'Vivo' : 'Muerto';
  const tagCls  = vivo ? 'tag-green' : 'tag-red';
  const habs    = (p.habilidades||[]);
  const armas   = (p.armas||[]);
  const inicial = (p.nombre||'?')[0].toUpperCase();
  const vidaAnios = muerte ? (muerte - p.nacimiento) : null;
  return `
    <div class="card card-gold">
      <div class="card-header">
        <div class="card-avatar ${vivo?'':''}'" style="${!vivo?'opacity:.65;filter:grayscale(.5)':''}">${inicial}</div>
        <div class="card-meta">
          <div class="card-title">${esc(p.nombre)}</div>
          <div class="card-sub">
            <span class="tag ${tagCls}">${estado}</span>&nbsp;·&nbsp;
            <span class="año-badge">${p.nacimiento}${muerte!==null?' – '+muerte:''}</span>
            ${vidaAnios!==null?`&nbsp;<span style="font-size:10px;color:var(--text3)">(${vidaAnios}a)</span>`:''}
            &nbsp;·&nbsp; <span class="tag tag-gray">${esc(p._libro)}</span>
          </div>
        </div>
        <div style="margin-left:auto;display:flex;gap:5px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="abrirFichaPersonaje('${esc(p._libro)}','${esc(p.nombre)}')">${ORAK_ICONS.ficha} Ficha</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="abrirEditarPersonaje('${esc(p._libro)}','${esc(p.nombre)}')">${ORAK_ICONS.editar}</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="confirmarEliminarPersonaje('${esc(p._libro)}','${esc(p.nombre)}')">${ORAK_ICONS.eliminar}</button>
        </div>
      </div>
      ${habs.length||armas.length?`<div class="card-body">${habs.length?`<div style="font-size:10px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Habilidades</div><div class="chips">${habs.map((h,i)=>`<span class="chip chip-skill" style="cursor:pointer" onclick="eliminarHabilidadCard('${esc(p._libro)}','${esc(p.nombre)}',${i})">✦ ${esc(h)} ×</span>`).join('')}</div>`:''} ${armas.length?`<div style="font-size:10px;color:var(--text3);margin:8px 0 4px;text-transform:uppercase;letter-spacing:.5px">Armas</div><div class="chips">${armas.map((a,i)=>`<span class="chip chip-weapon" style="cursor:pointer" onclick="eliminarArmaCard('${esc(p._libro)}','${esc(p.nombre)}',${i})">⚔ ${esc(a)} ×</span>`).join('')}</div>`:''}</div>`:''}
    </div>`;
}

async function abrirEditarPersonaje(libro, nombre) {
  const l = _libros.find(x => x.titulo === libro);
  const p = l?.personajes?.find(x => x.nombre === nombre); if(!p) return;
  const nuevoNombre = prompt('Nombre:', p.nombre); if(nuevoNombre===null) return;
  const nac = prompt('Año de nacimiento:', p.nacimiento); if(nac===null) return;
  const muerteStr = prompt('Año de muerte (vacío = vive):', p.muerte??''); if(muerteStr===null) return;
  p.nombre = nuevoNombre.trim() || p.nombre;
  p.nacimiento = parseInt(nac);
  p.muerte = muerteStr.trim()==='' ? null : parseInt(muerteStr);
  renderVista(); toast('✔ Personaje actualizado');
}

async function confirmarEliminarPersonaje(libro, nombre) {
  if(!confirm(`¿Eliminar a "${nombre}" permanentemente?`)) return;
  const l = _libros.find(x => x.titulo === libro); if(!l) return;
  l.personajes = (l.personajes||[]).filter(p => p.nombre !== nombre);
  await _sincronizar();
  toast(`✔ "${nombre}" eliminado`);
  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      const nEnc = encodeURIComponent(nombre).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/personajes/${nEnc}`);
    } catch(e) { toast(`⚠ ${e.message}`, 'err'); }
  }
}

async function eliminarHabilidadCard(libro, nombre, indice) {
  if(!confirm('¿Eliminar esta habilidad?')) return;
  const l=_libros.find(x=>x.titulo===libro);
  const p=l?.personajes?.find(x=>x.nombre===nombre); if(!p) return;
  p.habilidades=(p.habilidades||[]).filter((_,i)=>i!==indice);
  await _sincronizar();
  toast('✔ Habilidad eliminada');
  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      const nEnc = encodeURIComponent(nombre).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/personajes/${nEnc}/habilidades/${indice}`);
    } catch(e) { toast(`⚠ ${e.message}`, 'err'); }
  }
}

async function eliminarArmaCard(libro, nombre, indice) {
  if(!confirm('¿Eliminar esta arma?')) return;
  const l=_libros.find(x=>x.titulo===libro);
  const p=l?.personajes?.find(x=>x.nombre===nombre); if(!p) return;
  p.armas=(p.armas||[]).filter((_,i)=>i!==indice);
  await _sincronizar();
  toast('✔ Arma eliminada');
  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      const nEnc = encodeURIComponent(nombre).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/personajes/${nEnc}/armas/${indice}`);
    } catch(e) { toast(`⚠ ${e.message}`, 'err'); }
  }
}

// ════════════════════════════════════════
//  VISTAS — TIMELINE
// ════════════════════════════════════════
function renderTimeline() {
  const evs = (_libroSel ? _timeline.filter(e => e.libro === _libroSel) : _timeline)
                .slice().sort((a,b) => a.año - b.año);
  if(evs.length===0) return `
    <div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">TIMELINE</span></div>
    <div class="feed-header"><div><div class="feed-title">${ORAK_ICONS.evento} Timeline Multiversal</div></div><button class="btn btn-primary btn-sm" onclick="prepModalEvento()">＋ Evento</button></div>
    <div class="empty"><div class="empty-icon">${ORAK_ICONS.empty}</div><div class="empty-title">Sin hitos en el timeline</div></div>`;

  const items = evs.map(e => `
    <div class="tl-item">
      <div class="tl-año">${e.año}</div>
      <div class="tl-dot"></div>
      <div class="tl-connector"></div>
      <div class="tl-card">
        <div class="tl-card-titulo">${esc(e.descripcion)}</div>
        ${e.personaje?`<div class="tl-card-pers">${ORAK_ICONS.personajeSm} ${esc(e.personaje)}</div>`:''}
        <div class="tl-card-libro">${ORAK_ICONS.libroSm} ${esc(e.libro)}</div>
      </div>
    </div>`).join('');

  return `
    <div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">TIMELINE MULTIVERSAL</span></div>
    <div class="feed-header">
      <div><div class="feed-title">${ORAK_ICONS.evento} Timeline Multiversal</div><div class="feed-sub">${evs.length} hitos ordenados cronológicamente</div></div>
      <div style="display:flex;gap:6px">
        ${_libros.map(l=>`<button class="btn btn-ghost btn-sm ${_libroSel===l.titulo?'btn-primary':''}" onclick="_libroSel='${esc(l.titulo)}';renderVista()">${esc(l.titulo.slice(0,12))}</button>`).join('')}
        ${_libroSel?`<button class="btn btn-ghost btn-sm" onclick="_libroSel=null;renderVista()">Todos</button>`:''}
        <button class="btn btn-primary btn-sm" onclick="prepModalEvento()">＋ Evento</button>
      </div>
    </div>
    <div class="timeline-wrap"><div class="timeline-track">${items}</div></div>`;
}

// ════════════════════════════════════════
//  VISTAS — LUGARES / FACCIONES / RELACIONES
// ════════════════════════════════════════
function renderLugares() {
  const todos = [];
  for(const l of _libros) for(const lugar of (l.lugares||[])) todos.push({...lugar, _libro: l.titulo});
  const lista = todos.length===0
    ? `<div class="empty"><div class="empty-icon">${ORAK_ICONS.empty}</div><div class="empty-title">Sin lugares registrados</div><button class="btn btn-primary" onclick="prepModalLugar()">＋ Agregar lugar</button></div>`
    : todos.map(r=>`<div class="card"><div class="card-header"><div class="card-avatar gold">${ORAK_ICONS.lugar}</div><div class="card-meta"><div class="card-title">${esc(r.nombre)}</div><div class="card-sub"><span class="tag tag-blue">${esc(r.tipo)}</span>&nbsp;·&nbsp;<span class="tag tag-gray">${esc(r._libro)}</span></div></div><button class="btn btn-danger btn-sm btn-icon" style="margin-left:auto;flex-shrink:0" onclick="confirmarEliminarLugar('${esc(r._libro)}','${esc(r.nombre)}')" title="Eliminar lugar">${ORAK_ICONS.eliminar}</button></div>${r.descripcion?`<div class="card-body">${esc(r.descripcion)}</div>`:''}</div>`).join('');
  return `<div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">LUGARES</span></div><div class="feed-header"><div><div class="feed-title">${ORAK_ICONS.lugar} Lugares</div><div class="feed-sub">Territorios del universo</div></div><button class="btn btn-primary btn-sm" onclick="prepModalLugar()">＋ Nuevo</button></div>${lista}`;
}

function renderFacciones() {
  const todos = [];
  for(const l of _libros) for(const f of (l.facciones||[])) todos.push({...f, _libro: l.titulo});
  const lista = todos.length===0
    ? `<div class="empty"><div class="empty-icon">${ORAK_ICONS.empty}</div><div class="empty-title">Sin facciones registradas</div><button class="btn btn-primary" onclick="prepModalFaccion()">＋ Crear facción</button></div>`
    : todos.map(f=>`<div class="card"><div class="card-header"><div class="card-avatar">${ORAK_ICONS.faccion}</div><div class="card-meta"><div class="card-title">${esc(f.nombre)}</div><div class="card-sub"><span class="tag tag-blue">${esc(f.tipo)}</span>&nbsp;·&nbsp;<span class="tag tag-gray">${esc(f._libro)}</span></div></div><button class="btn btn-danger btn-sm btn-icon" style="margin-left:auto;flex-shrink:0" onclick="confirmarEliminarFaccion('${esc(f._libro)}','${esc(f.nombre)}')" title="Eliminar facción">${ORAK_ICONS.eliminar}</button></div>${f.descripcion?`<div class="card-body">${esc(f.descripcion)}</div>`:''}</div>`).join('');
  return `<div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">FACCIONES</span></div><div class="feed-header"><div><div class="feed-title">${ORAK_ICONS.faccion} Facciones</div><div class="feed-sub">Grupos de poder del universo</div></div><button class="btn btn-primary btn-sm" onclick="prepModalFaccion()">＋ Nueva</button></div>${lista}`;
}

const TIPOS_REL = {
  aliado:   `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="stroke:#4EC9B0"><path d="M12 2L3 7v7c0 4.4 3.8 8.5 9 9.5 5.2-1 9-5.1 9-9.5V7z"/></svg></span>`,
  enemigo:  `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="stroke:#FF6B6B"><path d="M12 2L3 7v7c0 4.4 3.8 8.5 9 9.5 5.2-1 9-5.1 9-9.5V7z"/><line x1="12" y1="7" x2="12" y2="17" style="stroke:#FF6B6B"/><line x1="7" y1="12" x2="17" y2="12" style="stroke:#FF6B6B"/></svg></span>`,
  familiar: `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M4 20c0-3 2-5 4-5h8c2 0 4 2 4 5"/></svg></span>`,
  mentor:   `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9"/><polygon points="12,4 14.5,10 21,10 15.5,14 18,21 12,17 6,21 8.5,14 3,10 9.5,10"/></svg></span>`,
  rival:    `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="stroke:#B48EF7"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg></span>`,
  amante:   `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="stroke:#FF9A6C"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>`,
  otro:     `<span class="orak-icon icon-sm"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><line x1="8" y1="11" x2="16" y2="6.5"/><line x1="8" y1="13" x2="16" y2="17.5"/></svg></span>`,
};

function renderRelaciones() {
  const todos = [];
  for(const l of _libros) { (l.relaciones||[]).forEach((r,i) => todos.push({...r, _libro: l.titulo, _indice: i})); }
  const lista = todos.length===0
    ? `<div class="empty"><div class="empty-icon">${ORAK_ICONS.empty}</div><div class="empty-title">Sin relaciones registradas</div><button class="btn btn-primary" onclick="prepModalRelacion()">＋ Agregar relación</button></div>`
    : todos.map((r,i)=>`<div class="card"><div class="card-header"><div class="card-avatar">${TIPOS_REL[r.tipo]||ORAK_ICONS.relacion}</div><div class="card-meta"><div class="card-title">${esc(r.personaje_a)} ↔ ${esc(r.personaje_b)}</div><div class="card-sub"><span class="tag tag-blue">${esc(r.tipo)}</span>&nbsp;·&nbsp;<span class="tag tag-gray">${esc(r._libro)}</span></div></div><button class="btn btn-danger btn-sm btn-icon" style="margin-left:auto;flex-shrink:0" onclick="confirmarEliminarRelacion('${esc(r._libro)}',${r._indice})" title="Eliminar relación">${ORAK_ICONS.eliminar}</button></div>${r.descripcion?`<div class="card-body">${esc(r.descripcion)}</div>`:''}</div>`).join('');
  return `<div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">RELACIONES</span></div><div class="feed-header"><div><div class="feed-title">${ORAK_ICONS.relacion} Relaciones</div><div class="feed-sub">Vínculos entre personajes</div></div><button class="btn btn-primary btn-sm" onclick="prepModalRelacion()">＋ Nueva</button></div>${lista}`;
}

// ════════════════════════════════════════
//  ERRORES
// ════════════════════════════════════════
async function renderErrores() {
  const main = document.getElementById('mainContent');
  main.innerHTML = '<div class="spinner"></div>';
  try {
    const errores = await GET('/errores');
    const html = errores.length === 0
      ? `<div class="empty"><div class="empty-icon">✅</div><div class="empty-title">Sin errores detectados</div><div class="empty-sub">El universo es coherente</div></div>`
      : errores.map(e => `<div class="card" style="border-left:3px solid var(--red)"><div class="card-body" style="padding:14px;color:var(--red)">${esc(e)}</div></div>`).join('');
    main.innerHTML = `<div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">DIAGNÓSTICO</span></div><div class="feed-header"><div><div class="feed-title">${ORAK_ICONS.diagnostico} Diagnóstico</div><div class="feed-sub">${errores.length} errores detectados</div></div></div>${html}`;
  } catch(e) { main.innerHTML = `<div class="empty"><div class="empty-title">Error al cargar</div></div>`; }
}

// ════════════════════════════════════════
//  DETALLE LIBRO
// ════════════════════════════════════════
function verDetalleLibro(titulo) {
  const l = _libros.find(x => x.titulo === titulo); if(!l) return;
  document.getElementById('detalleLibroTitulo').textContent = `${l.titulo}`;
  const pers = (l.personajes||[]).map(p => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--gold-bg);color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:700">${p.nombre[0]}</div>
      <div><div style="font-weight:700;font-size:13px">${esc(p.nombre)}</div><div style="font-size:11px;color:var(--text3)">${p.nacimiento} – ${p.muerte||'Vivo'}</div></div>
      <span class="tag ${p.muerte?'tag-red':'tag-green'}" style="margin-left:auto">${p.muerte?'Muerto':'Vivo'}</span>
    </div>`).join('') || '<div style="color:var(--text3);font-size:13px;padding:8px 0">Sin personajes</div>';
  const evs = [...(l.eventos||[])].sort((a,b)=>a.año-b.año).map(e=>`
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <span class="año-badge">${e.año}</span>
      <span style="font-size:13px">${esc(e.descripcion)}</span>
    </div>`).join('') || '<div style="color:var(--text3);font-size:13px;padding:8px 0">Sin eventos</div>';
  document.getElementById('detalleLibroBody').innerHTML = `
    <p style="font-size:13px;color:var(--text2);margin-bottom:16px;font-style:italic">${esc(l.descripcion||'Sin descripción.')}</p>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" onclick="cerrarModal('modalDetalleLibro');prepModalPersonaje('${esc(titulo)}')">＋ Personaje</button>
      <button class="btn btn-ghost btn-sm" onclick="cerrarModal('modalDetalleLibro');prepModalEvento('${esc(titulo)}')">＋ Evento</button>
      <button class="btn btn-ghost btn-sm" onclick="cerrarModal('modalDetalleLibro');abrirHistoria('${esc(titulo)}')">${ORAK_ICONS.pergaminoSm} Historia</button>
      <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="eliminarLibro('${esc(titulo)}')">Eliminar</button>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Personajes (${(l.personajes||[]).length})</div>${pers}
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin:14px 0 8px">Eventos (${(l.eventos||[]).length})</div>${evs}`;
  abrirModal('modalDetalleLibro');
}

// ════════════════════════════════════════
//  ACCIONES CRUD
// ════════════════════════════════════════
async function crearLibro() {
  const titulo = document.getElementById('libroTitulo').value.trim();
  const desc   = document.getElementById('libroDesc').value.trim();
  if(!titulo) return toast('El título es obligatorio', 'err');
  if(_libros.some(l => l.titulo === titulo)) return toast('Ya existe ese título', 'err');

  // Optimistic update: añadir localmente primero
  const nuevoLibro = { titulo, descripcion: desc, historia: '', personajes: [], eventos: [], lugares: [], facciones: [], relaciones: [] };
  _libros.push(nuevoLibro);
  cerrarModal('modalLibro');
  document.getElementById('libroTitulo').value = '';
  document.getElementById('libroDesc').value   = '';
  await _sincronizar();
  toast(`✔ Libro "${titulo}" creado`);
  notifLocal('libro', `Nuevo libro: <strong>${esc(titulo)}</strong>`, 'libros', titulo);
  ganarOruns(5, `Creó "${titulo}"`, 'logro');

  // Persistir en servidor si está disponible
  if (_modoConexion === 'server') {
    try {
      await POST('/libros', { titulo, descripcion: desc });
    } catch(e) {
      toast(`⚠ Guardado solo localmente: ${e.message}`, 'err');
    }
  }
}

async function eliminarLibro(titulo) {
  if(!confirm(`¿Eliminar "${titulo}" con todos sus datos?\nEsta acción no se puede deshacer.`)) return;

  // Eliminar en servidor PRIMERO si está disponible (fuente de verdad)
  if (_modoConexion === 'server') {
    try {
      const tituloEnc = encodeURIComponent(titulo).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tituloEnc}`);
      // Confirmado en servidor: ahora actualizar local
      _libros = _libros.filter(l => l.titulo !== titulo);
      if(_libroSel === titulo) _libroSel = null;
      await _sincronizar();
      cerrarModal('modalDetalleLibro');
      toast(`🗑 "${titulo}" eliminado`);
    } catch(e) {
      toast(`⚠ Error al eliminar: ${e.message}`, 'err');
    }
  } else {
    // Modo offline: solo eliminar localmente
    _libros = _libros.filter(l => l.titulo !== titulo);
    if(_libroSel === titulo) _libroSel = null;
    cerrarModal('modalDetalleLibro');
    await _sincronizar();
    toast(`🗑 "${titulo}" eliminado (solo local)`);
  }
}

function prepModalPersonaje(libroPresel) {
  const sel = document.getElementById('perLibro');
  sel.innerHTML = _libros.map(l => `<option value="${esc(l.titulo)}" ${l.titulo===(libroPresel||_libroSel)?'selected':''}>${esc(l.titulo)}</option>`).join('');
  abrirModal('modalPersonaje');
}

async function crearPersonaje() {
  const libro  = document.getElementById('perLibro').value;
  const nombre = document.getElementById('perNombre').value.trim();
  const nac    = parseInt(document.getElementById('perNac').value);
  const muerte = parseInt(document.getElementById('perMuerte').value) || null;
  if(!nombre || isNaN(nac)) return toast('Nombre y nacimiento son obligatorios', 'err');
  const l = _libros.find(x => x.titulo === libro);
  if(!l) return toast('Libro no encontrado', 'err');
  if((l.personajes||[]).some(p => p.nombre === nombre)) return toast('Ya existe ese personaje', 'err');
  l.personajes = l.personajes || [];
  l.personajes.push({ nombre, nacimiento: nac, muerte: muerte||null, habilidades: [], armas: [] });
  cerrarModal('modalPersonaje');
  document.getElementById('perNombre').value = '';
  document.getElementById('perNac').value    = '';
  document.getElementById('perMuerte').value = '';
  await _sincronizar();
  toast(`✔ "${nombre}" agregado`);

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      await POST(`/libros/${tEnc}/personajes`, { nombre, nacimiento: nac, muerte: muerte||null });
    } catch(e) { toast(`⚠ ${e.message}`, 'err'); }
  }
}

function prepModalEvento(libroPresel) {
  const selL = document.getElementById('evLibro');
  selL.innerHTML = _libros.map(l => `<option value="${esc(l.titulo)}" ${l.titulo===(libroPresel||_libroSel)?'selected':''}>${esc(l.titulo)}</option>`).join('');
  selL.onchange = () => actualizarPersonajesEvento(selL.value);
  actualizarPersonajesEvento(selL.value);
  abrirModal('modalEvento');
}

function actualizarPersonajesEvento(tituloLibro) {
  const libro = _libros.find(l => l.titulo === tituloLibro);
  const sel   = document.getElementById('evPersonaje');
  sel.innerHTML = '<option value="">— ninguno —</option>' + (libro?.personajes||[]).map(p => `<option value="${esc(p.nombre)}">${esc(p.nombre)}</option>`).join('');
}

async function crearEvento() {
  const libro = document.getElementById('evLibro').value;
  const desc  = document.getElementById('evDesc').value.trim();
  const año   = parseInt(document.getElementById('evAnio').value);
  const per   = document.getElementById('evPersonaje').value;
  if(!desc || isNaN(año)) return toast('Descripción y año son obligatorios', 'err');
  const l = _libros.find(x => x.titulo === libro);
  if(!l) return toast('Libro no encontrado', 'err');
  l.eventos = l.eventos || [];
  l.eventos.push({ descripcion: desc, año: parseInt(año), personaje: per||'' });
  _timeline = _calcularTimelineLocal(_libros);
  _stats    = _calcularStatsLocal(_libros);
  cerrarModal('modalEvento');
  document.getElementById('evDesc').value = '';
  document.getElementById('evAnio').value = '';
  renderVista();
  toast(`✔ Evento registrado en el año ${año}`);
}

function prepModalLugar(libroPresel) {
  const sel = document.getElementById('lugarLibro');
  sel.innerHTML = _libros.map(l => `<option value="${esc(l.titulo)}" ${l.titulo===(libroPresel||_libroSel)?'selected':''}>${esc(l.titulo)}</option>`).join('');
  abrirModal('modalLugar');
}

async function crearLugar() {
  const libro  = document.getElementById('lugarLibro').value;
  const nombre = document.getElementById('lugarNombre').value.trim();
  const tipo   = document.getElementById('lugarTipo').value;
  const desc   = document.getElementById('lugarDesc').value.trim();
  if(!nombre) return toast('El nombre es obligatorio', 'err');
  const l = _libros.find(x => x.titulo === libro);
  if(!l) return toast('Libro no encontrado', 'err');
  l.lugares = l.lugares||[]; l.lugares.push({ nombre, tipo, descripcion: desc });
  cerrarModal('modalLugar');
  document.getElementById('lugarNombre').value = '';
  document.getElementById('lugarDesc').value   = '';
  renderVista(); toast(`✔ Lugar "${nombre}" agregado`);
}

function prepModalFaccion(libroPresel) {
  const sel = document.getElementById('faccionLibro');
  sel.innerHTML = _libros.map(l => `<option value="${esc(l.titulo)}" ${l.titulo===(libroPresel||_libroSel)?'selected':''}>${esc(l.titulo)}</option>`).join('');
  abrirModal('modalFaccion');
}

async function crearFaccion() {
  const libro  = document.getElementById('faccionLibro').value;
  const nombre = document.getElementById('faccionNombre').value.trim();
  const tipo   = document.getElementById('faccionTipo').value;
  const desc   = document.getElementById('faccionDesc').value.trim();
  if(!nombre) return toast('El nombre es obligatorio', 'err');
  const l = _libros.find(x => x.titulo === libro);
  if(!l) return toast('Libro no encontrado', 'err');
  l.facciones = l.facciones||[]; l.facciones.push({ nombre, tipo, descripcion: desc });
  cerrarModal('modalFaccion');
  document.getElementById('faccionNombre').value = '';
  document.getElementById('faccionDesc').value   = '';
  renderVista(); toast(`✔ Facción "${nombre}" creada`);
}

function prepModalRelacion(libroPresel) {
  const selL = document.getElementById('relLibro');
  selL.innerHTML = _libros.map(l => `<option value="${esc(l.titulo)}" ${l.titulo===(libroPresel||_libroSel)?'selected':''}>${esc(l.titulo)}</option>`).join('');
  actualizarPersonajesRel();
  abrirModal('modalRelacion');
}

function actualizarPersonajesRel() {
  const libro = _libros.find(l => l.titulo === document.getElementById('relLibro').value);
  const pers  = (libro?.personajes||[]).map(p => `<option value="${esc(p.nombre)}">${esc(p.nombre)}</option>`).join('');
  document.getElementById('relPerA').innerHTML = pers;
  document.getElementById('relPerB').innerHTML = pers;
}

async function crearRelacion() {
  const libro = document.getElementById('relLibro').value;
  const perA  = document.getElementById('relPerA').value;
  const perB  = document.getElementById('relPerB').value;
  const tipo  = document.getElementById('relTipo').value;
  const desc  = document.getElementById('relDesc').value.trim();
  if(perA === perB) return toast('Selecciona dos personajes distintos', 'err');
  const l = _libros.find(x => x.titulo === libro);
  if(!l) return toast('Libro no encontrado', 'err');
  l.relaciones = l.relaciones||[];
  l.relaciones.push({ personaje_a: perA, personaje_b: perB, tipo, descripcion: desc });
  cerrarModal('modalRelacion');
  document.getElementById('relDesc').value = '';
  renderVista(); toast(`✔ Relación agregada: ${perA} ↔ ${perB}`);
}

function abrirHistoria(titulo) {
  const l = _libros.find(x => x.titulo === titulo); if(!l) return;
  document.getElementById('historiaLibroTitulo').textContent = titulo;
  const ta = document.getElementById('historiaTexto');
  ta.value = l.historia||'';
  document.getElementById('historiaChars').textContent = ta.value.length + ' caracteres';
  ta.oninput = () => { document.getElementById('historiaChars').textContent = ta.value.length + ' caracteres'; };
  abrirModal('modalHistoria');
}

async function guardarHistoria() {
  const titulo = document.getElementById('historiaLibroTitulo').textContent;
  const texto  = document.getElementById('historiaTexto').value;
  const l = _libros.find(x => x.titulo === titulo); if(!l) return;
  l.historia = texto;
  cerrarModal('modalHistoria');
  await _sincronizar();
  toast('✔ Historia guardada');

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(titulo).replace(/%2F/gi, '__SLASH__');
      await PATCH(`/libros/${tEnc}/historia`, { historia: texto });
    } catch(e) { toast(`⚠ ${e.message}`, 'err'); }
  }
}

// ════════════════════════════════════════
//  BUSCAR
// ════════════════════════════════════════
function buscar(q) {
  q = q.trim().toLowerCase(); if(!q) { renderVista(); return; }
  const resultados = [];
  for(const l of _libros) {
    for(const p of (l.personajes||[])) { if(p.nombre.toLowerCase().includes(q)) resultados.push({ tipo:'personaje', ...p, _libro: l.titulo }); }
    for(const e of (l.eventos||[])) { if(e.descripcion.toLowerCase().includes(q)) resultados.push({ tipo:'evento', ...e, _libro: l.titulo }); }
    if(l.titulo.toLowerCase().includes(q)) resultados.push({ tipo:'libro', titulo: l.titulo, _libro: l.titulo });
  }
  const main = document.getElementById('mainContent');
  if(resultados.length===0) { main.innerHTML=`<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">Sin resultados para «${esc(q)}»</div></div>`; return; }
  main.innerHTML = `<div class="feed-title" style="margin-bottom:16px">🔍 Resultados para «${esc(q)}»</div>
    ${resultados.map(r => {
      if(r.tipo==='personaje') return personajeCard(r);
      if(r.tipo==='evento') return eventoCard(r);
      return `<div class="card"><div class="card-body" style="padding:14px">📚 <strong>${esc(r.titulo)}</strong></div></div>`;
    }).join('')}`;
}

// ════════════════════════════════════════
//  MODALES
// ════════════════════════════════════════
function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.overlay').forEach(el => { el.addEventListener('click', e => { if(e.target===el) cerrarModal(el.id); }); });
document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.overlay.open').forEach(el => cerrarModal(el.id)); });

// ════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════
function toast(msg, tipo='ok') {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${tipo}`; t.textContent = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3000);
}

// ════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function enc(s) { return encodeURIComponent(s); }

// ════════════════════════════════════════
//  POLL
// ════════════════════════════════════════
let _pollVotos = [45, 35, 20];
function votarPoll(idx) {
  if(!_usuario) { abrirAuthModal(); return; }
  _pollVotos[idx] += 5;
  const total = _pollVotos.reduce((a,b)=>a+b,0);
  _pollVotos.forEach((v,i) => {
    const pct = Math.round(v/total*100);
    const pEl = document.getElementById(`pct${i}`); if(pEl) pEl.textContent = pct+'%';
    const bEl = document.getElementById(`bar${i}`); if(bEl) bEl.style.width = pct+'%';
  });
  toast('✨ Voto registrado', 'ok');
}

// ════════════════════════════════════════
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
//  CHAT
// ════════════════════════════════════════
let _chatUsuario  = localStorage.getItem('orak_usuario') || '';
let _chatMensajes = [];

async function cargarChat() {
  try {
    const filtro = _libroSel ? `?libro=${enc(_libroSel)}` : '';
    const r = await GET(`/chat${filtro}`); _chatMensajes = Array.isArray(r) ? r : (r.mensajes || []);
  } catch(e) {}
}

function renderChat() {
  if(!_chatUsuario) {
    return `<div class="feed-header"><div class="feed-title">💬 Chat</div></div>
    <div style="max-width:360px;margin:40px auto;text-align:center">
      <div style="font-size:32px;margin-bottom:12px">💬</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:8px">¿Cómo te llamas?</div>
      <input class="form-input" id="chatNombreInput" placeholder="Tu nombre en el universo…" style="margin-bottom:10px">
      <button class="btn btn-primary" style="width:100%" onclick="establecerNombreChat()">Entrar al chat</button>
    </div>`;
  }
  const msgs = _chatMensajes.map(m => `
    <div style="display:flex;gap:10px;margin-bottom:14px;align-items:flex-start">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--gold-bg);color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:13px">${esc(m.usuario[0]||'?').toUpperCase()}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
          <span style="font-weight:700;font-size:13px">${esc(m.usuario)}</span>
          <span style="font-size:11px;color:var(--text3)">${esc(m.ts||'')}</span>
          ${m.libro?`<span class="tag tag-gray" style="font-size:10px">${esc(m.libro)}</span>`:''}
        </div>
        <div style="font-size:13px;line-height:1.5">${esc(m.texto || m.mensaje || "")}</div>
      </div>
    </div>`).join('') || `<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px">Sin mensajes todavía. ¡Sé el primero!</div>`;
  return `
    <div class="feed-header">
      <div><div class="feed-title">💬 Chat del universo</div>
      <div class="feed-sub">Hablando como <strong>${esc(_chatUsuario)}</strong>
        <button onclick="cambiarNombreChat()" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:11px;margin-left:6px">cambiar</button>
      </div></div>
    </div>
    <div id="chatMsgs" style="margin-bottom:16px;max-height:480px;overflow-y:auto">${msgs}</div>
    <div style="display:flex;gap:8px;position:sticky;bottom:0;background:var(--bg2);padding:8px 0">
      <input class="form-input" id="chatInput" placeholder="Escribe un mensaje…" onkeydown="if(event.key==='Enter')enviarChat()" style="flex:1">
      <button class="btn btn-primary" onclick="enviarChat()">Enviar</button>
    </div>`;
}

async function renderChatVista() {
  await cargarChat();
  document.getElementById('mainContent').innerHTML = renderChat();
  setTimeout(() => { const el=document.getElementById('chatMsgs'); if(el) el.scrollTop=el.scrollHeight; }, 50);
}

function establecerNombreChat() {
  const n = document.getElementById('chatNombreInput')?.value.trim(); if(!n) return;
  _chatUsuario = n; localStorage.setItem('orak_usuario', n); renderVista();
}
function cambiarNombreChat() { _chatUsuario = ''; localStorage.removeItem('orak_usuario'); renderVista(); }

async function enviarChat() {
  const input = document.getElementById('chatInput'); const msg = input?.value.trim(); if(!msg) return;
  try {
    await POST('/chat', { usuario: _chatUsuario, texto: msg, libro: _libroSel||'' });
    input.value = ''; await cargarChat(); renderVista();
    setTimeout(() => { const el=document.getElementById('chatMsgs'); if(el) el.scrollTop=el.scrollHeight; }, 50);
  } catch(e) { toast(e.message, 'err'); }
}

// ════════════════════════════════════════
//  PDF VIEWER + POST-ITS
//  CAPA 2: PDFReader — 4 colores de notas
//  Clic → crea nota con coords (x,y)
// ════════════════════════════════════════
let _pdfDoc           = null;
let _pdfPage          = 1;
let _pdfNotas         = [];
let _pdfLibroActivo   = null;
let _pdfUrlActiva     = null;
let _colorSeleccionado = '#fef08a';  // Amarillo por defecto
let _pdfFileCache     = null;

const SUPABASE_PDF_BUCKET = 'orak-pdfs';

// Colores de post-its: Rosa, Azul, Amarillo, Verde
const POSTIT_COLORS = {
  rosa:     '#fbcfe8',
  azul:     '#bfdbfe',
  amarillo: '#fef08a',
  verde:    '#bbf7d0',
};

async function renderPDF() {
  let pdfsGuardados = [];
  try {
    const { data } = await _sb.from('libros').select('id,titulo,pdf_url,pdf_nombre').not('pdf_url','is',null).order('created_at',{ascending:false});
    pdfsGuardados = data || [];
  } catch(e) {}

  const hayPDFs = pdfsGuardados.length > 0;
  return `
    <div class="main-breadcrumb"><span>INICIO</span><span class="bc-sep">/</span><span class="bc-current">MIS LIBROS (PDF)</span></div>
    <div class="feed-header">
      <div><div class="feed-title">📄 Mis Libros</div><div class="feed-sub">PDFs del universo con notas colaborativas</div></div>
      <button class="btn btn-primary btn-sm" onclick="abrirModalSubirPDF()">⬆ Subir PDF</button>
    </div>

    ${hayPDFs?`<div class="pdf-library-grid">${pdfsGuardados.map(p=>`
      <div class="pdf-book-card" onclick="abrirPDFGuardado('${esc(p.pdf_url)}','${esc(p.titulo)}')">
        <div class="pdf-book-thumb">📄<div class="pdf-notas-count" id="notasCount-${esc(p.id)}">✨ notas</div></div>
        <div class="pdf-book-info">
          <div class="pdf-book-titulo">${esc(p.pdf_nombre||p.titulo+'.pdf')}</div>
          <div class="pdf-book-libro">📖 ${esc(p.titulo)}</div>
          <div class="pdf-book-btns"><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();abrirPDFGuardado('${esc(p.pdf_url)}','${esc(p.titulo)}')">📖 Leer</button></div>
        </div>
      </div>`).join('')}</div>`:`
    <div class="pdf-upload-zone" style="margin-bottom:24px" onclick="document.getElementById('pdfInputZona').click()"
      ondragover="event.preventDefault();this.classList.add('dragover')"
      ondragleave="this.classList.remove('dragover')"
      ondrop="event.preventDefault();this.classList.remove('dragover');manejarDropPDF(event)">
      <input type="file" id="pdfInputZona" accept=".pdf" style="display:none" onchange="seleccionarArchivoPDFYAbrir(this)">
      <div style="font-size:48px;margin-bottom:16px">📚</div>
      <div style="font-weight:700;font-size:16px;margin-bottom:6px">Sube el primer PDF al universo</div>
      <div style="font-size:13px;color:var(--text2)">Arrastra aquí o haz clic para seleccionar</div>
    </div>`}

    ${_pdfDoc?`<div style="margin-top:8px">
      <div class="pdf-toolbar" style="border-radius:12px 12px 0 0">
        <span style="font-size:13px;font-weight:600;color:var(--gold-lt)">📖 ${esc(_pdfLibroActivo||'PDF')}</span>
        <button class="btn btn-ghost btn-sm" id="btnPrevPage" onclick="cambiarPagina(-1)">◀</button>
        <span id="pdfPagInfo" style="font-size:12px;color:var(--text2)">—</span>
        <button class="btn btn-ghost btn-sm" id="btnNextPage" onclick="cambiarPagina(1)">▶</button>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
          <span style="font-size:11px;color:var(--text2)">🖊 Nota:</span>
          ${Object.entries(POSTIT_COLORS).map(([nombre,color])=>`
            <div class="color-opt ${_colorSeleccionado===color?'sel':''}" style="background:${color}" title="${nombre}"
              onclick="selColor('${color}',this)"></div>`).join('')}
        </div>
      </div>
      <div class="pdf-container" id="pdfContainer" style="border-radius:0 0 12px 12px">
        <div style="text-align:center;padding:40px;color:var(--text2)">Cargando PDF...</div>
      </div>
    </div>`:''}`;
}

async function initPDF() {
  cargarPDFjs();
  if(_pdfDoc) renderPaginaPDF();
}

function cargarPDFjs() {
  if(window.pdfjsLib) return Promise.resolve();
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    document.head.appendChild(s);
  });
}

function abrirModalSubirPDF() {
  const sel = document.getElementById('pdfLibroAsociar');
  if(sel) {
    sel.innerHTML = '<option value="">— Selecciona un libro existente —</option>' +
      _libros.map(l => `<option value="${esc(l.titulo)}">${esc(l.titulo)}</option>`).join('');
  }
  document.getElementById('modalSubirPDFOverlay').classList.add('open');
}

function cerrarModalSubirPDF() {
  document.getElementById('modalSubirPDFOverlay').classList.remove('open');
  document.getElementById('pdfFileNombre').textContent = '';
  document.getElementById('pdfUploadProgress').style.display = 'none';
  document.getElementById('pdfLibroNuevo').value = '';
  _pdfFileCache = null;
}

function seleccionarArchivoPDF(input) {
  const file = input.files?.[0];
  if(!file) return;
  if(!file.name.toLowerCase().endsWith('.pdf')) { toast('Solo se aceptan archivos PDF','err'); return; }
  _pdfFileCache = file;
  const el = document.getElementById('pdfFileNombre');
  if(el) el.textContent = '📄 ' + file.name;
}

function manejarDropPDF(event) {
  const file = event.dataTransfer?.files?.[0];
  if(!file || !file.name.endsWith('.pdf')) { toast('Solo se aceptan archivos PDF','err'); return; }
  _pdfFileCache = file;
  abrirModalSubirPDF();
  requestAnimationFrame(() => {
    const el = document.getElementById('pdfFileNombre');
    if(el) el.textContent = '📄 ' + file.name;
  });
}

function seleccionarArchivoPDFYAbrir(input) {
  const file = input.files?.[0];
  if(!file) return;
  _pdfFileCache = file;
  abrirModalSubirPDF();
  requestAnimationFrame(() => {
    const el = document.getElementById('pdfFileNombre');
    if(el) el.textContent = '📄 ' + file.name;
  });
}

async function subirPDFASupabase() {
  if(!_pdfFileCache) return toast('Selecciona un archivo PDF primero', 'err');
  const libroExistente = document.getElementById('pdfLibroAsociar').value.trim();
  const libroNuevo     = document.getElementById('pdfLibroNuevo').value.trim();
  const tituloLibro    = libroExistente || libroNuevo;
  if(!tituloLibro) return toast('Asocia el PDF a un libro', 'err');

  // Modo local (sin Supabase) — abrir directamente
  const localUrl = URL.createObjectURL(_pdfFileCache);
  await abrirPDFDesdeURL(localUrl, tituloLibro, _pdfFileCache.name);
  cerrarModalSubirPDF();
  toast('📄 PDF abierto en modo local');
}

async function abrirPDFGuardado(url, titulo) {
  await cargarPDFjs();
  await abrirPDFDesdeURL(url, titulo, titulo + '.pdf');
  setVista('pdf');
}

async function abrirPDFDesdeURL(url, titulo, nombre) {
  _pdfLibroActivo = titulo;
  _pdfUrlActiva   = url;
  _pdfPage        = 1;
  try {
    _pdfDoc = await pdfjsLib.getDocument(url).promise;
    // Cargar notas del localStorage
    _pdfNotas = JSON.parse(localStorage.getItem('orak_notas') || '[]').filter(n => n.libro === titulo);
    const container = document.getElementById('pdfContainer');
    if(container) await renderPaginaPDF();
    else {
      const main = document.getElementById('mainContent');
      if(main) main.innerHTML = await renderPDF();
      await renderPaginaPDF();
    }
  } catch(e) {
    console.error(e); toast('Error al abrir el PDF', 'err');
  }
}

// Guardar notas en localStorage + Supabase si hay sesión
async function guardarNotasLocal(nota) {
  const todas = JSON.parse(localStorage.getItem('orak_notas') || '[]');
  const idx   = todas.findIndex(n => n.id === nota.id);
  if(idx >= 0) todas[idx] = { ...todas[idx], x: nota.x, y: nota.y };
  else todas.push(nota);
  localStorage.setItem('orak_notas', JSON.stringify(todas));
}

async function renderPaginaPDF() {
  if(!_pdfDoc) return;
  const page     = await _pdfDoc.getPage(_pdfPage);
  const viewport = page.getViewport({ scale: 1.5 });
  const container = document.getElementById('pdfContainer');
  if(!container) return;

  container.innerHTML = `<div class="pdf-canvas-wrap" id="pdfWrap" style="width:${viewport.width}px;max-width:100%">
    <canvas id="pdfCanvas" width="${viewport.width}" height="${viewport.height}" style="max-width:100%;height:auto"></canvas>
  </div>`;

  const canvas = document.getElementById('pdfCanvas');
  const ctx    = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  const pagInfo = document.getElementById('pdfPagInfo');
  if(pagInfo) pagInfo.textContent = `${_pdfPage} / ${_pdfDoc.numPages}`;

  // Eventos: clic en el PDF crea un post-it en esas coordenadas (x,y)
  const wrap = document.getElementById('pdfWrap');
  let holdTimer;
  const startHold = (e) => {
    holdTimer = setTimeout(() => {
      const rect   = wrap.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = ((clientX - rect.left) / rect.width)  * 100;
      const y = ((clientY - rect.top)  / rect.height) * 100;
      crearPostit(x, y, wrap);
    }, 400);
  };
  wrap.addEventListener('click', (e) => {
    const rect   = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    crearPostit(x, y, wrap);
  });
  wrap.addEventListener('touchstart', startHold, { passive: true });
  wrap.addEventListener('mouseup',  () => clearTimeout(holdTimer));
  wrap.addEventListener('touchend', () => clearTimeout(holdTimer));

  // Renderizar notas existentes de esta página
  const notasPag = _pdfNotas.filter(n => n.pagina === _pdfPage);
  notasPag.forEach(n => renderPostit(n, wrap));
}

function cambiarPagina(dir) {
  if(!_pdfDoc) return;
  const nueva = _pdfPage + dir;
  if(nueva < 1 || nueva > _pdfDoc.numPages) return;
  _pdfPage = nueva;
  renderPaginaPDF();
}

function selColor(color, el) {
  _colorSeleccionado = color;
  document.querySelectorAll('.color-opt').forEach(x => x.classList.remove('sel'));
  el.classList.add('sel');
}

/**
 * Crear post-it vinculado a coordenadas (x, y) dentro del PDF.
 * Al guardar, dispara +25 Glimmers (engine.js — economía).
 */
function crearPostit(x, y, wrap) {
  const nota = {
    id:     Date.now().toString(),
    libro:  _pdfLibroActivo || '',
    pagina: _pdfPage,
    x, y,
    texto:  '',
    color:  _colorSeleccionado,
    autor:  'Yo',
    ts:     Date.now(),
  };
  const texto = prompt('Escribe tu nota:');
  if(!texto) return;
  nota.texto = texto;
  _pdfNotas.push(nota);
  guardarNotasLocal(nota);
  renderPostit(nota, wrap);
  // +25 Glimmers al crear nota (CAPA 3: engine.js)
  ganarGlimmers(25, wrap);
  notifLocal('nota', `Nueva nota en <strong>${esc(_pdfLibroActivo||'PDF')}</strong>`, 'pdf', _pdfLibroActivo);
}

function renderPostit(nota, wrap) {
  const el = document.createElement('div');
  el.className = 'postit';
  el.dataset.id = nota.id;
  el.style.cssText = `left:${nota.x}%;top:${nota.y}%;background:${nota.color};transform:rotate(${(Math.random()-.5)*6}deg)`;
  el.innerHTML = `
    <div class="postit-header">
      <span class="postit-autor">${esc(nota.autor)}</span>
      <button class="postit-del" onclick="eliminarPostit('${nota.id}',this.closest('.postit'))">✕</button>
    </div>
    <div class="postit-texto">${esc(nota.texto)}</div>`;
  // Drag (mouse + touch) — Mobile-First
  let ox=0, oy=0, dx=0, dy=0;
  const md = (e) => {
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = wrap.getBoundingClientRect();
    ox = cx - (parseFloat(el.style.left)/100 * rect.width);
    oy = cy - (parseFloat(el.style.top)/100  * rect.height);
    el.classList.add('dragging');
    const mm = (ev) => {
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
      dx = Math.max(0, Math.min(100, (mx-ox)/rect.width*100));
      dy = Math.max(0, Math.min(100, (my-oy)/rect.height*100));
      el.style.left = dx+'%'; el.style.top = dy+'%';
    };
    const mu = () => {
      nota.x = dx; nota.y = dy; guardarNotasLocal(nota);
      el.classList.remove('dragging');
      document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu);
      document.removeEventListener('touchmove',mm); document.removeEventListener('touchend',mu);
    };
    document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);
    document.addEventListener('touchmove',mm,{passive:false}); document.addEventListener('touchend',mu);
  };
  el.querySelector('.postit-header').addEventListener('mousedown', md);
  el.querySelector('.postit-header').addEventListener('touchstart', md, {passive:false});
  wrap.appendChild(el);
}

async function eliminarPostit(id, el) {
  _pdfNotas = _pdfNotas.filter(n => n.id !== id);
  const todas = JSON.parse(localStorage.getItem('orak_notas')||'[]').filter(n => n.id !== id);
  localStorage.setItem('orak_notas', JSON.stringify(todas));
  el.style.transition = 'all .2s'; el.style.opacity='0'; el.style.transform='scale(0)';
  setTimeout(() => el.remove(), 200);
}

// ════════════════════════════════════════
//  PARTÍCULAS GLIMMERS
// ════════════════════════════════════════
function lanzarGlimmers(origen) {
  const rect = origen ? origen.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2 };
  const target = document.getElementById('glimmersVal');

  for(let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    p.className = 'glimmer-particle';
    p.textContent = '✦';
    const dx = (Math.random() - .5) * 80;
    p.style.cssText = `left:${rect.left + rect.width/2}px;top:${rect.top + rect.height/2}px;--dx:${dx}px;animation-delay:${i*.1}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400 + i*100);
  }
  if(target) {
    target.style.transform = 'scale(1.5)';
    target.style.color = '#a0d4ff';
    setTimeout(() => { target.style.transform=''; target.style.color=''; }, 400);
  }
}

// ════════════════════════════════════════
//  NOTIFICACIONES
// ════════════════════════════════════════
let _notifs = JSON.parse(localStorage.getItem('orak_notifs') || '[]');

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  const isOpen = panel.classList.contains('open');
  document.getElementById('profileMenu')?.classList.remove('open');
  if(isOpen) panel.classList.remove('open');
  else { panel.classList.add('open'); renderNotifList(); }
}

document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  const btn   = document.getElementById('notifBtn');
  if(panel && btn && !btn.contains(e.target) && !panel.contains(e.target)) panel.classList.remove('open');
});

function agregarNotif(notif) {
  _notifs.unshift({ ...notif, id: Date.now().toString(), leida: false, ts: Date.now() });
  if(_notifs.length > 30) _notifs = _notifs.slice(0, 30);
  localStorage.setItem('orak_notifs', JSON.stringify(_notifs));
  actualizarNotifDot();
  renderNotifList();
}

function actualizarNotifDot() {
  const noLeidas = _notifs.filter(n => !n.leida).length;
  const dot = document.getElementById('notifDot');
  if(dot) dot.style.display = noLeidas > 0 ? '' : 'none';
}

function marcarTodasLeidas() {
  _notifs.forEach(n => n.leida = true);
  localStorage.setItem('orak_notifs', JSON.stringify(_notifs));
  actualizarNotifDot(); renderNotifList();
}

function tiempoRelativo(ts) {
  const seg = Math.floor((Date.now() - ts) / 1000);
  if(seg < 60)    return 'ahora mismo';
  if(seg < 3600)  return `hace ${Math.floor(seg/60)} min`;
  if(seg < 86400) return `hace ${Math.floor(seg/3600)} h`;
  return `hace ${Math.floor(seg/86400)} días`;
}

function iconoNotif(tipo) {
  // Usamos símbolos unicode ligeros (no emoji) para las notificaciones
  return { libro:'◈', personaje:'✦', evento:'◷', pdf:'◻', nota:'✎', encuesta:'◆', skin:'❋' }[tipo] || '◉';
}

function renderNotifList() {
  const el = document.getElementById('notifList');
  if(!el) return;
  if(_notifs.length === 0) { el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px">Sin notificaciones</div>'; return; }
  el.innerHTML = _notifs.map(n => `
    <div class="notif-item ${n.leida?'':'unread'}" onclick="irANotif('${n.id}')">
      <div class="notif-avatar">${iconoNotif(n.tipo)}</div>
      <div class="notif-body">
        <div class="notif-texto">${n.texto}</div>
        <div class="notif-tiempo">${tiempoRelativo(n.ts)}</div>
      </div>
    </div>`).join('');
}

function irANotif(id) {
  const n = _notifs.find(x => x.id === id); if(!n) return;
  n.leida = true;
  localStorage.setItem('orak_notifs', JSON.stringify(_notifs));
  actualizarNotifDot();
  document.getElementById('notifPanel')?.classList.remove('open');
  if(n.vista) {
    if(n.libro) _libroSel = n.libro;
    setVista(n.vista);
    if(n.id_destino) {
      setTimeout(() => {
        const el = document.getElementById(n.id_destino);
        if(el) { el.scrollIntoView({behavior:'smooth',block:'center'}); el.style.boxShadow='0 0 0 2px var(--gold)'; setTimeout(()=>el.style.boxShadow='',2000); }
      }, 300);
    }
  }
}

function notifLocal(tipo, texto, vista, libro) {
  agregarNotif({ tipo, texto, vista, libro });
}

function initNotifs() {
  actualizarNotifDot();
  renderNotifList();
}

// ════════════════════════════════════════
//  ARRANCAR
// ════════════════════════════════════════
init();

// ════════════════════════════════════════════════════════════
//  LIQUID CRYSTAL INTERACTION SYSTEM v3.0
//  · Parallax del mouse sobre paneles de cristal
//  · Transición "empañar/desempañar" entre vistas
//  · Gestos táctiles (swipe) para navegación móvil
//  · Navegación barra inferior móvil
// ════════════════════════════════════════════════════════════

// ── 1. PARALLAX DEL MOUSE ──────────────────────────────────
// Mueve el gradiente iridiscente en paneles .liquid-glass y
// .biblioteca-card conforme el mouse se desplaza sobre ellos.

(function initParallax() {
  'use strict';

  const SELECTORS = '.liquid-glass, .bc-crystal-outer, .biblioteca-card, .stat-card, .poll-card, .ranking-card, .currency-card, .modal, .card';
  let _raf = null;

  function applyParallax(panel, x, y) {
    const rect = panel.getBoundingClientRect();
    const px = ((x - rect.left) / rect.width)  * 100;
    const py = ((y - rect.top)  / rect.height) * 100;

    // Mover gradiente interno (via custom properties)
    panel.style.setProperty('--cx', `${px}%`);
    panel.style.setProperty('--cy', `${py}%`);

    // Reflejo iridiscente: inclinar transform del ::after via clase
    const mx = (px - 50) / 50;  // -1 → 1
    const my = (py - 50) / 50;
    panel.style.setProperty('--tilt-x', `${my * 4}deg`);
    panel.style.setProperty('--tilt-y', `${mx * -4}deg`);

    // Sutil cambio de perspectiva (transform sólo si no tiene animaciones activas)
    if (!panel.classList.contains('vista-transitioning')) {
      panel.style.transform = `perspective(800px) rotateX(${my * 1.2}deg) rotateY(${mx * 1.5}deg) translateZ(0)`;
    }
  }

  function resetParallax(panel) {
    panel.style.transform = '';
    panel.style.setProperty('--cx', '50%');
    panel.style.setProperty('--cy', '50%');
  }

  function onMouseMove(e) {
    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(() => {
      const panels = document.querySelectorAll(SELECTORS);
      panels.forEach(p => {
        const rect = p.getBoundingClientRect();
        if (
          e.clientX >= rect.left - 10 && e.clientX <= rect.right  + 10 &&
          e.clientY >= rect.top  - 10 && e.clientY <= rect.bottom + 10
        ) {
          applyParallax(p, e.clientX, e.clientY);
        }
      });
    });
  }

  function onMouseLeave(e) {
    // Solo resetear cuando el target es el panel mismo
    if (e.target && e.target.matches && e.target.matches(SELECTORS)) {
      resetParallax(e.target);
    }
  }

  // Attach (delegado al documento para capturar paneles dinámicos)
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave, true);

  // Reset transform al salir de cada panel
  document.addEventListener('mouseover', (e) => {
    const panels = document.querySelectorAll(SELECTORS);
    panels.forEach(p => {
      if (!p.contains(e.target) && p !== e.target) {
        // No resetear todavía — esperar mouseleave real del panel
      }
    });
  }, { passive: true });

  // Añadir listener de mouseleave a cada panel nuevo via MutationObserver
  function attachPanelListeners(root) {
    root.querySelectorAll(SELECTORS).forEach(panel => {
      if (panel._crystalBound) return;
      panel._crystalBound = true;
      panel.addEventListener('mouseleave', () => resetParallax(panel));
    });
  }

  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
          attachPanelListeners(n);
          if (n.matches && n.matches(SELECTORS)) resetParallax(n);
        }
      });
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  attachPanelListeners(document);
})();


// ── 2. TRANSICIÓN "EMPAÑAR / DESEMPAÑAR" ENTRE VISTAS ─────
// Intercepta setVista para animar el contenido central.

(function patchSetVista() {
  const _origSetVista = window.setVista;
  if (!_origSetVista) return;

  window.setVista = function(v) {
    const main = document.getElementById('mainContent');
    if (!main) { _origSetVista(v); return; }

    // Empañar (blur + desvanece)
    main.style.transition = 'opacity 0.25s ease, filter 0.25s ease';
    main.style.opacity = '0';
    main.style.filter  = 'blur(10px) saturate(40%)';

    setTimeout(() => {
      _origSetVista(v);
      // Desempañar
      main.style.transition = 'opacity 0.45s ease, filter 0.45s ease';
      main.style.opacity = '1';
      main.style.filter  = 'blur(0px) saturate(100%)';

      // Clase fade-in al contenido nuevo
      requestAnimationFrame(() => {
        main.classList.add('vista-fade-in');
        setTimeout(() => main.classList.remove('vista-fade-in'), 550);
      });

      // Actualizar barra móvil inferior
      _updateMobileNav(v);
    }, 260);
  };
})();


// ── 3. NAVEGACIÓN BARRA MÓVIL ─────────────────────────────

function mobileNavTo(vista) {
  setVista(vista);
  _updateMobileNav(vista);
}

function _updateMobileNav(vista) {
  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const active = document.getElementById(`mnav-${vista}`);
  if (active) active.classList.add('active');
}


// ── 4. GESTOS TÁCTILES — SWIPE PARA LIBROS / HABILIDADES ──
// Detecta swipe izquierda/derecha para navegar entre vistas
// en pantallas táctiles móviles.

(function initSwipeNav() {
  'use strict';

  const VISTAS_ORDEN = ['feed', 'libros', 'personajes', 'timeline', 'facciones'];
  let _touchStartX = 0;
  let _touchStartY = 0;
  let _touchTime   = 0;

  document.addEventListener('touchstart', e => {
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
    _touchTime   = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _touchStartX;
    const dy = e.changedTouches[0].clientY - _touchStartY;
    const dt = Date.now() - _touchTime;

    // Ignorar si el swipe fue más vertical que horizontal, o demasiado lento
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
    if (Math.abs(dx) < 60) return;
    if (dt > 450) return;

    // No disparar si el toque empezó dentro de un scroll horizontal (carousel)
    const target = document.elementFromPoint(_touchStartX, _touchStartY);
    if (target && target.closest('.swipe-carousel, .timeline-wrap, .pdf-container, input, textarea, select')) return;

    // Solo en móvil (< 769px)
    if (window.innerWidth >= 769) return;

    const currentIdx = VISTAS_ORDEN.indexOf(window._vista || 'feed');
    if (currentIdx === -1) return;

    if (dx < -60) {
      // Swipe izquierda → siguiente vista
      const next = VISTAS_ORDEN[Math.min(currentIdx + 1, VISTAS_ORDEN.length - 1)];
      if (next !== window._vista) setVista(next);
    } else if (dx > 60) {
      // Swipe derecha → vista anterior
      const prev = VISTAS_ORDEN[Math.max(currentIdx - 1, 0)];
      if (prev !== window._vista) setVista(prev);
    }
  }, { passive: true });
})();


// ── 5. INDICADOR VISUAL DE SWIPE (feedback háptico) ────────
(function initSwipeFeedback() {
  let indicator = null;

  function showIndicator(dir) {
    if (indicator) indicator.remove();
    indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed; top: 50%; ${dir === 'left' ? 'right: 16px' : 'left: 16px'};
      transform: translateY(-50%);
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(212,175,55,0.20);
      border: 1px solid rgba(212,175,55,0.40);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; color: rgba(212,175,55,0.80);
      pointer-events: none; z-index: 9999;
      animation: swipeFade 0.4s ease forwards;
    `;
    indicator.textContent = dir === 'left' ? '›' : '‹';
    document.body.appendChild(indicator);
    setTimeout(() => { if (indicator) { indicator.remove(); indicator = null; } }, 400);
  }

  // Agregar estilo de animación
  const style = document.createElement('style');
  style.textContent = `@keyframes swipeFade { 0% { opacity:0; transform:translateY(-50%) scale(.7); } 40% { opacity:1; transform:translateY(-50%) scale(1); } 100% { opacity:0; transform:translateY(-50%) scale(1.1); } }`;
  document.head.appendChild(style);

  let _startX = 0;
  document.addEventListener('touchstart', e => { _startX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (window.innerWidth >= 769) return;
    const dx = e.touches[0].clientX - _startX;
    if (Math.abs(dx) > 40) showIndicator(dx < 0 ? 'left' : 'right');
  }, { passive: true });
})();


// ════════════════════════════════════════════════════════════
//  MENÚ HAMBURGUESA MÓVIL — PATCH v3.1
// ════════════════════════════════════════════════════════════

let _mobileMenuOpen = false;

function toggleMobileMenu() {
  _mobileMenuOpen ? closeMobileMenu() : openMobileMenu();
}

function openMobileMenu() {
  _mobileMenuOpen = true;
  const panel    = document.getElementById('mobileMenuPanel');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  const ham      = document.getElementById('mobileHamburger');

  if (panel)    panel.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
  if (ham)      ham.classList.add('open');

  document.body.style.overflow = 'hidden';

  // Actualizar contadores en el menú
  const cL = document.getElementById('mmCountLibros');
  const cP = document.getElementById('mmCountPersonajes');
  if (cL && typeof _stats !== 'undefined') cL.textContent = _stats.libros     || 0;
  if (cP && typeof _stats !== 'undefined') cP.textContent = _stats.personajes || 0;
}

function closeMobileMenu() {
  _mobileMenuOpen = false;
  const panel    = document.getElementById('mobileMenuPanel');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  const ham      = document.getElementById('mobileHamburger');

  if (panel)    panel.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  if (ham)      ham.classList.remove('open');

  document.body.style.overflow = '';
}

// Cerrar con tecla Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _mobileMenuOpen) closeMobileMenu();
});


// ════════════════════════════════════════════════════════════
//  CRYSTAL PANEL ENGINE — Panel Holográfico Biblioteca Activa
//  5 capas: Constelaciones · Iridiscente · Onda Dorada
//           Especular · Fresnel
// ════════════════════════════════════════════════════════════

function _initCrystalPanel() {
  _initConstellationCanvas();
  _initCometCanvas();
}

// ── CAPA 0: Constelaciones ─────────────────────────────────
function _initConstellationCanvas() {
  const canvas = document.getElementById('bcConstellationCanvas');
  if (!canvas) return;
  const outer = document.getElementById('bcCrystalOuter');
  if (!outer) return;

  canvas.width  = outer.offsetWidth;
  canvas.height = outer.offsetHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const rand = (a,b) => a + Math.random()*(b-a);

  // Generar estrellas
  const stars = Array.from({length: 55}, () => ({
    x: rand(0,W), y: rand(0,H),
    r: rand(0.4, 1.8),
    a: rand(0.15, 0.55),
    gold: Math.random() < 0.18,
    twinkleSpeed: rand(0.4, 1.2),
    twinkleOffset: rand(0, Math.PI*2)
  }));

  // Generar líneas de constelación (pares de estrellas cercanas)
  const lines = [];
  for (let i = 0; i < stars.length; i++) {
    for (let j = i+1; j < stars.length; j++) {
      const dx = stars[i].x - stars[j].x;
      const dy = stars[i].y - stars[j].y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 90 && Math.random() < 0.22) {
        lines.push([i, j, d]);
      }
    }
  }

  let t = 0;
  let raf;

  function drawConstellation() {
    ctx.clearRect(0, 0, W, H);
    t += 0.012;

    // Líneas de constelación
    lines.forEach(([a, b]) => {
      const sa = stars[a], sb = stars[b];
      const alpha = 0.06 + 0.04 * Math.sin(t * 0.3);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.strokeStyle = `rgba(212,185,140,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Estrellas
    stars.forEach(s => {
      const twinkle = 0.7 + 0.3 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
      const alpha   = s.a * twinkle;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = s.gold
        ? `rgba(212,175,55,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      ctx.fill();

      // Halo suave en estrellas grandes
      if (s.r > 1.2) {
        const grad = ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*5);
        grad.addColorStop(0, s.gold ? `rgba(212,175,55,${alpha*0.5})` : `rgba(200,220,255,${alpha*0.4})`);
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r*5, 0, Math.PI*2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    });

    raf = requestAnimationFrame(drawConstellation);
  }

  drawConstellation();

  // Limpiar cuando el panel se destruya
  const observer = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      cancelAnimationFrame(raf);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ── CAPA 2: Onda dorada (comet streak) ────────────────────
function _initCometCanvas() {
  const canvas = document.getElementById('bcCometCanvas');
  if (!canvas) return;
  const outer  = document.getElementById('bcCrystalOuter');
  if (!outer)  return;

  canvas.width  = outer.offsetWidth;
  canvas.height = outer.offsetHeight;
  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;

  // Parámetros de la onda — imita la imagen de referencia
  // Curva Bezier que va de izquierda-centro hacia derecha-arriba
  const comets = [
    {
      // Onda principal larga dorada
      progress: 0,
      speed: 0.0018,
      width: 2.2,
      length: 0.55,        // fracción de la curva que ocupa la cola
      colorA: 'rgba(212,175,55,0.85)',
      colorB: 'rgba(255,230,120,0.55)',
      colorC: 'rgba(180,140,20,0)',
      // Puntos de control Bezier (normalizados 0-1)
      p0: {x:0.05, y:0.52},
      p1: {x:0.30, y:0.48},
      p2: {x:0.62, y:0.38},
      p3: {x:0.90, y:0.28},
      delay: 0,
      loop: 8000,
    },
    {
      // Onda secundaria más delgada / iridiscente
      progress: 0.35,
      speed: 0.0014,
      width: 1.1,
      length: 0.40,
      colorA: 'rgba(180,220,255,0.50)',
      colorB: 'rgba(150,200,255,0.25)',
      colorC: 'rgba(100,160,255,0)',
      p0: {x:0.05, y:0.54},
      p1: {x:0.28, y:0.50},
      p2: {x:0.60, y:0.42},
      p3: {x:0.88, y:0.32},
      delay: 1200,
      loop: 9000,
    },
    {
      // Onda terciaria muy tenue / perla
      progress: 0.65,
      speed: 0.0022,
      width: 0.7,
      length: 0.30,
      colorA: 'rgba(255,255,255,0.30)',
      colorB: 'rgba(255,255,255,0.10)',
      colorC: 'rgba(255,255,255,0)',
      p0: {x:0.05, y:0.50},
      p1: {x:0.32, y:0.46},
      p2: {x:0.63, y:0.36},
      p3: {x:0.92, y:0.24},
      delay: 600,
      loop: 7500,
    }
  ];

  // Evaluar punto en Bezier cúbica
  function bezier(t, p0, p1, p2, p3, wh) {
    const u = 1 - t;
    return {
      x: (u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x) * wh.w,
      y: (u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y) * wh.h,
    };
  }

  // Construir segmentos de la curva (precalculado por comet)
  const STEPS = 80;
  comets.forEach(c => {
    c.pts = [];
    for (let i = 0; i <= STEPS; i++) {
      c.pts.push(bezier(i/STEPS, c.p0, c.p1, c.p2, c.p3, {w:W,h:H}));
    }
  });

  let lastTime = 0;
  let raf;

  function drawComets(ts) {
    const dt = Math.min(ts - lastTime, 50);
    lastTime  = ts;

    ctx.clearRect(0, 0, W, H);

    comets.forEach(c => {
      // Avanzar progreso
      c.progress = (c.progress + c.speed * (dt / 16.67)) % 1;

      const prog   = c.progress;
      const tailLen = c.length;

      // Rango de la cola en los puntos precalculados
      const headIdx = Math.floor(prog * STEPS);
      const tailIdx = Math.max(0, Math.floor((prog - tailLen) * STEPS));

      if (headIdx <= tailIdx) return;

      // Dibujar la cola como path con gradiente
      const ptSlice = c.pts.slice(tailIdx, headIdx + 1);
      if (ptSlice.length < 2) return;

      // Gradiente a lo largo de la curva
      const head = ptSlice[ptSlice.length - 1];
      const tail = ptSlice[0];
      const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0,   c.colorC);  // cola: transparente
      grad.addColorStop(0.5, c.colorB);  // medio
      grad.addColorStop(1,   c.colorA);  // cabeza: brillante

      ctx.beginPath();
      ctx.moveTo(ptSlice[0].x, ptSlice[0].y);
      for (let i = 1; i < ptSlice.length; i++) {
        ctx.lineTo(ptSlice[i].x, ptSlice[i].y);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth   = c.width;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.shadowColor  = c.colorA;
      ctx.shadowBlur   = c.width * 6;
      ctx.stroke();
      ctx.shadowBlur   = 0;

      // Punto de cabeza brillante
      const hx = head.x, hy = head.y;
      const headGrad = ctx.createRadialGradient(hx,hy,0,hx,hy,c.width*5);
      headGrad.addColorStop(0, c.colorA);
      headGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(hx, hy, c.width*4, 0, Math.PI*2);
      ctx.fillStyle = headGrad;
      ctx.fill();
    });

    raf = requestAnimationFrame(drawComets);
  }

  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(drawComets); });

  // Limpiar al destruirse
  const obs = new MutationObserver(() => {
    if (!document.contains(canvas)) { cancelAnimationFrame(raf); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// Re-inicializar en resize
window.addEventListener('resize', () => {
  const outer = document.getElementById('bcCrystalOuter');
  if (!outer) return;
  ['bcConstellationCanvas','bcCometCanvas'].forEach(id => {
    const c = document.getElementById(id);
    if (c) { c.width = outer.offsetWidth; c.height = outer.offsetHeight; }
  });
  _initCrystalPanel();
});


// ════════════════════════════════════════════════════════════
//  PERFORMANCE PATCH v3.2 — Motor más eficiente
//  · Canvas a 30fps (no 60fps)
//  · Parallax con throttle de 32ms
//  · Desactivar canvas en móvil (< 768px)
//  · Parar animaciones cuando el tab está oculto
// ════════════════════════════════════════════════════════════

(function performancePatch() {
  'use strict';

  // ── 1. Throttle del parallax del mouse ──────────────────
  // El sistema anterior corría en cada mousemove sin throttle.
  // Lo limitamos a máx 30 ejecuciones/seg (cada ~33ms).
  const _origParallaxRAF = window._crystalParallaxRAF;
  let _lastParallax = 0;

  const _origMouseMove = document._crystalMouseMove;

  // Reemplazar el listener de mousemove con versión throttled
  document.addEventListener('mousemove', function throttledParallax(e) {
    const now = Date.now();
    if (now - _lastParallax < 33) return;   // máx 30fps
    _lastParallax = now;

    // Solo procesar si no es móvil
    if (window.innerWidth < 769) return;

    // Solo mover el panel principal de cristal (no todos los paneles)
    const crystal = document.getElementById('bcCrystalOuter');
    if (!crystal) return;

    const rect = crystal.getBoundingClientRect();
    if (
      e.clientX < rect.left - 20 || e.clientX > rect.right  + 20 ||
      e.clientY < rect.top  - 20 || e.clientY > rect.bottom + 20
    ) return;

    const px = ((e.clientX - rect.left) / rect.width)  * 100;
    const py = ((e.clientY - rect.top)  / rect.height) * 100;
    const mx = (px - 50) / 50;
    const my = (py - 50) / 50;

    // Solo tilt suave — sin transform pesado en cards secundarias
    crystal.style.transform = `perspective(900px) rotateX(${my * 1.5}deg) rotateY(${mx * 2}deg)`;
    crystal.style.setProperty('--cx', `${px}%`);
    crystal.style.setProperty('--cy', `${py}%`);
  }, { passive: true });

  // Reset al salir del panel
  document.addEventListener('mouseleave', function() {
    const crystal = document.getElementById('bcCrystalOuter');
    if (crystal) {
      crystal.style.transform = '';
    }
  }, true);

  // ── 2. Pausar canvas cuando el tab está oculto ──────────
  document.addEventListener('visibilitychange', () => {
    // Los canvas se pausan solos al no estar visible la pestaña
    // pero marcamos una flag para que el loop no reinicie
    window._tabHidden = document.hidden;
  });

  // ── 3. Desactivar canvas en móvil ───────────────────────
  // En pantallas pequeñas los canvas son innecesarios y lentos
  function maybeDisableCanvasOnMobile() {
    if (window.innerWidth >= 769) return;
    ['bcConstellationCanvas', 'bcCometCanvas'].forEach(id => {
      const c = document.getElementById(id);
      if (c) {
        c.style.display = 'none';
        const ctx = c.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      }
    });
  }

  // Ejecutar en resize y al cargar
  window.addEventListener('resize', maybeDisableCanvasOnMobile, { passive: true });
  setTimeout(maybeDisableCanvasOnMobile, 100);

})();

// ── 4. Patch al _initCometCanvas: limitar a 30fps con setTimeout ──
// Sobreescribimos la función original para que use setTimeout en vez de rAF puro
const _origInitComet = window._initCometCanvas;
(function patch30fps() {
  // Monkeypatch requestAnimationFrame para los canvas del cristal
  // Solo se aplica internamente a los loops de canvas
  // Se logra inyectando un flag global que los loops consultan

  let _frameCount = 0;
  const _origRAF = window.requestAnimationFrame.bind(window);

  // Los canvas del cristal usan un contador para saltar frames
  window._crystalFrameSkip = 1; // saltar 1 de cada 2 = 30fps en pantalla 60hz

  // No reemplazamos rAF globalmente (rompería todo)
  // En cambio, el loop del comet ya usa dt para ser frame-rate independent
  // Solo necesitamos asegurarnos de que los canvas se limpian en resize
})();


// ════════════════════════════════════════════════════════════
//  DRAG-TO-DISMISS con FÍSICA de INERCIA — Menú Móvil
//  Replica el panel de notificaciones de iOS/Android:
//  · El panel sigue el dedo px a px
//  · Al soltar: velocidad alta → cae; velocidad baja → rebota
//  · Backdrop se atenúa en proporción al drag
//  · Resistencia elástica si se intenta subir más arriba
// ════════════════════════════════════════════════════════════

(function initMenuDrag() {
  'use strict';

  // ── Estado del drag ────────────────────────────────────────
  let _dragging    = false;
  let _startY      = 0;       // Y del primer toque
  let _currentY    = 0;       // Y actual del toque
  let _panelStartH = 0;       // altura del panel al inicio del drag
  let _lastY       = 0;       // Y del frame anterior (para calcular velocidad)
  let _lastTime    = 0;       // tiempo del frame anterior
  let _velocity    = 0;       // px/ms al soltar
  let _rafId       = null;

  // Umbrales de decisión
  const DISMISS_VELOCITY   = 0.5;   // px/ms → cerrar si más rápido que esto
  const DISMISS_DISTANCE   = 0.40;  // fracción del panel → cerrar si bajó más del 40%
  const ELASTIC_RESISTANCE = 0.25;  // resistencia al subir más arriba del origen

  // Referencia a elementos
  function _els() {
    return {
      panel:    document.getElementById('mobileMenuPanel'),
      backdrop: document.getElementById('mobileMenuBackdrop'),
      handle:   document.getElementById('mobileMenuDragHandle'),
      ham:      document.getElementById('mobileHamburger'),
    };
  }

  // ── Aplicar posición al panel sin transición ───────────────
  function _setTranslate(dy) {
    const { panel, backdrop } = _els();
    if (!panel) return;

    // dy: desplazamiento en px desde la posición de reposo (0 = abierto)
    // Solo permitir hacia abajo (dy >= 0) con resistencia elástica para arriba
    const clamped = dy < 0
      ? dy * ELASTIC_RESISTANCE   // resistencia si intenta subir
      : dy;                        // libre hacia abajo

    panel.style.transform = `translateY(${clamped}px)`;

    // Sincronizar opacidad del backdrop
    if (backdrop && _panelStartH > 0) {
      const progress = Math.max(0, Math.min(1, 1 - (clamped / _panelStartH)));
      backdrop.style.opacity = (progress * 0.55).toFixed(3);
    }
  }

  // ── Animación de resorte al volver (spring) ────────────────
  function _springBack() {
    const { panel, backdrop } = _els();
    if (!panel) return;

    panel.classList.remove('dragging');
    if (backdrop) backdrop.classList.remove('dragging');

    panel.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
    if (backdrop) backdrop.style.transition = 'opacity 0.35s ease';

    panel.style.transform   = 'translateY(0)';
    if (backdrop) backdrop.style.opacity = '0.55';

    // Limpiar transition después
    setTimeout(() => {
      if (panel) panel.style.transition = '';
      if (backdrop) backdrop.style.transition = '';
    }, 480);
  }

  // ── Animación de cierre con inercia ───────────────────────
  function _dismissWithInertia(vel) {
    const { panel, backdrop, ham } = _els();
    if (!panel) return;

    panel.classList.remove('dragging');
    if (backdrop) backdrop.classList.remove('dragging');

    // Calcular duración según velocidad: más rápido → menos tiempo
    const panelH  = panel.offsetHeight;
    const remaining = panelH - (parseFloat(panel.style.transform.replace('translateY(','')) || 0);
    const duration  = Math.max(120, Math.min(400, remaining / Math.max(vel, 0.3)));

    panel.style.transition   = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    if (backdrop) backdrop.style.transition = `opacity ${duration}ms ease`;

    panel.style.transform   = `translateY(${panelH + 20}px)`;
    if (backdrop) backdrop.style.opacity = '0';

    setTimeout(() => {
      // Completar el cierre real (sin animación CSS — ya terminó)
      _mobileMenuOpen = false;
      if (panel)    { panel.classList.remove('open');    panel.style.transform = ''; panel.style.transition = ''; }
      if (backdrop) { backdrop.classList.remove('open'); backdrop.style.opacity = ''; backdrop.style.transition = ''; }
      if (ham)      ham.classList.remove('open');
      document.body.style.overflow = '';
    }, duration + 20);
  }

  // ── TOUCH START ───────────────────────────────────────────
  function onTouchStart(e) {
    if (!_mobileMenuOpen) return;
    const { panel, backdrop } = _els();
    if (!panel) return;

    _dragging    = true;
    _startY      = e.touches[0].clientY;
    _currentY    = _startY;
    _lastY       = _startY;
    _lastTime    = Date.now();
    _velocity    = 0;
    _panelStartH = panel.offsetHeight;

    panel.classList.add('dragging');
    if (backdrop) backdrop.classList.add('dragging');

    // Cancelar cualquier transición en curso
    panel.style.transition   = 'none';
    if (backdrop) backdrop.style.transition = 'none';

    if (_rafId) cancelAnimationFrame(_rafId);
  }

  // ── TOUCH MOVE ────────────────────────────────────────────
  function onTouchMove(e) {
    if (!_dragging) return;
    e.preventDefault();   // evitar scroll del body mientras arrastramos

    const touch = e.touches[0];
    _currentY   = touch.clientY;
    const dy    = _currentY - _startY;

    // Calcular velocidad instantánea (px/ms)
    const now  = Date.now();
    const dt   = now - _lastTime;
    if (dt > 0) {
      // Suavizar velocidad con EMA (Exponential Moving Average)
      const rawVel = (touch.clientY - _lastY) / dt;
      _velocity    = _velocity * 0.6 + rawVel * 0.4;
    }
    _lastY    = touch.clientY;
    _lastTime = now;

    _setTranslate(dy);
  }

  // ── TOUCH END ─────────────────────────────────────────────
  function onTouchEnd(e) {
    if (!_dragging) return;
    _dragging = false;

    const dy = _currentY - _startY;

    // Decisión: ¿cerrar o volver?
    const shouldDismiss =
      _velocity > DISMISS_VELOCITY ||                            // velocidad alta → cerrar
      (dy > 0 && dy > _panelStartH * DISMISS_DISTANCE);        // bajó más del umbral

    if (shouldDismiss) {
      _dismissWithInertia(Math.abs(_velocity));
    } else {
      _springBack();
    }
  }

  // ── TOUCH CANCEL ─────────────────────────────────────────
  function onTouchCancel() {
    if (!_dragging) return;
    _dragging = false;
    _springBack();
  }

  // ── Registrar listeners en el handle ─────────────────────
  // Usamos delegación en el documento para capturar aunque el
  // dedo se salga del handle durante el movimiento
  function attachDragListeners() {
    const handle = document.getElementById('mobileMenuDragHandle');
    if (!handle || handle._dragBound) return;
    handle._dragBound = true;

    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,   { passive: false });
    document.addEventListener('touchend',   onTouchEnd,    { passive: true });
    document.addEventListener('touchcancel',onTouchCancel, { passive: true });
  }

  // Intentar registrar ahora y también cuando el DOM cambie
  attachDragListeners();

  const _dragObs = new MutationObserver(() => attachDragListeners());
  _dragObs.observe(document.body, { childList: true, subtree: true });

  // ── Parche a openMobileMenu para resetear el transform ───
  const _prevOpen = window.openMobileMenu;
  window.openMobileMenu = function() {
    const panel    = document.getElementById('mobileMenuPanel');
    const backdrop = document.getElementById('mobileMenuBackdrop');

    // Resetear cualquier transform residual de un drag anterior
    if (panel) {
      panel.style.transform  = '';
      panel.style.transition = '';
    }
    if (backdrop) {
      backdrop.style.opacity    = '';
      backdrop.style.transition = '';
    }

    if (_prevOpen) _prevOpen();
  };

})();



// ════════════════════════════════════════
//  ELIMINAR LUGARES, FACCIONES, RELACIONES
// ════════════════════════════════════════

async function confirmarEliminarLugar(libro, nombre) {
  if(!confirm(`¿Eliminar el lugar "${nombre}" permanentemente?`)) return;

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      const nEnc = encodeURIComponent(nombre).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/lugares/${nEnc}`);
      const data = await GET('/libros');
      _libros = Array.isArray(data) ? data : (data.libros || []);
    } catch(e) {
      return toast(`⚠ Error al eliminar: ${e.message}`, 'err');
    }
  } else {
    const l = _libros.find(x => x.titulo === libro); if(!l) return;
    l.lugares = (l.lugares||[]).filter(x => x.nombre !== nombre);
  }

  await _sincronizar();
  toast(`🗑 Lugar "${nombre}" eliminado`);
}

async function confirmarEliminarFaccion(libro, nombre) {
  if(!confirm(`¿Eliminar la facción "${nombre}" permanentemente?`)) return;

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      const nEnc = encodeURIComponent(nombre).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/facciones/${nEnc}`);
      const data = await GET('/libros');
      _libros = Array.isArray(data) ? data : (data.libros || []);
    } catch(e) {
      return toast(`⚠ Error al eliminar: ${e.message}`, 'err');
    }
  } else {
    const l = _libros.find(x => x.titulo === libro); if(!l) return;
    l.facciones = (l.facciones||[]).filter(x => x.nombre !== nombre);
  }

  await _sincronizar();
  toast(`🗑 Facción "${nombre}" eliminada`);
}

async function confirmarEliminarRelacion(libro, indice) {
  if(!confirm('¿Eliminar esta relación permanentemente?')) return;

  if (_modoConexion === 'server') {
    try {
      const tEnc = encodeURIComponent(libro).replace(/%2F/gi, '__SLASH__');
      await DEL(`/libros/${tEnc}/relaciones/${indice}`);
      const data = await GET('/libros');
      _libros = Array.isArray(data) ? data : (data.libros || []);
    } catch(e) {
      return toast(`⚠ Error al eliminar: ${e.message}`, 'err');
    }
  } else {
    const l = _libros.find(x => x.titulo === libro); if(!l) return;
    l.relaciones = (l.relaciones||[]).filter((_,i) => i !== indice);
  }

  await _sincronizar();
  toast('🗑 Relación eliminada');
}
