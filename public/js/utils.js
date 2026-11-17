// Util murni: format, escape HTML, tema, label — kecuali go(), navigasi SPA.
export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);

/** Escape HTML — SEMUA data dari server/user WAJIB lewat ini sebelum masuk innerHTML. */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export const THEMES = {
  emerald: { main: '#059669', soft: '#ecfdf5', dark: '#064e3b' },
  rose: { main: '#e11d48', soft: '#fff1f2', dark: '#881337' },
  amber: { main: '#d97706', soft: '#fffbeb', dark: '#78350f' },
  sky: { main: '#0284c7', soft: '#f0f9ff', dark: '#0c4a6e' },
  violet: { main: '#7c3aed', soft: '#f5f3ff', dark: '#4c1d95' },
};
export const themeOf = (name) => THEMES[name] || THEMES.emerald;

export const PAYMENT_LABEL = { whatsapp: 'WhatsApp', cod: 'COD (bayar di tempat)', transfer: 'Transfer bank' };
export const STATUS_LABEL = { pending: 'Menunggu', confirmed: 'Dikonfirmasi', completed: 'Selesai', cancelled: 'Dibatalkan' };
export const STATUS_CLASS = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

/** Navigasi SPA path bersih (History API). */
export function go(path) {
  history.pushState(null, '', String(path || '/'));
  window.dispatchEvent(new Event('popstate'));
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

/** Nomor WhatsApp -> digit internasional (0... jadi 62...). */
export function waDigits(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits;
}
