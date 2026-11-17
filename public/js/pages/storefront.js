// Storefront publik — profil agen link-in-bio: header profil di tengah (avatar,
// nama, @username, bio, badge Agen Chatour Travel, tombol WhatsApp + bagikan),
// lalu paket/produk sebagai kartu vertikal ala link-in-bio.
import { api } from '../api.js';
import { esc, go, priceLabel, storePath, themeOf, waDigits } from '../utils.js';
import { icon, waIcon } from '../icons.js';
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

function btnRadius(store) {
  return store.button_style === 'pill' ? '9999px' : store.button_style === 'square' ? '4px' : '16px';
}

/** Baris ikon akun sosial agen (SVG) — hanya yang terisi; hilang bila kosong. */
function socialRow(store, theme) {
  const links = store.social_links || {};
  const nets = [
    ['instagram', 'Instagram agen'],
    ['facebook', 'Facebook agen'],
    ['tiktok', 'TikTok agen'],
    ['youtube', 'YouTube agen'],
  ].filter(([key]) => links[key]);
  if (!nets.length) return '';
  return `<div class="flex justify-center items-center gap-3 mt-4" style="color:${theme.main}">${nets
    .map(([key, label]) => `<a href="${esc(links[key])}" target="_blank" rel="noopener" aria-label="${esc(label)}" class="hover:opacity-70 transition">${icon(key, 36)}</a>`)
    .join('')}</div>`;
}

function storeHeader(store) {
  const t = themeOf(store.theme);
  const radius = btnRadius(store);
  const avatar = store.avatar_url || store.logo_url;
  return `<div class="text-center pt-2 pb-6">
    ${avatar
      ? `<img src="${esc(avatar)}" class="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-white shadow" alt="${esc(store.store_name)}" />`
      : `<img src="/logo-chatour.png" class="w-24 h-24 rounded-full object-contain mx-auto ring-4 ring-white shadow bg-white p-1" alt="Chatour Travel" />`}
    <h1 class="text-2xl font-extrabold mt-4 leading-tight">${esc(store.store_name)}</h1>
    <p class="text-stone-500 text-sm mt-0.5">@${esc(store.username)}</p>
    ${store.show_badge !== 0 ? `<span class="inline-block mt-2 px-3 py-1 text-xs font-semibold text-white" style="background:${t.main};border-radius:${radius}">✈️ Agen Chatour Travel — Umroh &amp; Haji</span>` : ''}
    ${store.tagline ? `<p class="font-medium mt-3">${esc(store.tagline)}</p>` : ''}
    ${store.store_bio ? `<p class="text-stone-600 text-sm mt-1 max-w-md mx-auto">${esc(store.store_bio)}</p>` : ''}
    <div class="max-w-md mx-auto mt-5 space-y-2">
      <a href="https://wa.me/${esc(waDigits(store.whatsapp_number))}" target="_blank" rel="noopener" class="flex items-center justify-center gap-2 w-full py-3 text-white font-bold shadow" style="background:#25D366;border-radius:${radius}">${waIcon()}Chat WhatsApp Agen</a>
      <button data-action="share-store" class="block w-full py-3 bg-white border border-stone-300 font-semibold text-sm" style="border-radius:${radius}">🔗 Bagikan Toko Ini</button>
    </div>
    ${socialRow(store, t)}
    ${(store.trust_badges || []).length ? `<div class="flex flex-wrap justify-center gap-2 mt-4">${store.trust_badges.map((b) => `<span class="px-3 py-1 rounded-full bg-white border text-xs">✓ ${esc(b.text)}</span>`).join('')}</div>` : ''}
  </div>`;
}

/** Sampul brosur PDF (SVG, bukan emoji — emoji bisa tampil rusak di sebagian HP). */
function pdfCover(theme, hidden = false) {
  return `<div class="w-full h-full flex flex-col items-center justify-center gap-1" style="background:${theme.soft};color:${theme.main}${hidden ? ';display:none' : ''}">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>
    <span class="text-[11px] font-bold tracking-widest">PDF</span>
  </div>`;
}

/** Placeholder gambar produk (SVG, bukan emoji). */
export function imgCover(theme, hidden = false) {
  return `<div class="w-full h-full flex items-center justify-center" style="background:${theme.soft};color:${theme.main}${hidden ? ';display:none' : ''}">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
  </div>`;
}

function showcaseCard(item, theme) {
  const href = item.file_url || item.link_url;
  const cover = item.image_url
    ? `<div class="w-full h-full relative">${pdfCover(theme, true)}<img src="${esc(item.image_url)}" class="w-full h-full object-cover absolute inset-0" alt="" loading="lazy" onerror="var f=this.previousElementSibling;if(f)f.style.display='flex';this.remove();" /></div>`
    : pdfCover(theme);
  return `<article class="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col">
    <div class="h-24 sm:h-28 shrink-0">${cover}</div>
    <div class="p-3 flex flex-col flex-1">
      <h3 class="font-semibold text-sm leading-snug line-clamp-2">${esc(item.title)}</h3>
      ${item.description ? `<p class="text-xs text-stone-500 mt-1 line-clamp-2">${esc(item.description)}</p>` : ''}
      ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener" class="mt-auto pt-3"><span class="block text-center px-3 py-2 rounded-xl text-white text-xs font-semibold" style="background:${theme.main}">Lihat Brosur ↗</span></a>` : ''}
    </div>
  </article>`;
}

function showcaseSection(items, theme) {
  if (!items.length) return '';
  return `<h2 class="font-bold mt-8">Showcase / Brosur</h2>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">${items.map((it) => showcaseCard(it, theme)).join('')}</div>`;
}

