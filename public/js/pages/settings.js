// Pengaturan toko merchant (auth).
import { api, state } from '../api.js';
import { THEMES, esc, go } from '../utils.js';
import { field, inputCls, setErr, topbar } from '../ui.js';

export function viewSettings() {
  if (!state.session) {
    go('#/login');
    return '';
  }
  const s = state.session.store || {};
  return `${topbar('settings')}
  <main class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold">Pengaturan toko</h1>
    <p class="text-sm text-stone-600 mt-1">Perubahan langsung terlihat di toko publikmu: <a class="text-emerald-700 underline" href="#/s/${esc(state.session.user.username)}">/s/${esc(state.session.user.username)}</a></p>
    <form id="f-settings" class="mt-6 space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
      <div id="err"></div>
      ${field('Nama toko *', `<input required name="store_name" value="${esc(s.store_name || '')}" class="${inputCls}" />`)}
      ${field('Tagline', `<input name="tagline" value="${esc(s.tagline || '')}" class="${inputCls}" />`)}
      ${field('Bio toko', `<textarea name="store_bio" rows="3" class="${inputCls}">${esc(s.store_bio || '')}</textarea>`)}
      ${field('Nomor WhatsApp *', `<input required name="whatsapp_number" value="${esc(s.whatsapp_number || '')}" class="${inputCls}" />`, 'Pembeli akan diarahkan ke nomor ini untuk konfirmasi order.')}
      ${field('Logo (URL gambar)', `<input name="logo_url" value="${esc(s.logo_url || '')}" class="${inputCls}" placeholder="https://..." />`)}
      <div class="grid grid-cols-2 gap-4">
        ${field('Mata uang', `<input name="currency" value="${esc(s.currency || 'IDR')}" class="${inputCls}" />`)}
        ${field('Tema warna', `<select name="theme" class="${inputCls}">${Object.keys(THEMES).map((t) => `<option value="${t}" ${t === s.theme ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
      </div>
      <button class="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold">Simpan Pengaturan</button>
    </form>
  </main>`;
}

export function bindSettings() {
  const form = document.getElementById('f-settings');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await api('/api/settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      state.session = { ...state.session, store: r.store };
      setErr('err', '');
      alert('Pengaturan tersimpan.');
    } catch (err) {
      setErr('err', err.message);
    }
  });
}
