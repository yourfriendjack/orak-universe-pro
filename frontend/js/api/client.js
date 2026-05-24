// ════════════════════════════════════════════════════════════
//  frontend/js/api/client.js
//  Cliente HTTP centralizado — reemplaza las funciones api()
//  dispersas en engine.js con hardcode de ngrok
// ════════════════════════════════════════════════════════════

// Depende de config.js (API_BASE)

let _modoConexion = 'detectando';

async function detectarServidor() {
  try {
    const _tout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000));
    const r = await Promise.race([fetch(API_BASE + '/info'), _tout]);
    if (r.ok) {
      _modoConexion = API_BASE === window.location.origin ? 'mismo-origen' : 'server';
      return true;
    }
  } catch (_) {}
  _modoConexion = 'local';
  return false;
}

async function api(metodo, path, datos) {
  const base = _modoConexion === 'local' ? '' : API_BASE;
  const opts = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
  };
  if (datos !== undefined) opts.body = JSON.stringify(datos);
  const r = await fetch(base + path, opts);
  if (!r.ok) {
    const err = await r.json().catch(() => ({ mensaje: r.statusText }));
    throw new Error(err?.detail?.mensaje || err?.mensaje || r.statusText);
  }
  return r.json();
}

// Shorthand helpers
const GET  = path      => api('GET',    path);
const POST = (path, d) => api('POST',   path, d);
const PATCH= (path, d) => api('PATCH',  path, d);
const DEL  = path      => api('DELETE', path);

function getModoConexion() { return _modoConexion; }

function actualizarBadgeModo(servidorOk) {
  const el = document.getElementById('modoBadge');
  if (!el) return;
  el.textContent = servidorOk ? '🟢 Online' : '🟡 Local';
  el.title = servidorOk ? `Conectado a ${API_BASE}` : 'Modo offline — datos locales';
}