function productCard(username, p, theme) {
  const cover = p.image_url
    ? `<span class="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative block">${imgCover(theme, true)}<img src="${esc(p.image_url)}" class="w-full h-full object-cover absolute inset-0" alt="${esc(p.name)}" loading="lazy" onerror="var f=this.previousElementSibling;if(f)f.style.display='flex';this.remove();" /></span>`
    : `<span class="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative block">${imgCover(theme)}</span>`;
  return `<a href="${storePath(username, p.id)}" data-action="product-click" data-username="${esc(username)}" data-product-id="${esc(p.id)}" class="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3 hover:shadow-md transition">
    ${cover}
    <div class="min-w-0 flex-1">
      <h3 class="font-semibold leading-snug">${esc(p.name)}</h3>
      <p class="text-xs text-stone-500 mt-0.5 line-clamp-1">${esc(p.description)}</p>
      <div class="flex items-center gap-2 mt-1.5 text-xs"><span class="px-2 py-0.5 rounded-full bg-stone-100">${esc(p.category)}</span><span class="${p.stock > 0 ? 'text-stone-500' : 'text-stone-400'}">${p.stock > 0 ? `Stok ${p.stock}` : 'Pre-order'}</span></div>
    </div>
    <div class="text-right shrink-0"><div class="font-extrabold whitespace-nowrap" style="color:${theme.main}">${priceLabel(p.price)}</div><span class="text-xs font-semibold text-stone-500">Lihat →</span></div>
  </a>`;
}

export async function viewStore(username) {
  let data;
  try {
    data = await loadStore(username);
  } catch (e) {
    return `${topbar()}<main class="max-w-5xl mx-auto px-4 py-10"><div class="bg-white border rounded-2xl p-8 text-center"><h1 class="text-xl font-bold">Toko tidak ditemukan</h1><p class="text-stone-600 text-sm mt-2">${esc(e.message)}</p><a href="https://chatourtravel.com/" class="inline-block mt-4 px-4 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold">Kunjungi Chatour Travel</a></div></main>`;
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
  const list = filtered.length
    ? filtered.map((p) => productCard(username, p, t)).join('')
    : `<p class="text-center text-stone-500 py-8">Tidak ada produk yang cocok. Coba kata kunci atau kategori lain.</p>`;
  let showcase = [];
  try {
    showcase = (await api(`/api/stores/${username}/showcase`)).items || [];
  } catch {
    showcase = [];
  }
  const productsSection = `<h2 class="font-bold mt-2">Paket &amp; Produk</h2>
    <div class="mt-3">
      <input id="store-search" data-username="${esc(username)}" value="${esc(q)}" placeholder="🔍 Cari paket / produk..." class="${inputCls} !mt-0" />
      <div class="flex flex-wrap gap-2 mt-3">
        ${cats.map((c) => `<button data-action="store-filter" data-username="${esc(username)}" data-cat="${esc(c)}" class="px-3 py-1.5 rounded-full text-sm border ${c === cat ? 'text-white font-semibold' : 'bg-white'}" style="${c === cat ? `background:${t.main};border-color:${t.main}` : ''}">${esc(c)}</button>`).join('')}
      </div>
    </div>
    <div class="space-y-3 mt-4">${list}</div>`;
  const sections = store.section_order === 'showcase-first'
    ? showcaseSection(showcase, t) + productsSection
    : productsSection + showcaseSection(showcase, t);
  return `${topbar()}
  <main class="max-w-xl mx-auto px-4 py-8">
    ${storeHeader(store)}
    ${sections}
    <div class="text-center mt-8">
      <img src="/logo-chatour.png" class="w-12 h-12 object-contain mx-auto" alt="Chatour Travel" />
      <p class="text-xs text-stone-400 mt-2">Chatour Travel — Biro Umroh &amp; Haji · Pembayaran manual via WhatsApp / COD / Transfer.</p>
    </div>
  </main>`;
}

export function storeFilter(username, cat) {
  clearStoreCache();
  go(`/${username}${cat !== 'Semua' ? `?cat=${encodeURIComponent(cat)}` : ''}`);
}

/** Salin link toko ke clipboard; ubah label tombol sementara sebagai feedback. */
export async function shareStore(button) {
  const url = location.href;
  let ok = false;
  try {
    await navigator.clipboard.writeText(url);
    ok = true;
  } catch {
    ok = false;
  }
  if (!ok) {
    window.prompt('Salin link toko ini:', url);
    return;
  }
  const prev = button.textContent;
  button.textContent = '✓ Link disalin!';
  setTimeout(() => { button.textContent = prev; }, 2000);
}

export async function trackClick(username, productId) {
  try {
    await api('/api/analytics/track', {
      method: 'POST',
      body: JSON.stringify({
        store_username: username,
        event_type: 'click',
        page_path: productId ? `/${username}/p/${productId}` : `/${username}`,
        product_id: productId || undefined,
      }),
    });
  } catch {
    // Analitik gagal: abaikan.
  }
}
