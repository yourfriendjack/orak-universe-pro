// ════════════════════════════════════════════════════════════════
//  frontend/js/services/auth.js
//  Auth real con Supabase — login, registro, sesión persistente
// ════════════════════════════════════════════════════════════════

import { apiPost, apiGet, apiPatch } from './api.js';

// ── Estado de sesión ─────────────────────────────────────────────
let _sesion = null;   // { access_token, perfil }

const STORAGE_KEY = 'orak_sesion';

// ── Inicializar (llamar al cargar la app) ─────────────────────────
export async function initAuth() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      _sesion = JSON.parse(raw);
      // Verificar que el token sigue activo
      const perfil = await apiGet('/api/auth/me', _sesion.access_token);
      _sesion.perfil = perfil;
      _guardarSesion();
      _actualizarUI();
      return _sesion;
    } catch {
      _limpiarSesion();
    }
  }
  return null;
}

// ── Registro ─────────────────────────────────────────────────────
export async function registro({ email, password, username, display_name, generos = [] }) {
  const res = await apiPost('/api/auth/registro', {
    email, password, username, display_name, generos
  });
  return res;
}

// ── Login ────────────────────────────────────────────────────────
export async function login(email, password) {
  const res = await apiPost('/api/auth/login', { email, password });
  _sesion = { access_token: res.access_token, perfil: res.perfil };
  _guardarSesion();
  _actualizarUI();
  return _sesion;
}

// ── Logout ───────────────────────────────────────────────────────
export async function logout() {
  try {
    await apiPost('/api/auth/logout', {}, getToken());
  } catch { /* continuar aunque falle */ }
  _limpiarSesion();
  window.location.href = "/";
}

// ── Actualizar perfil ────────────────────────────────────────────
export async function actualizarPerfil(cambios) {
  const res = await apiPatch('/api/auth/me', cambios, getToken());
  if (_sesion) {
    _sesion.perfil = { ..._sesion.perfil, ...cambios };
    _guardarSesion();
    _actualizarUI();
  }
  return res;
}

// ── Getters ──────────────────────────────────────────────────────
export const getToken    = ()  => _sesion?.access_token || null;
export const getPerfil   = ()  => _sesion?.perfil || null;
export const estaLogueado = () => !!_sesion?.access_token;
export const getOruns    = ()  => _sesion?.perfil?.oruns || 0;
export const getGlimmers = ()  => _sesion?.perfil?.glimmers_week || 0;

// ── Actualizar balance local (sin re-fetch) ──────────────────────
export function actualizarOruns(delta) {
  if (_sesion?.perfil) {
    _sesion.perfil.oruns = (_sesion.perfil.oruns || 0) + delta;
    _guardarSesion();
    _actualizarUI();
  }
}
export function actualizarGlimmers(delta) {
  if (_sesion?.perfil) {
    _sesion.perfil.glimmers_week = Math.max(0, (_sesion.perfil.glimmers_week || 0) + delta);
    _guardarSesion();
    _actualizarUI();
  }
}

// ── UI ───────────────────────────────────────────────────────────
function _actualizarUI() {
  if (!_sesion?.perfil) return;
  const { oruns, glimmers_week, display_name, username } = _sesion.perfil;
  _set('orunsVal',    oruns);
  _set('glimmersVal', glimmers_week);
  _set('pmOruns',     oruns);
  _set('rpOruns',     oruns);
  _set('rpGlimmers',  glimmers_week);
  _set('orun-display',   oruns?.toLocaleString());
  _set('glimmer-display', glimmers_week);
  _set('ec-oruns',    oruns?.toLocaleString());
  _set('ec-glimmers', `${glimmers_week}/10`);
  _set('topbar-av',   (display_name || username || 'U').slice(0,2).toUpperCase());
  _set('prof-name',   display_name || username);
  _set('prof-handle', `@${username}`);
  _set('ec-name',     display_name || username);
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}

function _guardarSesion() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_sesion));
}
function _limpiarSesion() {
  _sesion = null;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Economía legacy (compatibilidad con engine.js) ───────────────
export async function gastarOruns(cant, concepto) {
  if (getOruns() < cant) {
    toast?.(`Oruns insuficientes (tienes ${getOruns()})`, 'err');
    return null;
  }
  actualizarOruns(-cant);
  return getOruns();
}
export async function ganarOruns(cant, concepto) {
  actualizarOruns(cant);
  return getOruns();
}
export function ganarGlimmers(cant) {
  actualizarGlimmers(-cant);
}
