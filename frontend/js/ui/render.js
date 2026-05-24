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

