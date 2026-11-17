// Admin platform — /admin. Data hanya dari /api/admin/* (RBAC di server);
// tampilan di sini hanya menyembunyikan tombol yang memang tidak boleh dipakai.
import { api, state } from '../api.js';
import { esc, rupiah, STATUS_LABEL } from '../utils.js';
import { errorBox, topbar } from '../ui.js';

const ROLES = ['super_admin', 'admin', 'moderator', 'support', 'merchant'];
const ROLE_LABEL = {
  super_admin: 'Super Admin', admin: 'Admin', moderator: 'Moderator',
  support: 'Support', merchant: 'Merchant',
};

function roleOf() {
  return state.session?.user?.role ?? 'merchant';
}

function tabBtn(tab, current, label) {
  const on = tab === current;
  return `<button data-action="admin-tab" data-tab="${tab}" class="px-4 py-2 rounded-full text-sm border ${on ? 'bg-emerald-600 text-white font-semibold border-emerald-600' : 'bg-white'}">${label}</button>`;
}

function usersTable(users, isSuper) {
  const rows = users.map((u) => `<tr class="border-t border-stone-100">
    <td class="py-2 pr-2"><div class="font-semibold">${esc(u.email)}</div><div class="text-xs text-stone-500">@${esc(u.username)} · ${esc(u.first_name || '')} ${esc(u.last_name || '')}</div></td>
    <td class="py-2 pr-2">${isSuper
      ? `<select data-role-user="${esc(u.id)}" class="rounded-lg border border-stone-300 px-2 py-1 text-sm bg-white">${ROLES.map((r) => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}</select>`
      : `<span class="text-sm">${esc(ROLE_LABEL[u.role] || u.role)}</span>`}</td>
    <td class="py-2 text-xs text-stone-500">${esc((u.created_at || '').slice(0, 10))}</td>
    <td class="py-2 text-right">${['super_admin', 'admin'].includes(roleOf()) && u.id !== state.session.user.id
      ? `<button data-action="admin-delete-user" data-id="${esc(u.id)}" class="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-sm">Hapus</button>` : ''}</td>
  </tr>`).join('');
  return `<div class="bg-white border border-stone-200 rounded-2xl overflow-x-auto"><table class="w-full text-sm min-w-[560px]"><thead><tr class="text-left text-stone-500"><th class="py-2 pr-2 pl-4">User</th><th class="py-2 pr-2">Role</th><th class="py-2 pr-2">Daftar</th><th></th></tr></thead><tbody>${rows || '<tr><td class="py-6 text-center text-stone-500" colspan="4">Belum ada user.</td></tr>'}</tbody></table></div>
  <p class="text-xs text-stone-500 mt-2">Ubah role hanya bisa dilakukan Super Admin. Menghapus user juga menghapus tokonya.</p>`;
}

function storesTable(stores) {
  const canSuspend = ['super_admin', 'admin', 'moderator'].includes(roleOf());
  const canDelete = ['super_admin', 'admin'].includes(roleOf());
  const rows = stores.map((s) => `<tr class="border-t border-stone-100">
    <td class="py-2 pr-2 pl-4"><div class="font-semibold">${esc(s.store_name)}</div><div class="text-xs text-stone-500">@${esc(s.username)} · ${esc(s.email)}</div></td>
    <td class="py-2 pr-2">${s.status === 'suspended'
      ? '<span class="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">Suspended</span>'
      : '<span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Aktif</span>'}</td>
    <td class="py-2 text-right whitespace-nowrap">
      ${canSuspend ? `<button data-action="admin-toggle-store" data-id="${esc(s.username)}" data-status="${esc(s.status)}" class="px-3 py-1 rounded-lg bg-white border text-sm">${s.status === 'suspended' ? 'Aktifkan' : 'Suspend'}</button>` : ''}
      <a href="/${esc(s.username)}" class="px-3 py-1 rounded-lg bg-white border text-sm inline-block">Lihat</a>
      ${canDelete ? `<button data-action="admin-delete-store" data-id="${esc(s.username)}" class="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-sm">Hapus</button>` : ''}
    </td>
  </tr>`).join('');
  return `<div class="bg-white border border-stone-200 rounded-2xl overflow-x-auto"><table class="w-full text-sm min-w-[560px]"><thead><tr class="text-left text-stone-500"><th class="py-2 pr-2 pl-4">Toko</th><th class="py-2 pr-2">Status</th><th></th></tr></thead><tbody>${rows || '<tr><td class="py-6 text-center text-stone-500" colspan="3">Belum ada toko.</td></tr>'}</tbody></table></div>
  <p class="text-xs text-stone-500 mt-2">Toko yang di-suspend tidak tampil di storefront publik dan tidak bisa menerima order.</p>`;
}

function ordersTable(orders) {
  const rows = orders.map((o) => `<tr class="border-t border-stone-100">
    <td class="py-2 pr-2 pl-4"><div class="font-semibold">${esc(o.product_name)}</div><div class="text-xs text-stone-500">@${esc(o.store_username)} · ${esc(o.customer_name)}</div></td>
    <td class="py-2 pr-2 text-sm">${o.quantity} × ${rupiah(o.revenue / Math.max(1, o.quantity))}</td>
    <td class="py-2 pr-2 font-semibold">${rupiah(o.revenue)}</td>
    <td class="py-2 pr-2 text-sm">${esc(STATUS_LABEL[o.status] || o.status)}</td>
    <td class="py-2 text-xs text-stone-500">${esc((o.date || '').slice(0, 10))}</td>
  </tr>`).join('');
  return `<div class="bg-white border border-stone-200 rounded-2xl overflow-x-auto"><table class="w-full text-sm min-w-[560px]"><thead><tr class="text-left text-stone-500"><th class="py-2 pr-2 pl-4">Order</th><th class="py-2 pr-2">Qty</th><th class="py-2 pr-2">Total</th><th class="py-2 pr-2">Status</th><th class="py-2">Tanggal</th></tr></thead><tbody>${rows || '<tr><td class="py-6 text-center text-stone-500" colspan="5">Belum ada order.</td></tr>'}</tbody></table></div>`;
}

export async function viewAdmin() {
  if (!state.session) {
    return `${topbar('admin')}<main class="max-w-3xl mx-auto px-4 py-10 text-center"><h1 class="text-xl font-bold">Admin Platform</h1><p class="text-stone-600 text-sm mt-2">Silakan masuk dulu dengan akun admin.</p><a href="/login" class="inline-block mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold">Masuk</a></main>`;
  }
  const tab = new URLSearchParams(location.search).get('tab') || 'users';
  let data;
  try {
    const [overview, users, stores, orders] = await Promise.all([
      api('/api/admin/overview'),
      api('/api/admin/users'),
      api('/api/admin/stores'),
      api('/api/admin/orders'),
    ]);
    data = { overview, users: users.users, stores: stores.stores, orders: orders.orders };
  } catch (e) {
    return `${topbar('admin')}<main class="max-w-5xl mx-auto px-4 py-10">${errorBox(e.message)}<p class="text-sm text-stone-600 mt-3">Halaman ini hanya untuk admin platform (Super Admin / Admin / Moderator / Support). Akun merchant tidak bisa masuk.</p></main>`;
  }
  const t = data.overview.totals;
  const cards = [
    ['👥 User', t.users], ['🏪 Toko', t.stores], ['📦 Produk', t.products],
    ['🧾 Order', t.orders], ['💰 Omzet', rupiah(t.revenue)], ['⛔ Suspended', t.suspended],
  ].map(([label, v]) => `<div class="bg-white border border-stone-200 rounded-2xl p-4"><div class="text-xs text-stone-500">${label}</div><div class="text-2xl font-extrabold mt-1">${typeof v === 'number' ? v.toLocaleString('id-ID') : esc(v)}</div></div>`).join('');
  const body = tab === 'stores' ? storesTable(data.stores)
    : tab === 'orders' ? ordersTable(data.orders)
      : usersTable(data.users, roleOf() === 'super_admin');
  return `${topbar('admin')}
  <main class="max-w-5xl mx-auto px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div><h1 class="text-2xl font-extrabold">Admin Platform</h1><p class="text-sm text-stone-600 mt-1">Masuk sebagai <b>${esc(state.session.user.email)}</b> · role <b>${esc(ROLE_LABEL[roleOf()] || roleOf())}</b></p></div>
    </div>
    <div id="admin-err"></div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">${cards}</div>
    <div class="flex flex-wrap gap-2 mt-6">
      ${tabBtn('users', tab, `Users (${t.users})`)}
      ${tabBtn('stores', tab, `Toko (${t.stores})`)}
      ${tabBtn('orders', tab, `Order (${t.orders})`)}
    </div>
    <div class="mt-4">${body}</div>
  </main>`;
}

/** Pasang listener ubah-role (change) bila select role ada di DOM. */
export function bindAdmin() {
  document.querySelectorAll('[data-role-user]').forEach((sel) => {
    sel.addEventListener('focus', () => { sel.dataset.prev = sel.value; });
    sel.addEventListener('change', async () => {
      const errEl = document.getElementById('admin-err');
      try {
        await api(`/api/admin/users/${sel.dataset.roleUser}/role`, {
          method: 'PATCH', body: JSON.stringify({ role: sel.value }),
        });
        if (errEl) errEl.innerHTML = '';
      } catch (e) {
        if (errEl) errEl.innerHTML = errorBox(e.message);
        sel.value = sel.dataset.prev || sel.value;
      }
    });
  });
}

export async function adminToggleStore(username, status, render) {
  const next = status === 'suspended' ? 'active' : 'suspended';
  try {
    await api(`/api/admin/stores/${username}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
    await render();
  } catch (e) {
    const errEl = document.getElementById('admin-err');
    if (errEl) errEl.innerHTML = errorBox(e.message);
  }
}

export async function adminDelete(kind, id, render) {
  const label = kind === 'user' ? 'user ini beserta tokonya' : 'toko ini beserta produk & ordernya';
  if (!window.confirm(`Hapus ${label}? Tindakan ini tidak bisa dibatalkan.`)) return;
  try {
    await api(`/api/admin/${kind === 'user' ? 'users' : 'stores'}/${id}`, { method: 'DELETE' });
    await render();
  } catch (e) {
    const errEl = document.getElementById('admin-err');
    if (errEl) errEl.innerHTML = errorBox(e.message);
  }
}
