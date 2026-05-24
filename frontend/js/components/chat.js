//  CHAT
// ════════════════════════════════════════
let _chatUsuario  = localStorage.getItem('orak_usuario') || '';
let _chatMensajes = [];

async function cargarChat() {
  try {
    const filtro = _libroSel ? `?libro=${enc(_libroSel)}` : '';
    const r = await GET(`/chat${filtro}`); _chatMensajes = r.mensajes || [];
  } catch(e) {}
}

function renderChat() {
  if(!_chatUsuario) {
    return `<div class="feed-header"><div class="feed-title">💬 Chat</div></div>
    <div style="max-width:360px;margin:40px auto;text-align:center">
      <div style="font-size:32px;margin-bottom:12px">💬</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:8px">¿Cómo te llamas?</div>
      <input class="form-input" id="chatNombreInput" placeholder="Tu nombre en el universo…" style="margin-bottom:10px">
      <button class="btn btn-primary" style="width:100%" onclick="establecerNombreChat()">Entrar al chat</button>
    </div>`;
  }
  const msgs = _chatMensajes.map(m => `
    <div style="display:flex;gap:10px;margin-bottom:14px;align-items:flex-start">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--gold-bg);color:var(--gold);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:13px">${esc(m.usuario[0]||'?').toUpperCase()}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
          <span style="font-weight:700;font-size:13px">${esc(m.usuario)}</span>
          <span style="font-size:11px;color:var(--text3)">${esc(m.ts||'')}</span>
          ${m.libro?`<span class="tag tag-gray" style="font-size:10px">${esc(m.libro)}</span>`:''}
        </div>
        <div style="font-size:13px;line-height:1.5">${esc(m.mensaje)}</div>
      </div>
    </div>`).join('') || `<div style="color:var(--text3);font-size:13px;text-align:center;padding:20px">Sin mensajes todavía. ¡Sé el primero!</div>`;
  return `
    <div class="feed-header">
      <div><div class="feed-title">💬 Chat del universo</div>
      <div class="feed-sub">Hablando como <strong>${esc(_chatUsuario)}</strong>
        <button onclick="cambiarNombreChat()" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:11px;margin-left:6px">cambiar</button>
      </div></div>
    </div>
    <div id="chatMsgs" style="margin-bottom:16px;max-height:480px;overflow-y:auto">${msgs}</div>
    <div style="display:flex;gap:8px;position:sticky;bottom:0;background:var(--bg2);padding:8px 0">
      <input class="form-input" id="chatInput" placeholder="Escribe un mensaje…" onkeydown="if(event.key==='Enter')enviarChat()" style="flex:1">
      <button class="btn btn-primary" onclick="enviarChat()">Enviar</button>
    </div>`;
}

async function renderChatVista() {
  await cargarChat();
  document.getElementById('mainContent').innerHTML = renderChat();
  setTimeout(() => { const el=document.getElementById('chatMsgs'); if(el) el.scrollTop=el.scrollHeight; }, 50);
}

function establecerNombreChat() {
  const n = document.getElementById('chatNombreInput')?.value.trim(); if(!n) return;
  _chatUsuario = n; localStorage.setItem('orak_usuario', n); renderVista();
}
function cambiarNombreChat() { _chatUsuario = ''; localStorage.removeItem('orak_usuario'); renderVista(); }

async function enviarChat() {
  const input = document.getElementById('chatInput'); const msg = input?.value.trim(); if(!msg) return;
  try {
    await POST('/chat', { usuario: _chatUsuario, mensaje: msg, libro: _libroSel||'' });
    input.value = ''; await cargarChat(); renderVista();
    setTimeout(() => { const el=document.getElementById('chatMsgs'); if(el) el.scrollTop=el.scrollHeight; }, 50);
  } catch(e) { toast(e.message, 'err'); }
}

