// Util murni: format, escape HTML, tema, label — kecuali go(), navigasi SPA.
export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);

/** Harga tampil: 0 = "Tanya Harga" (paket tanpa harga publik, mis. paket Umroh & Haji). */
export const priceLabel = (n) => (Number(n) || 0) <= 0 ? 'Tanya Harga' : rupiah(n);

/** Escape HTML — SEMUA data dari server/user WAJIB lewat ini sebelum masuk innerHTML. */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export const THEMES = {
  chatour: { label: 'Chatour', main: '#b02a00', soft: '#fdeee8', dark: '#7e1e00' },
  emerald: { label: 'Emerald', main: '#059669', soft: '#ecfdf5', dark: '#064e3b' },
  ocean: { label: 'Ocean', main: '#0369a1', soft: '#e0f2fe', dark: '#0c4a6e' },
  sunset: { label: 'Sunset', main: '#ea580c', soft: '#fff7ed', dark: '#7c2d12' },
  rose: { label: 'Rose', main: '#e11d48', soft: '#fff1f2', dark: '#881337' },
  dark: { label: 'Dark', main: '#18181b', soft: '#f4f4f5', dark: '#000000' },
  light: { label: 'Light', main: '#78716c', soft: '#fafaf9', dark: '#292524' },
  forest: { label: 'Forest', main: '#15803d', soft: '#f0fdf4', dark: '#14532d' },
  amber: { label: 'Amber', main: '#d97706', soft: '#fffbeb', dark: '#78350f' },
  sky: { label: 'Sky', main: '#0284c7', soft: '#f0f9ff', dark: '#0c4a6e' },
  violet: { label: 'Violet', main: '#7c3aed', soft: '#f5f3ff', dark: '#4c1d95' },
};
export const themeOf = (name) => THEMES[name] || THEMES.chatour;

export const PAYMENT_LABEL = { whatsapp: 'WhatsApp', cod: 'COD (bayar di tempat)', transfer: 'Transfer bank' };
export const STATUS_LABEL = { pending: 'Menunggu', confirmed: 'Dikonfirmasi', completed: 'Selesai', cancelled: 'Dibatalkan' };
export const STATUS_CLASS = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  completed: 'bg-red-100 text-red-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

/** Navigasi SPA path bersih (History API). */
export function go(path) {
  history.pushState(null, '', String(path || '/'));
  window.dispatchEvent(new Event('popstate'));
}

/** URL toko/produk: di host tokonya sendiri (window.__CUSTOM_STORE__)
    pakai bentuk pendek / dan /p/:id; dari mana pun yang lain pakai alamat
    subdomain toko: https://nama.chatourtravel.com(/p/:id). Toko di
    chatourtravel.com/:username sudah dihapus (dialihkan 301 ke subdomain). */
export function storePath(username, productId) {
  if (typeof window !== 'undefined' && window.__CUSTOM_STORE__ && window.__CUSTOM_STORE__ === username) {
    return productId ? `/p/${productId}` : '/';
  }
  return productId ? `https://${username}.chatourtravel.com/p/${productId}` : `https://${username}.chatourtravel.com/`;
}

/** Toggle lihat/sembunyikan password pada field di sekitar tombol. */
export function togglePasswordVisibility(button) {
  const input = button.closest('div')?.querySelector('input');
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.textContent = show ? '🙈' : '👁';
  button.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Lihat password');
}

/** Mode gelap/terang SPA — pilihan tersimpan di localStorage ('ct-theme'),
 *  kunci yang sama dipakai company profile. Tanpa nilai tersimpan, ikut
 *  prefers-color-scheme (diterapkan sebelum paint oleh script di spa.html). */
export function isDark() {
  return document.documentElement.classList.contains('dark');
}

export function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('ct-theme', dark ? 'dark' : 'light'); } catch { /* abaikan */ }
  const btn = document.querySelector('[data-action="toggle-theme"]');
  if (btn) btn.textContent = dark ? '☀️' : '🌙';
}

/** Nomor WhatsApp -> digit internasional (0... jadi 62...). */
export function waDigits(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits;
}
