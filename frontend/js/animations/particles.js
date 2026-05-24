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
