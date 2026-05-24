let _libros    = [];
let _stats     = {};
let _timeline  = [];
let _vista     = 'feed';
let _libroSel  = null;
let _ws        = null;

const API_SERVER = 'https://hazing-diffusive-affidavit.ngrok-free.dev';
let _modoConexion = 'detectando';

async function detectarServidor() {
  try {
    const _tout = new Promise((_,r) => setTimeout(() => r(new Error('t')), 5000));
    const r = await Promise.race([fetch(API_SERVER + '/info'), _tout]);
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
      _libros = data.libros || [];
      // Reemplazar cache local completamente con la verdad del servidor
      _guardarLocal(_libros);
    } catch(e) {
      console.warn('Servidor disponible pero falló GET /libros:', e);
      // Solo en este caso de error de red usar el cache
      _libros = _cargarLocal();
      toast('⚠ Error cargando datos del servidor', 'err');
    }
  } else {
    // 2. Sin servidor: reintentar una vez silenciosamente (Railway puede estar despertando)
    await new Promise(r => setTimeout(r, 3000));
    const reintento = await detectarServidor();
    if (reintento) {
      actualizarBadgeModo(true);
      try {
        const data = await GET('/libros');
        _libros = data.libros || [];
        _guardarLocal(_libros);
      } catch(e) {
        _libros = _cargarLocal();
      }
    } else {
      // Realmente sin conexión después de 2 intentos
      _libros = _cargarLocal();
      if (_libros.length === 0 && typeof _UNIVERSO_EMBEBIDO !== 'undefined') {
        _libros = [..._UNIVERSO_EMBEBIDO];
        _guardarLocal(_libros);
      }
      // Toast discreto solo si realmente no hay servidor
      setTimeout(() => toast('● Sin conexión al servidor — modo local', 'err'), 1000);
    }
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
      _libros = data.libros || [];
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

