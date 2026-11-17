// Pengaturan toko merchant (auth) — termasuk pemilih tema ala Linktree.
import { api, state } from '../api.js';
import { THEMES, esc, go, themeOf } from '../utils.js';
import { waIcon } from '../icons.js';
import { field, inputCls, setErr, topbar } from '../ui.js';

const BUTTON_STYLES = [
  ['rounded', 'Membulat'],
  ['pill', 'Pil (oval)'],
  ['square', 'Kotak'],
];
const SECTION_ORDERS = [
  ['products-first', 'Paket & Produk dulu'],
  ['showcase-first', 'Showcase / Brosur dulu'],
];

function themeSwatches(current) {
  return `<div class="grid grid-cols-4 sm:grid-cols-6 gap-2" id="theme-grid">${Object.entries(THEMES).map(([key, t]) => `
    <button type="button" data-action="theme-pick" data-theme="${key}" aria-pressed="${key === current}" title="${esc(t.label)}"
      class="rounded-xl border-2 p-2 text-center ${key === current ? 'border-stone-800' : 'border-stone-200 bg-white'}">
      <span class="block w-8 h-8 rounded-full mx-auto ring-2 ring-white shadow" style="background:${t.main}"></span>
      <span class="block text-[11px] font-semibold mt-1">${esc(t.label)}</span>
    </button>`).join('')}</div>
  <input type="hidden" name="theme" id="theme-input" value="${esc(current || 'chatour')}" />`;
}

function themePreview(store) {
  const t = themeOf(store.theme || 'chatour');
  const radius = store.button_style === 'pill' ? '9999px' : store.button_style === 'square' ? '0px' : '16px';
  return `<div class="rounded-2xl border border-stone-200 p-4 bg-stone-50">
    <p class="text-xs font-semibold text-stone-500 mb-3">PRATINJAU TOKO</p>
    <div class="text-center">
      <div class="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white font-bold" style="background:${t.main}">C</div>
      <p class="font-bold mt-2">${esc(store.store_name || 'Nama Toko')}</p>
      ${store.show_badge !== 0 ? `<span class="inline-block mt-1 px-2 py-0.5 text-[11px] font-semibold text-white" style="background:${t.main};border-radius:${radius}">✈️ Agen Chatour Travel</span>` : ''}
      <div class="mt-3 space-y-2">
        <span class="block w-full py-2 text-white text-sm font-bold" style="background:#25D366;border-radius:${radius}">${waIcon(16)}Chat WhatsApp Agen</span>
        <span class="block w-full py-2 bg-white border text-sm font-semibold" style="border-radius:${radius}">Paket Umroh 9 Hari</span>
      </div>
    </div>
  </div>`;
}

export function viewSettings() {
  if (!state.session) {
    go('/login');
    return '';
  }
  const s = state.session.store || {};
  const theme = s.theme || 'chatour';
  return `${topbar('settings')}
  <main class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold">Pengaturan toko</h1>
    <p class="text-sm text-stone-600 mt-1">Perubahan langsung terlihat di toko publikmu: <a class="text-red-700 underline" href="/${esc(state.session.user.username)}">/${esc(state.session.user.username)}</a></p>
    <form id="f-settings" class="mt-6 space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
      <div id="err"></div>
      ${field('Nama toko *', `<input required name="store_name" value="${esc(s.store_name || '')}" class="${inputCls}" />`)}
      ${field('Tagline', `<input name="tagline" value="${esc(s.tagline || '')}" class="${inputCls}" />`)}
      ${field('Bio toko', `<textarea name="store_bio" rows="3" class="${inputCls}">${esc(s.store_bio || '')}</textarea>`)}
      ${field('Nomor WhatsApp *', `<input required name="whatsapp_number" value="${esc(s.whatsapp_number || '')}" class="${inputCls}" />`, 'Pembeli akan diarahkan ke nomor ini untuk konfirmasi order.')}
      ${field('Logo (URL gambar)', `<input name="logo_url" value="${esc(s.logo_url || '')}" class="${inputCls}" placeholder="https://..." />`)}
      <div class="grid grid-cols-2 gap-4">
        ${field('Mata uang', `<input name="currency" value="${esc(s.currency || 'IDR')}" class="${inputCls}" />`)}
      </div>
      <div>
        <span class="text-sm font-medium text-stone-700">Tema toko *</span>
        <div class="mt-1">${themeSwatches(theme)}</div>
      </div>
      <div id="theme-preview">${themePreview(s)}</div>
      <div class="grid sm:grid-cols-2 gap-4">
        ${field('Bentuk tombol', `<select name="button_style" class="${inputCls}">${BUTTON_STYLES.map(([v, l]) => `<option value="${v}"${(s.button_style || 'rounded') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`)}
        ${field('Urutan seksi', `<select name="section_order" class="${inputCls}">${SECTION_ORDERS.map(([v, l]) => `<option value="${v}"${(s.section_order || 'products-first') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`)}
      </div>
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="show_badge" ${s.show_badge !== 0 ? 'checked' : ''} class="w-4 h-4" /> Tampilkan badge "Agen Chatour Travel" di toko</label>
      <button class="w-full py-3 rounded-xl bg-red-700 text-white font-semibold">Simpan Pengaturan</button>
    </form>
  </main>`;
}

export function pickTheme(key) {
  const input = document.getElementById('theme-input');
  if (input) input.value = key;
  document.querySelectorAll('#theme-grid [data-action="theme-pick"]').forEach((b) => {
    const on = b.dataset.theme === key;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('border-stone-800', on);
    b.classList.toggle('border-stone-200', !on);
  });
  const s = state.session?.store || {};
  const preview = document.getElementById('theme-preview');
  if (preview) preview.innerHTML = themePreview({ ...s, theme: key });
}

export function bindSettings() {
  const form = document.getElementById('f-settings');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd);
      payload.show_badge = form.querySelector('[name="show_badge"]')?.checked ? 1 : 0;
      const r = await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      state.session = { ...state.session, store: r.store };
      setErr('err', '');
      alert('Pengaturan tersimpan.');
    } catch (err) {
      setErr('err', err.message);
    }
  });
}
