// Komponen UI bersama (topbar, field form, kotak error). Semua teks dinamis
// yang berasal dari user/server sudah di-escape oleh pemanggil via esc().
import { esc, isDark, storePath } from './utils.js';
import { api, state } from './api.js';

export const inputCls = 'mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 bg-white';

export function field(label, inner, hint) {
  return `<label class="block"><span class="text-sm font-medium text-stone-700">${label}</span>${inner}${
    hint ? `<span class="block text-xs text-stone-500 mt-1">${hint}</span>` : ''
  }</label>`;
}

export function errorBox(msg) {
  return msg
    ? `<div class="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm">${esc(msg)}</div>`
    : '';
}

export function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = errorBox(msg);
}

/** Toast sukses kecil di bawah layar; ditempel ke <body> agar tidak hilang saat halaman di-render ulang. */
export function showToast(msg) {
  const old = document.getElementById('toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'toast';
  el.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-lg';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function topbar(active) {
  const isAdmin = state.session && ['super_admin', 'admin', 'moderator', 'support'].includes(state.session.user.role);
  const themeBtn = `<button data-action="toggle-theme" class="px-3 py-2 rounded-lg hover:bg-stone-100" aria-label="Ganti mode gelap/terang">${isDark() ? '☀️' : '🌙'}</button>`;
  const links = state.session
    ? `${themeBtn}<a href="/dashboard" class="px-3 py-2 rounded-lg ${active === 'dashboard' ? 'bg-red-100 text-red-800 font-semibold' : 'hover:bg-stone-100'}">Dashboard</a>
       <a href="/products" class="px-3 py-2 rounded-lg ${active === 'products' ? 'bg-red-100 text-red-800 font-semibold' : 'hover:bg-stone-100'}">Produk</a>
       <a href="/settings" class="px-3 py-2 rounded-lg ${active === 'settings' ? 'bg-red-100 text-red-800 font-semibold' : 'hover:bg-stone-100'}">Pengaturan</a>
       ${isAdmin ? `<a href="/admin" class="px-3 py-2 rounded-lg ${active === 'admin' ? 'bg-red-100 text-red-800 font-semibold' : 'hover:bg-stone-100'}">Admin</a>` : ''}
       <a href="${storePath(state.session.user.username)}" class="px-3 py-2 rounded-lg hover:bg-stone-100">Lihat Tokoku ↗</a>
       <button data-action="logout" class="px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-700">Keluar</button>`
    : `${themeBtn}<a href="/login" class="px-3 py-2 rounded-lg hover:bg-stone-100">Masuk</a>
       <a href="/signup" class="px-3 py-2 rounded-lg bg-red-700 text-white font-semibold">Daftar Gratis</a>`;
  return `<header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
      <a href="${state.session ? '/dashboard' : 'https://chatourtravel.com/'}" class="flex items-center gap-2 text-xl font-extrabold tracking-tight whitespace-nowrap"><img src="/logo-chatour.png" alt="Chatour Travel" class="h-9 w-9 object-contain" />Chatour <span class="text-red-700">Travel</span></a>
      <nav class="flex items-center gap-1 text-sm overflow-x-auto">${links}</nav>
    </div></header>`;
}

/** Form ganti password — dipakai di /admin (semua role admin) dan di
    Pengaturan toko (merchant). Tombol mata memakai aksi global
    toggle-password yang sudah ditangani app.js. */
export function passwordForm() {
  const pw = (name, extra) => `<div class="relative"><input required type="password" name="${name}" ${extra} class="${inputCls} pr-10" /><button type="button" data-action="toggle-password" aria-label="Lihat password" class="absolute right-2 top-1/2 -translate-y-1/2 text-lg leading-none">👁</button></div>`;
  return `<form id="f-change-password" class="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
    <h2 class="font-bold">Ganti Password</h2>
    <div id="pw-err"></div>
    ${field('Password saat ini *', pw('current_password', 'autocomplete="current-password"'))}
    ${field('Password baru *', pw('new_password', 'minlength="6" autocomplete="new-password" placeholder="Minimal 6 karakter"'))}
    ${field('Ulangi password baru *', pw('confirm_password', 'minlength="6" autocomplete="new-password"'))}
    <button class="px-4 py-2 rounded-xl bg-red-700 text-white font-semibold text-sm">Ganti Password</button>
  </form>`;
}

export function bindPasswordForm() {
  const form = document.getElementById('f-change-password');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      form.reset();
      const ok = document.getElementById('pw-err');
      if (ok) ok.innerHTML = `<div class="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 text-sm">✓ Password berhasil diganti. Sesi di perangkat lain sudah dicabut.</div>`;
    } catch (err) {
      setErr('pw-err', err.message);
    }
  });
}
