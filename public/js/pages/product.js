// Detail produk publik + form order (WhatsApp / COD / Transfer).
import { api } from '../api.js';
import { esc, go, priceLabel, storePath, themeOf, waDigits } from '../utils.js';
import { waIcon } from '../icons.js';
import { errorBox, field, inputCls, setErr } from '../ui.js';
import { imgCover, loadStore, storeFooter } from './storefront.js';

/** Header toko mini: avatar/logo + nama + badge + kembali ke toko. */
function storeMiniHeader(store) {
  const t = themeOf(store.theme);
  const avatar = store.avatar_url || store.logo_url;
  return `<div class="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3">
    ${avatar
      ? `<img src="${esc(avatar)}" class="w-12 h-12 rounded-full object-cover shrink-0" alt="${esc(store.store_name)}" />`
      : `<img src="/logo-chatour.png" class="w-12 h-12 rounded-full object-contain shrink-0 bg-white p-0.5" alt="Chatour Travel" />`}
    <div class="min-w-0 flex-1">
      <a href="${storePath(store.username)}" class="font-bold leading-tight hover:underline">${esc(store.store_name)}</a>
      <p class="text-stone-500 text-xs">@${esc(store.username)}</p>
      ${store.show_badge !== 0 ? `<span class="inline-block mt-1 px-2 py-0.5 text-[11px] font-semibold text-white rounded-full" style="background:${t.main}">✈️ Agen Chatour Travel</span>` : ''}
    </div>
    <a href="${storePath(store.username)}" class="shrink-0 text-sm font-semibold px-3 py-2 rounded-xl border bg-white hover:bg-stone-50">Lihat semua produk</a>
  </div>`;
}

/** Kartu produk lain — pola sama dengan kartu showcase di storefront. */
function otherCard(username, p, theme) {
  const cover = p.image_url
    ? `<img src="${esc(p.image_url)}" class="w-full h-full object-cover" alt="" loading="lazy" />`
    : imgCover(theme);
  return `<a href="${storePath(username, p.id)}" class="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition">
    <div class="h-24 sm:h-28 shrink-0">${cover}</div>
    <div class="p-3 flex flex-col flex-1">
      <h3 class="font-semibold text-sm leading-snug line-clamp-2">${esc(p.name)}</h3>
      <div class="mt-auto pt-2 flex items-center justify-between gap-2"><span class="font-extrabold text-sm" style="color:${theme.main}">${priceLabel(p.price)}</span><span class="text-xs font-semibold text-stone-500">Lihat →</span></div>
    </div>
  </a>`;
}

function othersSection(username, products, currentId, theme) {
  const others = products.filter((p) => p.id !== currentId).slice(0, 6);
  if (!others.length) return '';
  return `<h2 class="font-bold mt-8">Produk lain dari toko ini</h2>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">${others.map((p) => otherCard(username, p, theme)).join('')}</div>`;
}

