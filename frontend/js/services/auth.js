// ════════════════════════════════════════
//  USUARIO LOCAL — sin login requerido
// ════════════════════════════════════════
// ── Cliente Supabase (frontend) ───────────────────────────
const SUPABASE_URL  = 'https://ifbyzcxnvvqsqctvyzzq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYnl6Y3hudnZxc3FjdHZ5enpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzc3NDYsImV4cCI6MjA5Mzc1Mzc0Nn0.HQY8z5aoEteWql7ycTo3Pt7RdZjvGC6svxXUsYj386E';
let _sb = null;
// Inicializar Supabase cuando el DOM esté listo
function _initSupabase() {
  if(window.supabase && window.supabase.createClient) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('✓ Supabase cliente inicializado');
  } else {
    console.warn('⚠ Supabase SDK no disponible aún, reintentando...');
    setTimeout(_initSupabase, 200);
  }
}
document.addEventListener('DOMContentLoaded', _initSupabase);
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
