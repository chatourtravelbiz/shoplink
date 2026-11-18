// Halaman publik: signup, login. (Chatour Travel tidak punya landing page.)
import { api, loadSession } from '../api.js';
import { esc, go } from '../utils.js';
import { field, inputCls, setBusy, setErr, topbar } from '../ui.js';

/** Field password + tombol ikon mata (lihat/sembunyikan). Tombol type="button"
    agar tidak submit form; aria-label berubah sesuai state di toggle. */
function passwordField(extra) {
  return `<div class="relative"><input required type="password" name="password" ${extra} class="${inputCls} pr-10" /><button type="button" data-action="toggle-password" aria-label="Lihat password" class="absolute right-2 top-1/2 -translate-y-1/2 text-lg leading-none">👁</button></div>`;
}

export function viewSignup() {
  return `${topbar()}
  <main class="max-w-md mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold">Buat akun &amp; toko</h1>
    <p class="text-sm text-stone-600 mt-1">Sudah punya akun? <a class="text-red-700 underline" href="/login">Masuk di sini</a></p>
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
      <button class="w-full py-3 rounded-xl bg-red-700 text-white font-semibold">Daftar &amp; Buat Toko</button>
    </form>
  </main>`;
}

export function viewLogin() {
  const q = new URLSearchParams(location.search);
  const notice = q.get('verified') === '1'
    ? `<div class="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 text-sm">✓ Email terverifikasi! Akun &amp; tokomu sudah aktif — silakan masuk.</div>`
    : q.get('verify') === 'expired'
      ? `<div class="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 text-sm">Tautan verifikasi sudah kadaluarsa (24 jam). Minta email verifikasi baru di bawah.</div>`
      : q.get('verify') === 'used'
        ? `<div class="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 text-sm">Email ini sudah terverifikasi — silakan masuk.</div>`
      : q.get('verify')
        ? `<div class="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm">Tautan verifikasi tidak valid. Minta email verifikasi baru di bawah.</div>`
        : '';
  return `${topbar()}
  <main class="max-w-md mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold">Masuk ke dashboard</h1>
    <p class="text-sm text-stone-600 mt-1">Belum punya akun? <a class="text-red-700 underline" href="/signup">Daftar di sini</a></p>
    ${notice ? `<div class="mt-4">${notice}</div>` : ''}
    <form id="f-login" class="mt-6 space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
      <div id="err"></div>
      ${field('Email', `<input required type="email" name="email" class="${inputCls}" placeholder="kamu@email.com" />`)}
      ${field('Password', passwordField(''))}
      <button class="w-full py-3 rounded-xl bg-red-700 text-white font-semibold">Masuk</button>
      <p class="text-xs text-stone-500 text-center">Akun demo: john@example.com / password123 — <a class="underline" href="https://demo.chatourtravel.com/" target="_blank" rel="noopener">lihat toko demo</a></p>
    </form>
    <div id="resend-wrap" class="${q.get('verify') ? '' : 'hidden'} mt-4 bg-white border border-stone-200 rounded-2xl p-5">
      <h2 class="font-bold text-sm">Kirim ulang email verifikasi</h2>
      <p class="text-xs text-stone-500 mt-1">Belum menerima email? Cek folder spam dulu, atau minta kirim ulang.</p>
      <form id="f-resend" class="mt-3 space-y-3">
        <div id="resend-err"></div>
        ${field('Email', `<input required type="email" name="email" class="${inputCls}" placeholder="kamu@email.com" />`)}
        <button class="w-full py-2.5 rounded-xl border font-semibold text-sm">Kirim Ulang Email Verifikasi</button>
      </form>
    </div>
  </main>`;
}

/** Pasang submit handler bila form auth ada di DOM (no-op bila tidak ada). */
export function bindAuth() {
  const signup = document.getElementById('f-signup');
  if (signup) {
    signup.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = signup.querySelector('button[type="submit"]') || signup.querySelector('button');
      setBusy(btn, true, 'Mendaftar…');
      try {
        const fd = new FormData(signup);
        const r = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) });
        // Akun belum aktif sebelum verifikasi email: tampilkan instruksi,
        // jangan langsung masuk ke dashboard.
        signup.outerHTML = `<div class="mt-6 space-y-3 bg-white border border-stone-200 rounded-2xl p-5">
          <h2 class="font-bold text-lg">✓ Akun dibuat!</h2>
          <p class="text-sm text-stone-600">Kami mengirim email verifikasi ke <b>${esc(fd.get('email') || '')}</b>. Klik tautan di email itu (berlaku 24 jam) untuk mengaktifkan akun &amp; tokomu, lalu masuk.</p>
          ${r.email_sent ? '' : `<p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Email verifikasi belum bisa dikirim saat ini (layanan email belum diatur admin). Coba kirim ulang dari halaman login, atau hubungi admin.</p>`}
          <p class="text-sm"><a class="text-red-700 underline" href="/login">Ke halaman masuk →</a></p>
        </div>`;
      } catch (err) {
        setBusy(btn, false);
        setErr('err', err.message);
      }
    });
  }
  const login = document.getElementById('f-login');
  if (login) {
    login.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = login.querySelector('button[type="submit"]') || login.querySelector('button');
      setBusy(btn, true, 'Masuk…');
      try {
        await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(login))) });
        await loadSession();
        go('/dashboard');
      } catch (err) {
        setBusy(btn, false);
        setErr('err', err.message);
        if (err.code === 'email_not_verified') {
          const w = document.getElementById('resend-wrap');
          if (w) {
            w.classList.remove('hidden');
            const em = w.querySelector('[name="email"]');
            if (em && !em.value) em.value = new FormData(login).get('email') || '';
            w.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    });
  }
  const resend = document.getElementById('f-resend');
  if (resend) {
    resend.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = resend.querySelector('button[type="submit"]') || resend.querySelector('button');
      setBusy(btn, true, 'Mengirim…');
      try {
        const r = await api('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(resend))) });
        setErr('resend-err', '');
        resend.outerHTML = `<p class="text-sm ${r.email_sent ? 'text-emerald-700' : 'text-amber-700'}">✓ ${r.email_sent ? 'Email verifikasi dikirim ulang. Cek inbox (dan folder spam) kamu.' : 'Permintaan dicatat. Bila email tidak kunjung datang, hubungi admin.'}</p>`;
      } catch (err) {
        setBusy(btn, false);
        setErr('resend-err', err.message);
      }
    });
  }
}