export async function viewProduct(username, productId) {
  let data;
  try {
    data = await api(`/api/stores/${username}/products/${productId}`);
  } catch (e) {
    return `<main class="max-w-3xl mx-auto px-4 py-10">${errorBox(e.message)}<a href="${storePath(username)}" class="text-red-700 underline text-sm">← Kembali ke toko</a></main>`;
  }
  const { store, product: p } = data;
  const t = themeOf(store.theme);
  const params = new URLSearchParams(location.search);
  const done = params.get('done');
  const wa = params.get('wa');
  let others = '';
  try {
    const s = await loadStore(username);
    others = othersSection(username, s.products || [], p.id, t);
  } catch {
    others = '';
  }
  const success = done
    ? `<div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 mb-5">
      <h2 class="font-bold text-emerald-800">✅ Order kamu tercatat!</h2>
      <p class="text-sm text-emerald-700 mt-1">Langkah terakhir: konfirmasi order ke penjual lewat WhatsApp supaya segera diproses.</p>
      ${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-2 mt-3 px-5 py-3 rounded-xl text-white font-semibold" style="background:#25D366">${waIcon()}Konfirmasi via WhatsApp</a>` : ''}
      <a href="${storePath(username)}" class="inline-block mt-3 ml-2 px-4 py-3 rounded-xl border bg-white text-sm font-semibold">Kembali ke Toko</a>
    </div>`
    : '';
  const cover = p.image_url
    ? `<img src="${esc(p.image_url)}" class="w-full h-72 object-cover" alt="${esc(p.name)}" />`
    : `<div class="w-full h-72 relative">${imgCover(t)}<span class="absolute inset-x-0 bottom-4 text-center text-sm text-stone-500">Tidak ada foto produk</span></div>`;
  // Tombol WA membawa pesan yang sudah menyebut nama paket.
  const waInquiry = `https://wa.me/${esc(waDigits(store.whatsapp_number))}?text=${encodeURIComponent(`Halo, saya mau tanya paket ${p.name} di ${store.store_name}.`)}`;
  return `<main class="max-w-3xl mx-auto px-4 py-8">
    ${storeMiniHeader(store)}
    ${success}
    <div class="bg-white border border-stone-200 rounded-2xl overflow-hidden mt-4">
      ${cover}
      <div class="p-5">
        <div class="flex flex-wrap items-start justify-between gap-2"><h1 class="text-2xl font-bold">${esc(p.name)}</h1><span class="text-2xl font-extrabold" style="color:${t.main}">${priceLabel(p.price)}</span></div>
        <div class="flex gap-2 mt-2 text-xs"><span class="px-2 py-1 rounded-full bg-stone-100">${esc(p.category)}</span>${p.collection && p.collection !== p.category ? `<span class="px-2 py-1 rounded-full bg-stone-100">${esc(p.collection)}</span>` : ''}<span class="px-2 py-1 rounded-full bg-stone-100">${p.stock > 0 ? `Kuota ${p.stock}` : 'Pre-order'}</span></div>
        <p class="text-stone-600 mt-3">${esc(p.description)}</p>
        ${(p.highlights || []).length ? `<ul class="mt-3 space-y-1 text-sm">${p.highlights.map((h) => `<li>✓ ${esc(h)}</li>`).join('')}</ul>` : ''}
        <div class="flex flex-wrap gap-2 mt-5">
          ${store.whatsapp_number ? `<a href="${waInquiry}" target="_blank" rel="noopener" class="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold" style="background:#25D366">${waIcon()}Chat WhatsApp Agen</a>` : ''}
          <button type="button" data-action="share-product" class="px-5 py-3 rounded-xl bg-white border border-stone-300 font-semibold text-sm">🔗 Bagikan Produk Ini</button>
        </div>
      </div>
    </div>
    <form id="f-order" data-unit-price="${p.price}" data-username="${esc(username)}" class="bg-white border border-stone-200 rounded-2xl p-5 mt-4 space-y-4">
      <h2 class="font-bold">Pesan produk ini</h2><div id="err"></div>
      <input type="hidden" name="product_id" value="${esc(p.id)}" />
      ${field('Jumlah jamaah', `<input type="number" name="quantity" min="1" max="${p.stock > 0 ? p.stock : 99}" value="1" class="${inputCls}" />`)}
      ${field('Nama kamu *', `<input required name="customer_name" maxlength="120" class="${inputCls}" placeholder="Nama lengkap" />`)}
      ${field('No. WhatsApp kamu *', `<input required name="customer_phone" maxlength="20" class="${inputCls}" placeholder="0812xxxxxx" />`)}
      ${field('Alamat domisili *', `<textarea required name="customer_address" maxlength="500" rows="2" class="${inputCls}" placeholder="Kota domisili, mis. Gresik, Jawa Timur"></textarea>`)}
      ${field('Metode pembayaran', `<select name="payment_method" class="${inputCls}"><option value="whatsapp">WhatsApp (konfirmasi manual)</option><option value="transfer">Transfer bank</option><option value="cod">COD (Bayar di Tempat)</option></select>`)}
      ${field('Catatan (opsional)', `<input name="notes" maxlength="500" class="${inputCls}" placeholder="Contoh: berangkat berdua dengan istri" />`)}
      <div class="flex items-center justify-between border-t border-stone-100 pt-3"><span class="text-sm text-stone-600">Total (<span id="qty-label">1</span> × ${priceLabel(p.price)})</span><span id="total-label" class="text-xl font-extrabold">${priceLabel(p.price)}</span></div>
      <button class="w-full py-3 rounded-xl text-white font-semibold" style="background:${t.main}">Pesan Sekarang</button>
      <p class="text-xs text-stone-500 text-center">Order dicatat di toko, lalu kamu konfirmasi ke penjual via WhatsApp. Pembayaran manual via WhatsApp / COD / Transfer.</p>
    </form>
    ${others}
    ${storeFooter(store)}
  </main>`;
}

export function bindProduct() {
  const shareBtn = document.querySelector('[data-action="share-product"]');
  shareBtn?.addEventListener('click', async () => {
    const url = location.href;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      ok = false;
    }
    if (!ok) {
      window.prompt('Salin link produk ini:', url);
      return;
    }
    const prev = shareBtn.textContent;
    shareBtn.textContent = '✓ Link disalin!';
    setTimeout(() => { shareBtn.textContent = prev; }, 2000);
  });
  const form = document.getElementById('f-order');
  if (!form) return;
  const qty = form.querySelector('[name="quantity"]');
  const unit = Number(form.dataset.unitPrice || 0);
  qty?.addEventListener('input', () => {
    const q = Math.max(1, Number(qty.value) || 1);
    document.getElementById('qty-label').textContent = String(q);
    document.getElementById('total-label').textContent = priceLabel(q * unit);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const username = form.dataset.username;
    try {
      const r = await api(`/api/stores/${username}/orders`, {
        method: 'POST',
        body: JSON.stringify({ ...Object.fromEntries(fd), quantity: Number(fd.get('quantity')) }),
      });
      go(`${storePath(username, String(fd.get('product_id')))}?done=1&wa=${encodeURIComponent(r.whatsapp_url)}`);
    } catch (err) {
      setErr('err', err.message);
    }
  });
}
