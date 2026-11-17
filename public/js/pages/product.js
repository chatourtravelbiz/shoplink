// Detail produk publik + form order (WhatsApp / COD / Transfer).
import { api } from '../api.js';
import { esc, go, rupiah, themeOf } from '../utils.js';
import { waIcon } from '../icons.js';
import { errorBox, field, inputCls, setErr, topbar } from '../ui.js';

export async function viewProduct(username, productId) {
  let data;
  try {
    data = await api(`/api/stores/${username}/products/${productId}`);
  } catch (e) {
    return `${topbar()}<main class="max-w-3xl mx-auto px-4 py-10">${errorBox(e.message)}<a href="/${esc(username)}" class="text-red-700 underline text-sm">← Kembali ke toko</a></main>`;
  }
  const { store, product: p } = data;
  const t = themeOf(store.theme);
  const params = new URLSearchParams(location.search);
  const done = params.get('done');
  const wa = params.get('wa');
  const success = done
    ? `<div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 mb-5">
      <h2 class="font-bold text-emerald-800">✅ Order kamu tercatat!</h2>
      <p class="text-sm text-emerald-700 mt-1">Langkah terakhir: konfirmasi order ke penjual lewat WhatsApp supaya segera diproses.</p>
      ${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-2 mt-3 px-5 py-3 rounded-xl text-white font-semibold" style="background:#25D366">${waIcon()}Konfirmasi via WhatsApp</a>` : ''}
      <a href="/${esc(username)}" class="inline-block mt-3 ml-2 px-4 py-3 rounded-xl border bg-white text-sm font-semibold">Kembali ke Toko</a>
    </div>`
    : '';
  return `${topbar()}
  <main class="max-w-3xl mx-auto px-4 py-8">
    <a href="/${esc(username)}" class="text-sm text-stone-600">← ${esc(store.store_name)}</a>
    ${success}
    <div class="bg-white border border-stone-200 rounded-2xl overflow-hidden mt-4">
      <img src="${esc(p.image_url)}" class="w-full h-72 object-cover" alt="${esc(p.name)}" />
      <div class="p-5">
        <div class="flex flex-wrap items-start justify-between gap-2"><h1 class="text-2xl font-bold">${esc(p.name)}</h1><span class="text-2xl font-extrabold" style="color:${t.main}">${rupiah(p.price)}</span></div>
        <div class="flex gap-2 mt-2 text-xs"><span class="px-2 py-1 rounded-full bg-stone-100">${esc(p.category)}</span>${p.collection ? `<span class="px-2 py-1 rounded-full bg-stone-100">${esc(p.collection)}</span>` : ''}<span class="px-2 py-1 rounded-full bg-stone-100">${p.stock > 0 ? `Stok ${p.stock}` : 'Pre-order'}</span></div>
        <p class="text-stone-600 mt-3">${esc(p.description)}</p>
        ${(p.highlights || []).length ? `<ul class="mt-3 space-y-1 text-sm">${p.highlights.map((h) => `<li>✓ ${esc(h)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>
    <form id="f-order" data-unit-price="${p.price}" data-username="${esc(username)}" class="bg-white border border-stone-200 rounded-2xl p-5 mt-4 space-y-4">
      <h2 class="font-bold">Pesan produk ini</h2><div id="err"></div>
      <input type="hidden" name="product_id" value="${esc(p.id)}" />
      ${field('Jumlah', `<input type="number" name="quantity" min="1" max="${p.stock > 0 ? p.stock : 99}" value="1" class="${inputCls}" />`)}
      ${field('Nama kamu *', `<input required name="customer_name" maxlength="120" class="${inputCls}" placeholder="Nama lengkap" />`)}
      ${field('No. WhatsApp kamu *', `<input required name="customer_phone" maxlength="20" class="${inputCls}" placeholder="0812xxxxxx" />`)}
      ${field('Alamat pengiriman *', `<textarea required name="customer_address" maxlength="500" rows="2" class="${inputCls}" placeholder="Jalan, RT/RW, kota"></textarea>`)}
      ${field('Metode pembayaran', `<select name="payment_method" class="${inputCls}"><option value="whatsapp">WhatsApp (konfirmasi manual)</option><option value="cod">COD — bayar di tempat</option><option value="transfer">Transfer bank</option></select>`)}
      ${field('Catatan (opsional)', `<input name="notes" maxlength="500" class="${inputCls}" placeholder="Contoh: warna biru, ukuran L" />`)}
      <div class="flex items-center justify-between border-t border-stone-100 pt-3"><span class="text-sm text-stone-600">Total (<span id="qty-label">1</span> × ${rupiah(p.price)})</span><span id="total-label" class="text-xl font-extrabold">${rupiah(p.price)}</span></div>
      <button class="w-full py-3 rounded-xl text-white font-semibold" style="background:${t.main}">Pesan Sekarang</button>
      <p class="text-xs text-stone-500 text-center">Order dicatat di toko, lalu kamu konfirmasi ke penjual via WhatsApp. Tanpa pembayaran online.</p>
    </form>
  </main>`;
}

export function bindProduct() {
  const form = document.getElementById('f-order');
  if (!form) return;
  const qty = form.querySelector('[name="quantity"]');
  const unit = Number(form.dataset.unitPrice || 0);
  qty?.addEventListener('input', () => {
    const q = Math.max(1, Number(qty.value) || 1);
    document.getElementById('qty-label').textContent = String(q);
    document.getElementById('total-label').textContent = rupiah(q * unit);
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
      go(`/${username}/p/${fd.get('product_id')}?done=1&wa=${encodeURIComponent(r.whatsapp_url)}`);
    } catch (err) {
      setErr('err', err.message);
    }
  });
}
