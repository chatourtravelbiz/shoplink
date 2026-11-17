// Halaman publik: landing, signup, login.
import { api, loadSession } from '../api.js';
import { go } from '../utils.js';
import { field, inputCls, setErr, topbar } from '../ui.js';

export function viewLanding() {
  return `${topbar()}
  <main class="max-w-5xl mx-auto px-4 py-10">
    <section class="text-center py-8">
      <h1 class="text-3xl sm:text-5xl font-extrabold leading-tight">Toko online kamu,<br/>cukup dari <span class="text-emerald-600">link di bio</span>.</h1>
      <p class="mt-4 text-stone-600 max-w-xl mx-auto">Buat etalase produk, bagikan satu link di Instagram, dan terima order langsung lewat WhatsApp. Tanpa pembayaran online, tanpa ribet — pembeli bisa bayar via WhatsApp, COD, atau transfer manual.</p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a href="#/signup" class="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow">Buat Tokoku — Gratis</a>
        <a href="#/s/demo" class="px-5 py-3 rounded-xl bg-white border border-stone-300 font-semibold">Lihat Toko Demo</a>
      </div>
      <p class="mt-3 text-xs text-stone-500">Akun demo: john@example.com / password123</p>
    </section>
    <section class="grid sm:grid-cols-3 gap-4 mt-6">
      ${[
        ['📱', 'Link-in-bio', 'Satu link untuk semua produkmu. Cocok dipasang di bio Instagram, TikTok, atau WhatsApp.'],
        ['💬', 'Order via WhatsApp', 'Pembeli isi form, lalu konfirmasi order langsung ke WhatsApp kamu. Pesan order sudah terisi otomatis.'],
        ['💵', 'Bayar manual, tanpa potongan', 'COD atau transfer bank langsung ke kamu. Tidak ada gateway pembayaran dan tidak ada biaya platform.'],
      ]
        .map(([icon, title, desc]) => `<div class="bg-white rounded-2xl border border-stone-200 p-5"><div class="text-2xl">${icon}</div><h3 class="font-bold mt-2">${title}</h3><p class="text-sm text-stone-600 mt-1">${desc}</p></div>`)
        .join('')}
    </section>
    <section class="mt-8 bg-emerald-700 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div><h2 class="text-xl font-bold">Mulai jualan hari ini juga</h2><p class="text-emerald-100 text-sm mt-1">Daftar 1 menit, isi produk, bagikan link tokomu.</p></div>
      <a href="#/signup" class="px-5 py-3 rounded-xl bg-white text-emerald-700 font-semibold shrink-0">Daftar Sekarang →</a>
    </section>
  </main>
  <footer class="max-w-5xl mx-auto px-4 pb-8 text-center text-xs text-stone-400">Shoplink D1 — berjalan di Cloudflare Workers + D1 + R2. Tanpa pembayaran online.</footer>`;
}

export function viewSignup() {
  return `${topbar()}
  <main class="max-w-md mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold">Buat akun &amp; toko</h1>
    <p class="text-sm text-stone-600 mt-1">Sudah punya akun? <a class="text-emerald-700 underline" href="#/login">Masuk di sini</a></p>
    <form id="f-signup" class="mt-6 space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
      <div id="err"></div>
      ${field('Email', `<input required type="email" name="email" class="${inputCls}" placeholder="kamu@email.com" />`)}
      ${field('Username toko', `<input required name="username" class="${inputCls}" placeholder="tokokamu" />`, '3–30 karakter, huruf kecil/angka/underscore. Link tokomu: /s/username')}
      <div class="grid grid-cols-2 gap-3">
        ${field('Nama depan', `<input name="first_name" class="${inputCls}" placeholder="Sifa" />`)}
        ${field('Nama belakang', `<input name="last_name" class="${inputCls}" placeholder="Putri" />`)}
      </div>
      ${field('Nomor WhatsApp', `<input required name="whatsapp_number" class="${inputCls}" placeholder="0812xxxxxx" />`, 'Dipakai pembeli untuk konfirmasi order. Boleh diawali 0 atau 62.')}
      ${field('Password', `<input required type="password" name="password" minlength="6" class="${inputCls}" placeholder="Minimal 6 karakter" />`)}
      <button class="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold">Daftar &amp; Buat Toko</button>
    </form>
  </main>`;
}

export function viewLogin() {
  return `${topbar()}
  <main class="max-w-md mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold">Masuk ke dashboard</h1>
    <p class="text-sm text-stone-600 mt-1">Belum punya akun? <a class="text-emerald-700 underline" href="#/signup">Daftar di sini</a></p>
    <form id="f-login" class="mt-6 space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
      <div id="err"></div>
      ${field('Email', `<input required type="email" name="email" class="${inputCls}" placeholder="kamu@email.com" />`)}
      ${field('Password', `<input required type="password" name="password" class="${inputCls}" />`)}
      <button class="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold">Masuk</button>
      <p class="text-xs text-stone-500 text-center">Akun demo: john@example.com / password123 — <a class="underline" href="#/s/demo">lihat toko demo</a></p>
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
        go('#/dashboard');
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
        go('#/dashboard');
      } catch (err) {
        setErr('err', err.message);
      }
    });
  }
}
