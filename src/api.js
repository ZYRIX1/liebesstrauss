async function request(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    const err = new Error('Keine Verbindung. Bist du online?');
    err.status = 0;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch { /* leer */ }
  if (!res.ok) {
    const err = new Error(data?.error || 'Da ist etwas schiefgelaufen.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  state: () => request('GET', '/api/state'),
  createRoom: (name, pin) => request('POST', '/api/rooms', { name, pin }),
  lookupRoom: (code) => request('GET', `/api/rooms/${encodeURIComponent(code)}`),
  joinRoom: (code, name, pin) => request('POST', `/api/rooms/${encodeURIComponent(code)}/join`, { name, pin }),
  login: (code, memberId, pin) => request('POST', '/api/login', { code, memberId, pin }),
  logout: () => request('POST', '/api/logout'),
  rename: (name) => request('PATCH', '/api/me', { name }),
  changePin: (currentPin, newPin) => request('POST', '/api/me/pin', { currentPin, newPin }),
  createFlower: (flower) => request('POST', '/api/flowers', flower),
  updateFlower: (id, flower) => request('PATCH', `/api/flowers/${id}`, flower),
  deleteFlower: (id) => request('DELETE', `/api/flowers/${id}`),
  openFlower: (id) => request('POST', `/api/flowers/${id}/open`),
  pushKey: () => request('GET', '/api/push/key'),
  pushSubscribe: (subscription) => request('POST', '/api/push/subscribe', { subscription }),
  pushUnsubscribe: (endpoint) => request('POST', '/api/push/unsubscribe', { endpoint }),
};
