// Dashboard merchant: metrik, grafik 7 hari, order terbaru + ubah status.
import { api, state } from '../api.js';
import { PAYMENT_LABEL, STATUS_CLASS, STATUS_LABEL, esc, go, rupiah } from '../utils.js';
import { errorBox, topbar } from '../ui.js';

export async function viewDashboard() {
  if (!state.session) {
    go('#/login');
    return '';
  }
  let data;
  try {
    data = await api('/api/dashboard');
  } catch (e) {
    return `${topbar('dashboard')}<main class="max-w-5xl mx-auto px-4 py-10">${errorBox(e.message)}</main>`;
  }
  const t = data.totals;
  const maxV = Math.max(1, ...data.chart.map((d) => d.views));
  const cards = [
    ['Omzet', rupiah(t.revenue), 'dari order yang tidak dibatalkan'],
    ['Order', t.orders, 'total order masuk'],
    ['Kunjungan', t.views, 'toko dilihat pembeli'],
    ['Klik', t.clicks, 'klik dari analitik'],
    ['Produk', t.products, 'produk di tokomu'],
  ]
    .map(([label, value, sub]) => `<div class="bg-white border border-stone-200 rounded-2xl p-4"><div class="text-xs uppercase tracking-wide text-stone-500">${label}</div><div class="text-2xl font-extrabold mt-1">${value}</div><div class="text-xs text-stone-500">${sub}</div></div>`)
    .join('');
  const bars = data.chart
    .map((d) => `<div class="flex-1 flex flex-col items-center gap-1">
      <div class="w-full flex items-end justify-center gap-1 h-24">
        <div class="bar w-3 sm:w-5 rounded-t bg-emerald-500" style="height:${Math.max(4, Math.round((d.views / maxV) * 100))}%" title="Kunjungan: ${d.views}"></div>
        <div class="bar w-3 sm:w-5 rounded-t bg-sky-400" style="height:${Math.max(4, Math.round((d.clicks / maxV) * 100))}%" title="Klik: ${d.clicks}"></div>
      </div>
      <div class="text-[11px] text-stone-500">${esc(d.label)}</div>
      <div class="text-[11px] text-stone-400">${d.orders} order</div>
    </div>`)
    .join('');
  const orders = data.recent_orders.length
    ? data.recent_orders
        .map((o) => `<tr class="border-t border-stone-100">
      <td class="py-2 pr-2"><div class="font-medium">${esc(o.product_name)}</div><div class="text-xs text-stone-500">${esc(o.customer_name)} · ${esc(o.customer_phone)}</div></td>
      <td class="py-2 pr-2 text-right">${o.quantity}×</td>
      <td class="py-2 pr-2 text-right font-medium">${rupiah(o.revenue)}</td>
      <td class="py-2 pr-2"><span class="text-xs px-2 py-1 rounded-full ${STATUS_CLASS[o.status] || ''}">${STATUS_LABEL[o.status] || o.status}</span><div class="text-xs text-stone-500 mt-1">${PAYMENT_LABEL[o.payment_method] || o.payment_method}</div></td>
      <td class="py-2"><select data-order-id="${esc(o.id)}" class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-1 bg-white text-sm">
        ${['pending', 'confirmed', 'completed', 'cancelled'].map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
      </select></td>
    </tr>`)
        .join('')
    : `<tr><td colspan="5" class="py-6 text-center text-stone-500 text-sm">Belum ada order. Bagikan link tokomu di bio Instagram!</td></tr>`;
  const top = data.top_products.length
    ? data.top_products.map((p) => `<li class="flex justify-between py-2 border-t border-stone-100 text-sm"><span>${esc(p.product_name)} <span class="text-stone-400">(${p.quantity} terjual)</span></span><span class="font-medium">${rupiah(p.revenue)}</span></li>`).join('')
    : '<li class="py-2 text-sm text-stone-500">Belum ada penjualan.</li>';
  return `${topbar('dashboard')}
  <main class="max-w-5xl mx-auto px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div><h1 class="text-2xl font-bold">Halo, ${esc(state.session.user.first_name || state.session.user.username)} 👋</h1>
      <p class="text-sm text-stone-600">Toko <b>${esc(state.session.store?.store_name || '')}</b> · <a class="text-emerald-700 underline" href="#/s/${esc(state.session.user.username)}">shoplink/s/${esc(state.session.user.username)}</a></p></div>
      <a href="#/products" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold">+ Tambah Produk</a>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">${cards}</div>
    <div class="grid sm:grid-cols-3 gap-4 mt-4">
      <div class="sm:col-span-2 bg-white border border-stone-200 rounded-2xl p-5">
        <h2 class="font-bold">Kunjungan 7 hari terakhir</h2>
        <p class="text-xs text-stone-500"><span class="text-emerald-600">■</span> Kunjungan &nbsp; <span class="text-sky-500">■</span> Klik</p>
        <div class="flex gap-1 mt-4">${bars}</div>
      </div>
      <div class="bg-white border border-stone-200 rounded-2xl p-5">
        <h2 class="font-bold">Produk terlaris</h2>
        <ul class="mt-2">${top}</ul>
      </div>
    </div>
    <div class="bg-white border border-stone-200 rounded-2xl p-5 mt-4 overflow-x-auto">
      <h2 class="font-bold mb-2">Order terbaru</h2>
      <table class="w-full text-sm min-w-[640px]"><thead><tr class="text-left text-stone-500 text-xs uppercase"><th class="py-1 pr-2">Produk / Pembeli</th><th class="py-1 pr-2 text-right">Jml</th><th class="py-1 pr-2 text-right">Total</th><th class="py-1 pr-2">Status</th><th class="py-1">Ubah Status</th></tr></thead><tbody>${orders}</tbody></table>
    </div>
  </main>`;
}

/** Dipanggil router setelah render; onRerender dipakai untuk refresh halaman. */
export function bindDashboard(onRerender) {
  document.querySelectorAll('select[data-order-id]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      try {
        await api(`/api/orders/${sel.dataset.orderId}`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
        onRerender();
      } catch (e) {
        alert(e.message);
        onRerender();
      }
    });
  });
}
