// ════════════════════════════════════════════════════════════
//  frontend/js/api/websocket.js
//  Cliente WebSocket — reconexión automática
// ════════════════════════════════════════════════════════════

let _ws = null;
let _wsReconectando = false;
const _wsHandlers = {};

function onWSMessage(tipo, handler) {
  _wsHandlers[tipo] = handler;
}

function conectarWS() {
  if (_ws && _ws.readyState === WebSocket.OPEN) return;
  const url = WS_BASE + '/ws';  // WS_BASE viene de config.js

  _ws = new WebSocket(url);

  _ws.onopen = () => {
    console.log('🔌 WS conectado');
    _wsReconectando = false;
  };

  _ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      const handler = _wsHandlers[msg.tipo];
      if (handler) handler(msg);
    } catch (err) {
      console.warn('WS mensaje inválido', err);
    }
  };

  _ws.onclose = () => {
    if (!_wsReconectando) {
      _wsReconectando = true;
      console.log('🔌 WS desconectado — reconectando en 3s…');
      setTimeout(conectarWS, 3000);
    }
  };

  _ws.onerror = (e) => console.warn('WS error', e);
}

function desconectarWS() {
  if (_ws) {
    _wsReconectando = false;  // evitar reconexión
    _ws.close();
    _ws = null;
  }
}
