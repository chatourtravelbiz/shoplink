// Lapisan API + state session. Semua fetch memakai credentials same-origin
// (cookie session HttpOnly) dan melempar Error dengan pesan dari server.
export const state = { session: null };

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || `Gagal (${res.status})`);
    e.code = data.code || null;
    throw e;
  }
  return data;
}

export async function apiForm(path, formData) {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal (${res.status})`);
  return data;
}

export async function loadSession() {
  try {
    state.session = await api('/api/auth/session');
  } catch {
    state.session = null;
  }
  return state.session;
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {
    // Abaikan: session lokal tetap dibersihkan.
  }
  state.session = null;
}
