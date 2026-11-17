// Komponen UI bersama (topbar, field form, kotak error). Semua teks dinamis
// yang berasal dari user/server sudah di-escape oleh pemanggil via esc().
import { esc } from './utils.js';
import { state } from './api.js';

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

export function topbar(active) {
  const isAdmin = state.session && ['super_admin', 'admin', 'moderator', 'support'].includes(state.session.user.role);
  const links = state.session
    ? `<a href="/dashboard" class="px-3 py-2 rounded-lg ${active === 'dashboard' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'hover:bg-stone-100'}">Dashboard</a>
       <a href="/products" class="px-3 py-2 rounded-lg ${active === 'products' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'hover:bg-stone-100'}">Produk</a>
       <a href="/settings" class="px-3 py-2 rounded-lg ${active === 'settings' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'hover:bg-stone-100'}">Pengaturan</a>
       ${isAdmin ? `<a href="/admin" class="px-3 py-2 rounded-lg ${active === 'admin' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'hover:bg-stone-100'}">Admin</a>` : ''}
       <a href="/${esc(state.session.user.username)}" class="px-3 py-2 rounded-lg hover:bg-stone-100">Lihat Tokoku ↗</a>
       <button data-action="logout" class="px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-700">Keluar</button>`
    : `<a href="/login" class="px-3 py-2 rounded-lg hover:bg-stone-100">Masuk</a>
       <a href="/signup" class="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold">Daftar Gratis</a>`;
  return `<header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
      <a href="${state.session ? '/dashboard' : 'https://chatourtravel.com/'}" class="flex items-center gap-2 text-xl font-extrabold tracking-tight"><img src="/logo-chatour.png" alt="Chatour Travel" class="h-9 w-9 object-contain" />Shop<span class="text-emerald-600">link</span></a>
      <nav class="flex items-center gap-1 text-sm overflow-x-auto">${links}</nav>
    </div></header>`;
}
