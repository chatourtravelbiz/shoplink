// Halaman publik: masuk agen (minimal, tanpa landing), signup, login.
import { api, loadSession } from '../api.js';
import { go } from '../utils.js';
import { field, inputCls, setErr, topbar } from '../ui.js';

// Halaman masuk agen — sangat minimal. Shoplink TIDAK punya landing page:
// route / redirect ke company profile (lihat landingAction di router.js);
// halaman ini hanya tampil bila Shoplink masih di root chatourtravel.com.
export function viewAgentEntry() {
  return `${topbar()}
  <main class="max-w-md mx-auto px-4 py-14 text-center">
    <img src="/logo-chatour.png" class="w-20 h-20 object-contain mx-auto" alt="Chatour Travel" />
    <p class="mt-3 text-sm font-semibold tracking-wide text-stone-500">CHATOUR TRAVEL · BIRO UMROH &amp; HAJI</p>
    <h1 class="text-2xl font-extrabold mt-2">Shoplink Agen</h1>
    <p class="text-sm text-stone-600 mt-2">Link-in-bio untuk para agen Chatour Travel. Masuk untuk mengelola tokomu, atau daftar sebagai agen baru.</p>
    <div class="mt-6 space-y-3">
      <a href="/login" class="block w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold">Masuk</a>
      <a href="/signup" class="block w-full py-3 rounded-xl bg-white border border-stone-300 font-semibold">Daftar Agen</a>
      <a href="https://chatourtravel.com/" class="block text-sm text-emerald-700 underline">Kunjungi Company Profile Chatour Travel</a>
    </div>
  </main>`;
}


/** Field password + tombol ikon mata (lihat/sembunyikan). Tombol type="button"
    agar tidak submit form; aria-label berubah sesuai state di toggle. */
function passwordField(extra) {
  return `<div class="relative"><input required type="password" name="password" ${extra} class="${inputCls} pr-10" /><button type="button" data-action="toggle-password" aria-label="Lihat password" class="absolute right-2 top-1/2 -translate-y-1/2 text-lg leading-none">👁</button></div>`;
}

export function viewSignup() {
  return `${topbar()}
  <main class="max-w-md mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold">Buat akun &amp; toko</h1>
    <p class="text-sm text-stone-600 mt-1">Sudah punya akun? <a class="text-emerald-700 underline" href="/login">Masuk di sini</a></p>
    <form id="f-signup" class="mt-6 space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
      <div id="err"></div>
      ${field('Email', `<input required type="email" name="email" class="${inputCls}" placeholder="kamu@email.com" />`)}
      ${field('Username toko', `<input required name="username" class="${inputCls}" placeholder="tokokamu" />`, '3–30 karakter, huruf kecil/angka/underscore. Link tokomu: /username')}
      <div class="grid grid-cols-2 gap-3">
        ${field('Nama depan', `<input name="first_name" class="${inputCls}" placeholder="Sifa" />`)}
        ${field('Nama belakang', `<input name="last_name" class="${inputCls}" placeholder="Putri" />`)}
      </div>
      ${field('Nomor WhatsApp', `<input required name="whatsapp_number" class="${inputCls}" placeholder="0812xxxxxx" />`, 'Dipakai pembeli untuk konfirmasi order. Boleh diawali 0 atau 62.')}
      ${field('Password', passwordField('minlength="6" placeholder="Minimal 6 karakter"'))}
      <button class="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold">Daftar &amp; Buat Toko</button>
    </form>
  </main>`;
}

export function viewLogin() {
  return `${topbar()}
  <main class="max-w-md mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold">Masuk ke dashboard</h1>
    <p class="text-sm text-stone-600 mt-1">Belum punya akun? <a class="text-emerald-700 underline" href="/signup">Daftar di sini</a></p>
    <form id="f-login" class="mt-6 space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
      <div id="err"></div>
      ${field('Email', `<input required type="email" name="email" class="${inputCls}" placeholder="kamu@email.com" />`)}
      ${field('Password', passwordField(''))}
      <button class="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold">Masuk</button>
      <p class="text-xs text-stone-500 text-center">Akun demo: john@example.com / password123 — <a class="underline" href="/demo">lihat toko demo</a></p>
    </form>
  </main>`;
}

/** Pasang submit handler bila form auth ada di DOM (no-op bila tidak ada). */
export function bindAuth() {
  const signup = document.getElementById('f-signup');
  if (signup) {
    signup.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(signup))) });
        await loadSession();
        go('/dashboard');
      } catch (err) {
        setErr('err', err.message);
      }
    });
  }
  const login = document.getElementById('f-login');
  if (login) {
    login.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(login))) });
        await loadSession();
        go('/dashboard');
      } catch (err) {
        setErr('err', err.message);
      }
    });
  }
}
