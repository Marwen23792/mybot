const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('prodkeys_token');
}

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('prodkeys_token');
    window.location.href = 'login.html';
    throw new Error('Session expirée');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

function logout() {
  localStorage.removeItem('prodkeys_token');
  window.location.href = 'login.html';
}

function fmtMoney(n) {
  return `$${(n || 0).toFixed(2)}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function pillHtml(status) {
  return `<span class="pill ${status}">${status}</span>`;
}
