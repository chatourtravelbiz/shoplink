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
const CAN_POST = () => ['super_admin', 'admin'].includes(roleOf());
let currentPosts = [];
let editingPost = null;

function postPreviewHtml(content) {
  return String(content || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const head = p.match(/^(#{2,3})\s+(.+)$/);
      if (head) return `<h3 class="font-bold mt-3">${esc(head[2].trim())}</h3>`;
      return `<p>${esc(p)}</p>`;
    })
    .join('');
}

function postForm(p) {
  const v = p || { slug: '', title: '', excerpt: '', content: '', cover_url: '', category: 'Info', status: 'draft', meta_description: '' };
  return `<form id="f-post" class="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 mt-4">
    <h2 class="font-bold">${p ? 'Edit artikel' : 'Tulis artikel baru'}</h2><div id="post-err"></div>
    <div class="grid sm:grid-cols-2 gap-4">
      <div><label class="text-sm font-medium text-stone-700">Judul *</label><input required name="title" value="${esc(v.title)}" class="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /></div>
      <div><label class="text-sm font-medium text-stone-700">Slug *</label><input required name="slug" value="${esc(v.slug)}" pattern="[a-z0-9]+(-[a-z0-9]+)*" class="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /><span class="text-xs text-stone-500">Huruf kecil, angka, dan strip. URL: /blog/<span id="slug-preview">${esc(v.slug || 'slug-artikel')}</span></span></div>
      <div><label class="text-sm font-medium text-stone-700">Kategori</label><input name="category" value="${esc(v.category)}" class="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /></div>
      <div><label class="text-sm font-medium text-stone-700">Status</label><select name="status" class="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"><option value="draft"${v.status === 'draft' ? ' selected' : ''}>Draft</option><option value="published"${v.status === 'published' ? ' selected' : ''}>Terbit</option></select></div>
    </div>
    <div><label class="text-sm font-medium text-stone-700">Gambar sampul (URL)</label><input name="cover_url" value="${esc(v.cover_url)}" placeholder="https://..." class="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /></div>
    <div><label class="text-sm font-medium text-stone-700">Ringkasan (excerpt)</label><textarea name="excerpt" rows="2" class="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm">${esc(v.excerpt)}</textarea></div>
    <div><label class="text-sm font-medium text-stone-700">Meta description (SEO)</label><input name="meta_description" value="${esc(v.meta_description)}" class="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" /></div>
    <div><label class="text-sm font-medium text-stone-700">Isi artikel *</label><textarea required name="content" rows="10" class="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm">${esc(v.content)}</textarea><span class="text-xs text-stone-500">Satu paragraf per blok — pisahkan paragraf dengan baris kosong. Baris diawali <code>##</code> jadi subjudul (muncul di Daftar Isi).</span></div>
    <div><span class="text-sm font-medium text-stone-700">Pratinjau isi</span><div id="post-preview" class="mt-1 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm space-y-3">${postPreviewHtml(v.content)}</div></div>
    <div class="flex gap-2">
      <button class="px-4 py-2 rounded-xl bg-red-700 text-white font-semibold">${p ? 'Simpan Perubahan' : 'Simpan Artikel'}</button>
      <button type="button" data-action="admin-cancel-post" class="px-4 py-2 rounded-xl border">Batal</button>
    </div>
  </form>`;
}

function postsTable(posts) {
  const rows = posts.map((p) => `<tr class="border-t border-stone-100">
    <td class="py-2 pr-2 pl-4"><div class="font-semibold">${esc(p.title)}</div><div class="text-xs text-stone-500">/blog/${esc(p.slug)} · ${esc(p.category)}</div></td>
    <td class="py-2 pr-2">${p.status === 'published'
      ? '<span class="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Terbit</span>'
      : '<span class="px-2 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold">Draft</span>'}</td>
    <td class="py-2 text-xs text-stone-500">${esc((p.published_at || p.created_at || '').slice(0, 10))}</td>
    <td class="py-2 text-right whitespace-nowrap">
      ${p.status === 'published' ? `<a href="https://chatourtravel.com/blog/${esc(p.slug)}" target="_blank" rel="noopener" class="px-3 py-1 rounded-lg bg-white border text-sm inline-block">Lihat</a>` : ''}
      ${CAN_POST() ? `<button data-action="admin-edit-post" data-id="${esc(p.id)}" class="px-3 py-1 rounded-lg border text-sm">Edit</button><button data-action="admin-delete-post" data-id="${esc(p.id)}" class="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-sm">Hapus</button>` : ''}
    </td>
  </tr>`).join('');
  return `<div class="flex flex-wrap items-center justify-between gap-2">
    <p class="text-sm text-stone-600">${posts.length} artikel · tampil di <a class="text-red-700 underline" href="https://chatourtravel.com/blog" target="_blank" rel="noopener">chatourtravel.com/blog</a></p>
    ${CAN_POST() ? '<button data-action="admin-new-post" class="px-4 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold">+ Artikel Baru</button>' : '<p class="text-xs text-stone-500">Role kamu hanya bisa melihat artikel.</p>'}
  </div>
  <div id="post-form-wrap" class="mt-2"></div>
  <div class="bg-white border border-stone-200 rounded-2xl overflow-x-auto mt-4"><table class="w-full text-sm min-w-[560px]"><thead><tr class="text-left text-stone-500"><th class="py-2 pr-2 pl-4">Artikel</th><th class="py-2 pr-2">Status</th><th class="py-2 pr-2">Tanggal</th><th></th></tr></thead><tbody>${rows || '<tr><td class="py-6 text-center text-stone-500" colspan="4">Belum ada artikel.</td></tr>'}</tbody></table></div>`;
}

function roleOf() {
  return state.session?.user?.role ?? 'merchant';
}

function tabBtn(tab, current, label) {
  const on = tab === current;
  return `<button data-action="admin-tab" data-tab="${tab}" class="px-4 py-2 rounded-full text-sm border ${on ? 'bg-red-700 text-white font-semibold border-red-700' : 'bg-white'}">${label}</button>`;
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
  const canDomain = ['super_admin', 'admin'].includes(roleOf());
  const rows = stores.map((s) => `<tr class="border-t border-stone-100 align-top">
    <td class="py-2 pr-2 pl-4"><div class="font-semibold">${esc(s.store_name)}</div><div class="text-xs text-stone-500">@${esc(s.username)} · ${esc(s.email)}</div><a href="/${esc(s.username)}" class="text-xs text-red-700 underline">chatourtravel.com/${esc(s.username)}</a></td>
    <td class="py-2 pr-2">${s.status === 'suspended'
      ? '<span class="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">Suspended</span>'
      : '<span class="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Aktif</span>'}</td>
    <td class="py-2 pr-2">${s.custom_domain
      ? `<a href="https://${esc(s.custom_domain)}" target="_blank" rel="noopener" class="text-sm font-semibold text-red-700 underline">${esc(s.custom_domain)}</a>`
      : '<span class="text-sm text-stone-400">—</span>'}
      ${s.custom_domain_request ? `<div class="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-sm">
        <span class="font-semibold">Diajukan:</span> ${esc(s.custom_domain_request)}
        ${canDomain ? `<span class="inline-flex gap-1 ml-1">
          <button data-action="admin-domain-approve" data-id="${esc(s.username)}" class="px-2 py-0.5 rounded bg-red-700 text-white text-xs font-semibold">Pasang</button>
          <button data-action="admin-domain-reject" data-id="${esc(s.username)}" class="px-2 py-0.5 rounded bg-white border text-xs">Tolak</button>
        </span>` : ''}
      </div>` : ''}
      ${canDomain ? `<div class="flex flex-wrap gap-1 mt-1">
        <input data-domain-input="${esc(s.username)}" value="${esc(s.custom_domain || '')}" placeholder="agenku.com" class="w-40 rounded-lg border border-stone-300 px-2 py-1 text-sm" />
        <button data-action="admin-domain-save" data-id="${esc(s.username)}" class="px-2 py-1 rounded-lg bg-red-700 text-white text-sm font-semibold">Simpan Domain</button>
        ${s.custom_domain ? `<button data-action="admin-domain-check" data-id="${esc(s.username)}" class="px-2 py-1 rounded-lg bg-white border text-sm">Periksa Status</button>
        <button data-action="admin-domain-dns" data-id="${esc(s.username)}" data-domain="${esc(s.custom_domain)}" class="px-2 py-1 rounded-lg bg-white border text-sm">Instruksi DNS</button>
        <button data-action="admin-domain-remove" data-id="${esc(s.username)}" class="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-sm">Lepas</button>` : ''}
      </div>` : ''}</td>
    <td class="py-2 text-right whitespace-nowrap">
      ${canSuspend ? `<button data-action="admin-toggle-store" data-id="${esc(s.username)}" data-status="${esc(s.status)}" class="px-3 py-1 rounded-lg bg-white border text-sm">${s.status === 'suspended' ? 'Aktifkan' : 'Suspend'}</button>` : ''}
      <a href="/${esc(s.username)}" class="px-3 py-1 rounded-lg bg-white border text-sm inline-block">Lihat</a>
      ${canDelete ? `<button data-action="admin-delete-store" data-id="${esc(s.username)}" class="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-sm">Hapus</button>` : ''}
    </td>
  </tr>`).join('');
  return `<div class="bg-white border border-stone-200 rounded-2xl overflow-x-auto"><table class="w-full text-sm min-w-[720px]"><thead><tr class="text-left text-stone-500"><th class="py-2 pr-2 pl-4">Toko</th><th class="py-2 pr-2">Status</th><th class="py-2 pr-2">Domain Kustom</th><th></th></tr></thead><tbody>${rows || '<tr><td class="py-6 text-center text-stone-500" colspan="4">Belum ada toko.</td></tr>'}</tbody></table></div>
  <div id="domain-panel" class="mt-4"></div>
  <p class="text-xs text-stone-500 mt-2">Toko yang di-suspend tidak tampil di storefront publik dan tidak bisa menerima order. Domain kustom hanya bisa dipasang Super Admin / Admin; alamat chatourtravel.com/:username tetap jalan sebagai cadangan.</p>`;
}

/** Panel instruksi DNS + status untuk satu domain kustom. */
export function showDomainDns(username, domain, check) {
  const panel = document.getElementById('domain-panel');
  if (!panel) return;
  const statusHtml = check
    ? `<p class="mt-3 text-sm font-semibold ${check.ok ? 'text-green-700' : 'text-amber-700'}">${esc(check.ok ? '✓ ' : '')}${esc(check.message)}</p>`
    : '';
  panel.innerHTML = `<div class="bg-white border border-stone-200 rounded-2xl p-5">
    <h3 class="font-bold">Domain kustom @${esc(username)}: ${esc(domain)}</h3>
    <p class="text-sm text-stone-600 mt-1">Langkah 1 — agen memasang DNS di domainnya:</p>
    <div class="overflow-x-auto mt-2"><table class="w-full text-sm border border-stone-200 rounded-xl overflow-hidden"><thead><tr class="bg-stone-50 text-left text-stone-500"><th class="px-3 py-2">Tipe</th><th class="px-3 py-2">Nama / Host</th><th class="px-3 py-2">Target</th></tr></thead>
    <tbody><tr class="border-t"><td class="px-3 py-2 font-mono">CNAME</td><td class="px-3 py-2 font-mono">@</td><td class="px-3 py-2 font-mono">shoplink-d1.chatourtravelbiz.workers.dev</td></tr></tbody></table></div>
    <p class="text-xs text-stone-500 mt-2">Untuk subdomain (mis. toko.agenku.com), isi Nama/Host dengan <code>toko</code> saja. Bila penyedia DNS tidak menerima CNAME di @, pakai CNAME di <code>www</code> lalu beri tahu Muse.</p>
    <p class="text-sm text-stone-600 mt-3">Langkah 2 — <b>manual, oleh Muse</b>: aktifkan domain di Cloudflare (Workers Custom Domains). Setelah itu domain baru melayani toko.</p>
    <p class="text-sm text-stone-600 mt-1">Langkah 3 — tekan tombol di bawah untuk memeriksa apakah domain sudah menampilkan toko ini. Alamat lama <a class="text-red-700 underline" href="/${esc(username)}">chatourtravel.com/${esc(username)}</a> tetap jalan.</p>
    ${statusHtml}
    <div class="flex gap-2 mt-3"><button data-action="admin-domain-check" data-id="${esc(username)}" class="px-4 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold">Periksa Status</button></div>
  </div>`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export async function adminSaveDomain(username, render) {
  const input = document.querySelector(`[data-domain-input="${username}"]`);
  const errEl = document.getElementById('admin-err');
  try {
    const res = await api(`/api/admin/stores/${username}/custom-domain`, {
      method: 'PUT', body: JSON.stringify({ custom_domain: input?.value || '' }),
    });
    await render();
    showDomainDns(username, res.custom_domain);
  } catch (e) {
    if (errEl) errEl.innerHTML = errorBox(e.message);
  }
}

export async function adminRemoveDomain(username, render) {
  if (!window.confirm(`Lepas domain kustom dari toko @${username}? Toko tetap jalan di chatourtravel.com/${username}.`)) return;
  const errEl = document.getElementById('admin-err');
  try {
    await api(`/api/admin/stores/${username}/custom-domain`, { method: 'DELETE' });
    await render();
  } catch (e) {
    if (errEl) errEl.innerHTML = errorBox(e.message);
  }
}

export async function adminCheckDomain(username) {
  const errEl = document.getElementById('admin-err');
  try {
    const res = await api(`/api/admin/stores/${username}/custom-domain/check`);
    showDomainDns(username, res.domain, res);
  } catch (e) {
    if (errEl) errEl.innerHTML = errorBox(e.message);
  }
}

export async function adminApproveDomain(username, render) {
  const errEl = document.getElementById('admin-err');
  try {
    const res = await api(`/api/admin/stores/${username}/custom-domain/approve`, { method: 'POST' });
    await render();
    showDomainDns(username, res.custom_domain);
  } catch (e) {
    if (errEl) errEl.innerHTML = errorBox(e.message);
  }
}

export async function adminRejectDomain(username, render) {
  const errEl = document.getElementById('admin-err');
  try {
    await api(`/api/admin/stores/${username}/custom-domain/reject`, { method: 'POST' });
    await render();
  } catch (e) {
    if (errEl) errEl.innerHTML = errorBox(e.message);
  }
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
    return `${topbar('admin')}<main class="max-w-3xl mx-auto px-4 py-10 text-center"><h1 class="text-xl font-bold">Admin Platform</h1><p class="text-stone-600 text-sm mt-2">Silakan masuk dulu dengan akun admin.</p><a href="/login" class="inline-block mt-4 px-4 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold">Masuk</a></main>`;
  }
  const tab = new URLSearchParams(location.search).get('tab') || 'users';
  let data;
  try {
    const [overview, users, stores, orders, posts] = await Promise.all([
      api('/api/admin/overview'),
      api('/api/admin/users'),
      api('/api/admin/stores'),
      api('/api/admin/orders'),
      api('/api/admin/posts'),
    ]);
    data = { overview, users: users.users, stores: stores.stores, orders: orders.orders };
    currentPosts = posts.posts || [];
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
      : tab === 'posts' ? postsTable(currentPosts)
        : usersTable(data.users, roleOf() === 'super_admin');
  return `${topbar('admin')}
  <main class="max-w-5xl mx-auto px-4 py-8">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div><h1 class="text-2xl font-extrabold">Admin Platform</h1><p class="text-sm text-stone-600 mt-1">Masuk sebagai <b>${esc(state.session.user.email)}</b> · role <b>${esc(ROLE_LABEL[roleOf()] || roleOf())}</b></p></div>
      <a href="https://chatourtravel.com/blog" target="_blank" rel="noopener" class="px-3 py-2 rounded-xl bg-white border text-sm font-semibold">Lihat Blog ↗</a>
    </div>
    <div id="admin-err"></div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">${cards}</div>
    <div class="flex flex-wrap gap-2 mt-6">
      ${tabBtn('users', tab, `Users (${t.users})`)}
      ${tabBtn('stores', tab, `Toko (${t.stores})`)}
      ${tabBtn('orders', tab, `Order (${t.orders})`)}
      ${tabBtn('posts', tab, `Blog (${currentPosts.length})`)}
    </div>
    <div class="mt-4">${body}</div>
  </main>`;
}

/** Buka form artikel baru / edit di tab Blog. */
export function openPostForm(id, render) {
  editingPost = id ? currentPosts.find((p) => p.id === id) || null : null;
  const wrap = document.getElementById('post-form-wrap');
  if (wrap) {
    wrap.innerHTML = postForm(editingPost);
    bindPostForm(render);
    wrap.scrollIntoView({ behavior: 'smooth' });
  }
}

export function cancelPostForm() {
  editingPost = null;
  const wrap = document.getElementById('post-form-wrap');
  if (wrap) wrap.innerHTML = '';
}

export async function deletePostById(id, render) {
  const p = currentPosts.find((x) => x.id === id);
  if (!p) return;
  if (!window.confirm(`Hapus artikel "${p.title}"?`)) return;
  try {
    await api(`/api/admin/posts/${id}`, { method: 'DELETE' });
    await render();
  } catch (e) {
    const errEl = document.getElementById('admin-err');
    if (errEl) errEl.innerHTML = errorBox(e.message);
  }
}

/** Submit + pratinjau langsung untuk form artikel (dipanggil saat form dirender). */
export function bindPostForm(render) {
  const form = document.getElementById('f-post');
  if (!form) return;
  const content = form.querySelector('[name="content"]');
  const preview = document.getElementById('post-preview');
  const slugInput = form.querySelector('[name="slug"]');
  const slugPrev = document.getElementById('slug-preview');
  content?.addEventListener('input', () => { if (preview) preview.innerHTML = postPreviewHtml(content.value); });
  slugInput?.addEventListener('input', () => { if (slugPrev) slugPrev.textContent = slugInput.value || 'slug-artikel'; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('post-err');
    try {
      const payload = Object.fromEntries(new FormData(form));
      if (editingPost) await api(`/api/admin/posts/${editingPost.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/api/admin/posts', { method: 'POST', body: JSON.stringify(payload) });
      editingPost = null;
      await render();
    } catch (err) {
      if (errEl) errEl.innerHTML = errorBox(err.message);
    }
  });
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
