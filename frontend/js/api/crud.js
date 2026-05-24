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
