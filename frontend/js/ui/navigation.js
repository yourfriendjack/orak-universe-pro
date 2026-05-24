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

