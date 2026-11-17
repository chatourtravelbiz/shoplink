// Storefront publik: header toko, grid produk, filter kategori + cari.
import { api } from '../api.js';
import { esc, go, rupiah, themeOf, waDigits } from '../utils.js';
import { errorBox, inputCls, topbar } from '../ui.js';

let storeCache = null; // { username, store, products }

export async function loadStore(username) {
  if (storeCache?.username === username) return storeCache;
  const data = await api(`/api/stores/${username}`);
  storeCache = { username, ...data };
  return storeCache;
}

export function clearStoreCache() {
  storeCache = null;
}

function storeHeader(store) {
  const t = themeOf(store.theme);
  return `<div class="rounded-2xl p-6 text-white" style="background:${t.main}">
    <div class="flex items-start gap-4">
      ${store.logo_url ? `<img src="${esc(store.logo_url)}" class="w-16 h-16 rounded-2xl object-cover bg-white" alt="" />` : `<div class="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-extrabold">${esc((store.store_name || '?')[0])}</div>`}
      <div class="min-w-0">
        <h1 class="text-2xl font-extrabold leading-tight">${esc(store.store_name)}</h1>
        <p class="text-white/85 text-sm mt-0.5">${esc(store.tagline)}</p>
        ${store.store_bio ? `<p class="text-white/75 text-sm mt-2">${esc(store.store_bio)}</p>` : ''}
      </div>
    </div>
    <div class="flex flex-wrap gap-2 mt-4">
      <a href="https://wa.me/${esc(waDigits(store.whatsapp_number))}" target="_blank" rel="noopener" class="px-4 py-2 rounded-xl bg-white font-semibold text-sm" style="color:${t.dark}">💬 Chat WhatsApp</a>
      ${(store.trust_badges || []).map((b) => `<span class="px-3 py-2 rounded-xl bg-white/15 text-xs">✓ ${esc(b.text)}</span>`).join('')}
    </div>
  </div>`;
}

function productCard(username, p, theme) {
  return `<a href="/${esc(username)}/p/${esc(p.id)}" data-action="product-click" data-username="${esc(username)}" class="bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-md transition block">
    <img src="${esc(p.image_url)}" class="w-full h-44 object-cover" alt="${esc(p.name)}" loading="lazy" />
    <div class="p-4">
      <div class="flex items-start justify-between gap-2"><h3 class="font-semibold leading-snug">${esc(p.name)}</h3><span class="font-extrabold whitespace-nowrap" style="color:${theme.main}">${rupiah(p.price)}</span></div>
      <p class="text-xs text-stone-500 mt-1 line-clamp-2">${esc(p.description)}</p>
      <div class="flex items-center justify-between mt-3 text-xs"><span class="px-2 py-1 rounded-full bg-stone-100">${esc(p.category)}</span><span class="${p.stock > 0 ? 'text-stone-500' : 'text-stone-400'}">${p.stock > 0 ? `Stok ${p.stock}` : 'Pre-order'}</span></div>
    </div></a>`;
}

export async function viewStore(username) {
  let data;
  try {
    data = await loadStore(username);
  } catch (e) {
    return `${topbar()}<main class="max-w-5xl mx-auto px-4 py-10"><div class="bg-white border rounded-2xl p-8 text-center"><h1 class="text-xl font-bold">Toko tidak ditemukan</h1><p class="text-stone-600 text-sm mt-2">${esc(e.message)}</p><a href="/" class="inline-block mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold">Kembali ke Beranda</a></div></main>`;
  }
  const { store, products } = data;
  const t = themeOf(store.theme);
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const cat = params.get('cat') || 'Semua';
  const cats = ['Semua', ...new Set(products.map((p) => p.category))];
  const filtered = products.filter(
    (p) => (cat === 'Semua' || p.category === cat) && (!q || (p.name + ' ' + p.description).toLowerCase().includes(q.toLowerCase())),
  );
  const grid = filtered.length
    ? filtered.map((p) => productCard(username, p, t)).join('')
    : `<p class="col-span-full text-center text-stone-500 py-8">Tidak ada produk yang cocok. Coba kata kunci atau kategori lain.</p>`;
  return `${topbar()}
  <main class="max-w-5xl mx-auto px-4 py-8">
    ${storeHeader(store)}
    <div class="flex flex-wrap gap-2 mt-5 items-center">
      <input id="store-search" data-username="${esc(username)}" value="${esc(q)}" placeholder="🔍 Cari produk..." class="${inputCls} !mt-0 !w-56" />
      ${cats.map((c) => `<button data-action="store-filter" data-username="${esc(username)}" data-cat="${esc(c)}" class="px-3 py-2 rounded-full text-sm border ${c === cat ? 'text-white font-semibold' : 'bg-white'}" style="${c === cat ? `background:${t.main};border-color:${t.main}` : ''}">${esc(c)}</button>`).join('')}
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-5">${grid}</div>
    <p class="text-center text-xs text-stone-400 mt-8">Pembayaran manual via WhatsApp / COD / Transfer — tanpa pembayaran online.</p>
  </main>`;
}

export function storeFilter(username, cat) {
  clearStoreCache();
  go(`/${username}${cat !== 'Semua' ? `?cat=${encodeURIComponent(cat)}` : ''}`);
}

export async function trackClick(username) {
  try {
    await api('/api/analytics/track', { method: 'POST', body: JSON.stringify({ store_username: username, event_type: 'click', page_path: `/${username}` }) });
  } catch {
    // Analitik gagal: abaikan.
  }
}
