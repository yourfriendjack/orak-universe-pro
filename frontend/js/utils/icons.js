// ════════════════════════════════════════════════════════════
//  frontend/js/utils/icons.js
//  Sistema de iconos SVG de ORAK
// ════════════════════════════════════════════════════════════
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

