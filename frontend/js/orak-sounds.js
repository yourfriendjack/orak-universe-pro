/**
 * orak-sounds.js — Motor de sonido sintetizado por tema
 * Web Audio API puro, sin archivos externos.
 * Cada tema tiene una "voz" propia (frecuencia base, onda, caída).
 */

const PALETTES = {
  'theme-aurora':       { freq: 880,  type: 'sine',     decay: 0.55, gain: 0.10 },
  'theme-cosmos':       { freq: 220,  type: 'sine',     decay: 0.90, gain: 0.09 },
  'theme-lunar':        { freq: 1320, type: 'triangle', decay: 0.60, gain: 0.09 },
  'theme-sangre':       { freq: 110,  type: 'sawtooth', decay: 0.30, gain: 0.08 },
  'theme-rubi':         { freq: 1760, type: 'sine',     decay: 0.22, gain: 0.10 },
  'theme-esmeralda':    { freq: 660,  type: 'triangle', decay: 0.50, gain: 0.09 },
  'theme-eldergloom':   { freq: 165,  type: 'sine',     decay: 0.75, gain: 0.08 },
  'theme-dark-fantasy': { freq: 110,  type: 'sawtooth', decay: 0.55, gain: 0.08 },
  'theme-glitch':       { freq: 440,  type: 'square',   decay: 0.07, gain: 0.07 },
  'theme-weirdcore':    { freq: 523,  type: 'sine',     decay: 0.40, gain: 0.08 },
  'theme-vaporwave':    { freq: 880,  type: 'triangle', decay: 0.65, gain: 0.09 },
  'theme-cloudcore':    { freq: 1100, type: 'sine',     decay: 0.70, gain: 0.07 },
};

const DEFAULT_PALETTE = { freq: 660, type: 'sine', decay: 0.40, gain: 0.09 };

let _ctx = null;
let _muted = localStorage.getItem('orak_muted') === '1';
let _gestured = false;

// Chrome bloquea AudioContext hasta el primer gesto del usuario.
// Pre-calentamos el contexto en el primer gesto para que resume() ya esté listo.
function _warmUp() {
  _gestured = true;
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
}
['click', 'keydown', 'touchstart'].forEach(evt =>
  document.addEventListener(evt, _warmUp, { once: true, passive: true })
);

function _getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function _getPalette() {
  const cls = document.documentElement.className;
  for (const key of Object.keys(PALETTES)) {
    if (cls.includes(key)) return PALETTES[key];
  }
  return DEFAULT_PALETTE;
}

function _tone(freq, type, gain, startTime, duration, freqEnd) {
  const ctx = _getCtx();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(gain, startTime + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function _sequence(notes, p) {
  const ctx = _getCtx();
  const now = ctx.currentTime + 0.02;
  notes.forEach(([freqMult, delay]) => {
    _tone(p.freq * freqMult, p.type, p.gain, now + delay, p.decay * 0.6);
  });
}

export function playSound(event) {
  if (_muted || !_gestured) return;
  try {
    const p = _getPalette();
    const ctx = _getCtx();
    const now = ctx.currentTime + 0.02;

    switch (event) {
      case 'ui':
        _tone(p.freq * 1.0, p.type, p.gain * 0.5, now, p.decay * 0.35);
        break;

      case 'send':
        _tone(p.freq * 1.0, p.type, p.gain * 0.8, now, p.decay * 0.4);
        _tone(p.freq * 1.5, p.type, p.gain * 0.6, now + 0.07, p.decay * 0.35);
        break;

      case 'notif':
        _sequence([[1.0, 0], [1.25, 0.10], [1.5, 0.20]], p);
        break;

      case 'glimmer':
        _sequence([[1.0, 0], [1.5, 0.08], [2.0, 0.16], [2.5, 0.24]], p);
        break;

      case 'success':
        _tone(p.freq * 1.0, p.type, p.gain * 0.9, now, p.decay * 0.5);
        _tone(p.freq * 1.5, p.type, p.gain * 0.7, now + 0.12, p.decay * 0.4);
        break;

      case 'error':
        _tone(p.freq * 0.75, 'sawtooth', p.gain * 0.8, now, p.decay * 0.3);
        _tone(p.freq * 0.5,  'sawtooth', p.gain * 0.6, now + 0.10, p.decay * 0.35);
        break;

      case 'message':
        _tone(p.freq * 1.25, p.type, p.gain * 0.8, now, p.decay * 0.4);
        break;
    }
  } catch { /* silencioso si el browser bloquea */ }
}

export function toggleMute() {
  _muted = !_muted;
  localStorage.setItem('orak_muted', _muted ? '1' : '0');
  _updateMuteBtn();
  return _muted;
}

export function isMuted() { return _muted; }

function _updateMuteBtn() {
  const btn = document.getElementById('sound-toggle');
  if (btn) btn.textContent = _muted ? '🔇' : '🔊';
}

document.addEventListener('DOMContentLoaded', _updateMuteBtn);
