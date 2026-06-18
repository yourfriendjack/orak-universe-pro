// ════════════════════════════════════════════════════════════════
//  frontend/js/services/api.js
//  Cliente HTTP centralizado — todas las llamadas al backend
// ════════════════════════════════════════════════════════════════

const BASE = window.ORAK_CONFIG?.apiServer || '';

async function _fetch(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ ok: false, mensaje: 'Respuesta inválida' }));

  if (!res.ok) {
    throw new Error(data.detail || data.mensaje || `Error ${res.status}`);
  }
  return data;
}

export const apiGet    = (path, token)        => _fetch('GET',    path, null,  token);
export const apiPost   = (path, body, token)  => _fetch('POST',   path, body,  token);
export const apiPatch  = (path, body, token)  => _fetch('PATCH',  path, body,  token);
export const apiDelete = (path, token)        => _fetch('DELETE',  path, null, token);
export const apiPut    = (path, body, token)  => _fetch('PUT',    path, body,  token);

// ── Social helpers ───────────────────────────────────────────────

export const getFeed        = (token, pagina=1) => apiGet(`/api/social/feed?pagina=${pagina}`, token);
export const getExplorar    = (genero, pagina=1) => apiGet(`/api/social/feed/explorar?${genero?`genero=${genero}&`:''}pagina=${pagina}`);
export const crearPost      = (datos, token)    => apiPost('/api/social/posts', datos, token);
export const borrarPost     = (id, token)       => apiDelete(`/api/social/posts/${id}`, token);
export const seguir         = (id, token)       => apiPost('/api/social/follows', { seguido_id: id }, token);
export const dejarSeguir    = (id, token)       => apiDelete(`/api/social/follows/${id}`, token);
export const invitarLector  = (id, token)       => apiPost('/api/social/lectores-fieles', { receptor_id: id }, token);
export const darGlimmer     = (datos, token)    => apiPost('/api/social/glimmers', datos, token);
export const crearNota      = (datos, token)    => apiPost('/api/social/notas', datos, token);
export const getRanking     = ()                => apiGet('/api/social/ranking');
export const getNotificaciones = (token)        => apiGet('/api/social/notificaciones', token);
export const leerNotificaciones = (token)       => apiPatch('/api/social/notificaciones/leer-todas', {}, token);
export const getPerfilPublico = (username)      => apiGet(`/api/auth/perfil/${username}`);
export const getLibrosPerfil  = (username, token)  => apiGet(`/api/auth/perfil/${username}/libros`, token);
export const getCapitulos     = (libroId)       => apiGet(`/api/libros/${libroId}/capitulos`);
