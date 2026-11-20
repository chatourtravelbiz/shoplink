// Pengaturan toko merchant (auth) — termasuk pemilih tema ala Linktree.
import { api, state } from '../api.js';
import { THEMES, esc, go, storePath, themeOf } from '../utils.js';
import { icon, waIcon } from '../icons.js';
import { bindPasswordForm, field, inputCls, passwordForm, setBusy, setErr, showToast, topbar } from '../ui.js';

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

function socialField(key, label, store) {
  const val = store.social_links?.[key] || '';
  return field(`${icon(key, 16)}${label}`, `<input name="social_${key}" value="${esc(val)}" class="${inputCls}" placeholder="username atau https://..." />`);
}

function themePreview(store) {
  const t = themeOf(store.theme || 'chatour');
  const radius = store.button_style === 'pill' ? '9999px' : store.button_style === 'square' ? '0px' : '16px';
  const socials = ['instagram', 'facebook', 'tiktok', 'youtube'].filter((n) => store.social_links?.[n]);
  return `<div class="rounded-2xl border border-stone-200 p-4 bg-stone-50">
    <p class="text-xs font-semibold text-stone-500 mb-3">PRATINJAU TOKO</p>
    <div class="text-center">
      <div class="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white font-bold" style="background:${t.main}">C</div>
      <p class="font-bold mt-2">${esc(store.store_name || 'Nama Toko')}</p>
      ${store.show_badge !== 0 ? `<span class="inline-block mt-1 px-2 py-0.5 text-[11px] font-semibold text-white" style="background:${t.main};border-radius:${radius}">✈️ Agen Chatour Travel</span>` : ''}
      <div class="mt-3 space-y-2">
        <span class="flex items-center justify-center gap-2 w-full py-2 text-white text-sm font-bold" style="background:#25D366;border-radius:${radius}">${waIcon(16)}Chat WhatsApp Agen</span>
        <span class="block w-full py-2 bg-white border text-sm font-semibold" style="border-radius:${radius}">Paket Umroh 9 Hari</span>
      </div>
      ${socials.length ? `<div class="flex justify-center gap-2 mt-3" style="color:${t.main}">${socials.map((n) => icon(n, 24)).join('')}</div>` : ''}
      ${(store.trust_badges || []).length ? `<div class="flex flex-wrap justify-center gap-1 mt-3">${store.trust_badges.map((b) => `<span class="px-2 py-0.5 rounded-full bg-white border text-[11px]">✓ ${esc(b.text)}</span>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

function domainSection(s) {
  const username = state.session?.user?.username || '';
  const active = s.custom_domain || '';
  const pending = s.custom_domain_request || '';
  const status = active
    ? `<p class="text-sm"><span class="font-semibold text-green-700">✓ Aktif:</span> <a class="text-red-700 underline" href="https://${esc(active)}" target="_blank" rel="noopener">${esc(active)}</a> — tokomu sudah bisa dibuka lewat domain ini.</p>`
    : pending
      ? `<p class="text-sm"><span class="font-semibold text-amber-700">⏳ Pengajuan terkirim: ${esc(pending)}</span> — menunggu admin memasang. <button type="button" data-action="domain-request-cancel" class="text-rose-700 underline text-sm">Batalkan pengajuan</button></p>`
      : `<p class="text-sm text-stone-600"><span class="font-semibold">Belum dipasang.</span> Ikuti panduan di bawah untuk memakai domain sendiri.</p>`;
  return `<section id="domain-section" class="mt-6 bg-white border border-stone-200 rounded-2xl p-5">
    <h2 class="font-bold">Domain Kustom</h2>
    <div id="domain-err"></div>
    <div class="mt-2">${status}</div>
    <p class="text-sm text-stone-600 mt-1">Alamat tokomu: <a class="text-red-700 underline" href="${storePath(username)}">${esc(username)}.chatourtravel.com</a></p>
    <h3 class="font-semibold text-sm mt-4">Cara memakai domain sendiri — 5 langkah</h3>
    <ol class="list-decimal pl-5 mt-1 space-y-1 text-sm text-stone-700">
      <li><b>Beli domain</b> di Hostinger, Niagahoster, atau Domainesia — mis. <code>tokoku.com</code> atau <code>agen-rahma.com</code>. Pilih nama yang pendek dan mudah diingat.</li>
      <li><b>Atur DNS</b> di tempat kamu membeli domain: tambah record <b>CNAME</b>, Host <code>@</code>, target <code>shoplink-d1.chatourtravelbiz.workers.dev</code>. Kalau mau pakai <code>www.</code> juga, tambah CNAME <code>www</code> ke target yang sama, lalu beri tahu admin supaya <code>www</code> ikut dipasang — domain www perlu dipasang terpisah, CNAME saja tidak cukup.</li>
      <li><b>Ajukan ke admin</b> lewat form di bawah ini — atau hubungi admin via WhatsApp kantor <a class="text-red-700 underline" href="https://wa.me/6282224332700" target="_blank" rel="noopener">0822 2433 2700</a>.</li>
      <li><b>Admin memasang domain</b> di Cloudflare. DNS butuh waktu menyebar, biasanya hitungan menit sampai beberapa jam.</li>
      <li><b>Cek sendiri</b>: buka domain itu di browser — bila sudah tampil tokomu, berarti aktif.</li>
    </ol>
    ${pending ? '' : `<form id="f-domain-request" class="flex flex-wrap gap-2 mt-4">
      <input name="custom_domain" placeholder="contoh: agenku.com" class="${inputCls} flex-1 min-w-[200px]" />
      <button type="submit" class="px-4 py-2 rounded-xl bg-red-700 text-white font-semibold text-sm">Ajukan ke Admin</button>
    </form>
    <p class="text-xs text-stone-500 mt-1">Pengajuan hanya diteruskan ke admin — domain baru aktif setelah admin memasang dan DNS tersebar.</p>`}
  </section>`;
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
    <p class="text-sm text-stone-600 mt-1">Perubahan langsung terlihat di toko publikmu: <a class="text-red-700 underline" href="${storePath(state.session.user.username)}">${storePath(state.session.user.username)}</a></p>
    ${s.custom_domain ? '' : `<p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">⏳ Subdomain tokomu sedang disiapkan (maks. beberapa menit) — setelah siap, link di atas bisa dibuka.</p>`}
    <form id="f-settings" class="mt-6 space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
      <div id="err"></div>
      ${field('Nama toko *', `<input required name="store_name" value="${esc(s.store_name || '')}" class="${inputCls}" />`)}
      ${field('Tagline', `<input name="tagline" value="${esc(s.tagline || '')}" class="${inputCls}" />`)}
      ${field('Bio toko', `<textarea name="store_bio" rows="3" class="${inputCls}">${esc(s.store_bio || '')}</textarea>`)}
      ${field('Nomor WhatsApp *', `<input required name="whatsapp_number" value="${esc(s.whatsapp_number || '')}" class="${inputCls}" />`, 'Pembeli akan diarahkan ke nomor ini untuk konfirmasi order.')}
      <div>
        <span class="text-sm font-medium text-stone-700">Akun Sosial</span>
        <p class="text-xs text-stone-500 mt-0.5">Isi username atau tautan lengkap, kosongkan bila tidak punya.</p>
        <div class="grid sm:grid-cols-2 gap-4 mt-1">
          ${socialField('instagram', 'Instagram', s)}
          ${socialField('facebook', 'Facebook', s)}
          ${socialField('tiktok', 'TikTok', s)}
          ${socialField('youtube', 'YouTube', s)}
        </div>
      </div>
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
        ${field('Urutan seksi', `<select name="section_order" class="${inputCls}">${SECTION_ORDERS.map(([v, l]) => `<option value="${v}"${(s.section_order || 'showcase-first') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`)}
      </div>
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="show_badge" ${s.show_badge !== 0 ? 'checked' : ''} class="w-4 h-4" /> Tampilkan badge "Agen Chatour Travel" di toko</label>
      <div>
        <span class="text-sm font-medium text-stone-700">Badge Kepercayaan</span>
        <p class="text-xs text-stone-500 mt-0.5">Maksimal 3 badge, masing-masing maksimal 40 karakter. Yang dikosongkan tidak ditampilkan di toko.</p>
        <div class="space-y-2 mt-1">
          ${[0, 1, 2].map((i) => `<input name="trust_badge" value="${esc(s.trust_badges?.[i]?.text || '')}" maxlength="40" class="${inputCls}" placeholder="Badge ${i + 1} — contoh: Fast Respon via WhatsApp" />`).join('')}
        </div>
      </div>
      <button type="submit" class="w-full py-3 rounded-xl bg-red-700 text-white font-semibold">Simpan Pengaturan</button>
    </form>
    <div class="mt-6">${passwordForm()}</div>
    ${domainSection(s)}
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
  bindPasswordForm();
  const form = document.getElementById('f-settings');
  if (form && !form.dataset.bound) {
    form.dataset.bound = '1';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter || form.querySelector('button[type="submit"]');
      setBusy(btn, true);
      try {
        const fd = new FormData(form);
        const payload = Object.fromEntries(fd);
        payload.show_badge = form.querySelector('[name="show_badge"]')?.checked ? 1 : 0;
        payload.trust_badges = fd.getAll('trust_badge');
        delete payload.trust_badge;
        payload.social_links = {
          instagram: fd.get('social_instagram') || '',
          facebook: fd.get('social_facebook') || '',
          tiktok: fd.get('social_tiktok') || '',
          youtube: fd.get('social_youtube') || '',
        };
        for (const k of ['social_instagram', 'social_facebook', 'social_tiktok', 'social_youtube']) delete payload[k];
        const r = await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
        state.session = { ...state.session, store: r.store };
        setErr('err', '');
        showToast('Pengaturan tersimpan.');
      } catch (err) {
        setErr('err', err.message);
      } finally {
        setBusy(btn, false);
      }
    });
  }
  bindDomainForm();
}

/** Form ajukan domain kustom — di-bind terpisah agar tidak ganda saat seksi di-refresh. */
function bindDomainForm() {
  const dForm = document.getElementById('f-domain-request');
  if (!dForm || dForm.dataset.bound) return;
  dForm.dataset.bound = '1';
  dForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || dForm.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Mengirim…');
    try {
      const val = dForm.querySelector('[name="custom_domain"]')?.value || '';
      const r = await api('/api/settings/custom-domain-request', {
        method: 'PUT', body: JSON.stringify({ custom_domain: val }),
      });
      state.session = { ...state.session, store: { ...state.session.store, custom_domain_request: r.custom_domain_request } };
      refreshDomainSection();
    } catch (err) {
      setErr('domain-err', err.message);
    } finally {
      setBusy(btn, false);
    }
  });
}

function refreshDomainSection() {
  const sec = document.getElementById('domain-section');
  if (sec) sec.outerHTML = domainSection(state.session?.store || {});
  bindDomainForm();
}

export async function cancelDomainRequest() {
  try {
    await api('/api/settings/custom-domain-request', { method: 'DELETE' });
    state.session = { ...state.session, store: { ...state.session.store, custom_domain_request: '' } };
    refreshDomainSection();
  } catch (e) {
    setErr('domain-err', e.message);
  }
}
