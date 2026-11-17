// Admin platform — /api/admin/* (RBAC, dicek di server via requireAdmin).
// super_admin: semua + atur role. admin: kelola user/toko/order, tanpa atur
// role & tanpa hapus super_admin. moderator: lihat + suspend toko.
// support: lihat saja. merchant: 403 di semua endpoint di sini.
import { Hono } from 'hono';
import type { App, OrderRow, PostRow, StoreRow, UserRow } from '../types';
import { dayStr, err, jsonBody } from '../lib/http';
import { getStoreByUsername, publicOrder, publicPost, publicStore } from '../lib/db';
import { domainError, normalizeDomain } from '../lib/domain';
import { logAudit, requireAdmin, type AdminRole } from '../lib/rbac';
import { isPostStatus, isRole, isSlug, isStoreStatus, str } from '../lib/validation';
import { newId } from '../lib/crypto';

export const adminRoutes: App = new Hono();

const ALL_ADMIN: AdminRole[] = ['super_admin', 'admin', 'moderator', 'support'];
const MANAGE: AdminRole[] = ['super_admin', 'admin', 'moderator'];
const DELETE_ROLES: AdminRole[] = ['super_admin', 'admin'];
const DOMAIN_MANAGE: AdminRole[] = ['super_admin', 'admin'];
const POST_MANAGE: AdminRole[] = ['super_admin', 'admin'];

function parsePostInput(body: Record<string, unknown> | null) {
  if (!body) return null;
  const slug = str(body.slug, 120).toLowerCase();
  const status = str(body.status, 20) || 'draft';
  if (!isSlug(slug) || !isPostStatus(status)) return null;
  return {
    slug,
    title: str(body.title, 200),
    excerpt: str(body.excerpt, 500),
    content: str(body.content, 100000),
    cover_url: str(body.cover_url, 500),
    category: str(body.category, 60) || 'Info',
    status,
    meta_description: str(body.meta_description, 300),
  };
}

function publicAdminUser(u: UserRow) {
  return {
    id: u.id, email: u.email, username: u.username, role: u.role ?? 'merchant',
    first_name: u.first_name, last_name: u.last_name,
    whatsapp_number: u.whatsapp_number, created_at: u.created_at,
  };
}

adminRoutes.get('/admin/overview', async (c) => {
  const me = await requireAdmin(c, ALL_ADMIN);
  if (me instanceof Response) return me;
  const totals = await c.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM stores) AS stores,
       (SELECT COUNT(*) FROM products) AS products,
       (SELECT COUNT(*) FROM orders) AS orders,
       (SELECT COALESCE(SUM(revenue), 0) FROM orders WHERE status != 'cancelled') AS revenue,
       (SELECT COUNT(*) FROM stores WHERE status = 'suspended') AS suspended`,
  ).first<{ users: number; stores: number; products: number; orders: number; revenue: number; suspended: number }>();
  const chart: Array<{ date: string; label: string; orders: number; revenue: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = dayStr(d);
    const row = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n, COALESCE(SUM(revenue), 0) AS r FROM orders WHERE substr(date, 1, 10) = ?1 AND status != 'cancelled'",
    ).bind(ds).first<{ n: number; r: number }>();
    chart.push({
      date: ds, label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      orders: row?.n ?? 0, revenue: row?.r ?? 0,
    });
  }
  return c.json({ totals: totals ?? { users: 0, stores: 0, products: 0, orders: 0, revenue: 0, suspended: 0 }, chart });
});

adminRoutes.get('/admin/users', async (c) => {
  const me = await requireAdmin(c, ALL_ADMIN);
  if (me instanceof Response) return me;
  const q = str(c.req.query('q'), 60);
  const rows = q
    ? await c.env.DB.prepare(
        'SELECT * FROM users WHERE email LIKE ?1 OR username LIKE ?1 ORDER BY created_at DESC LIMIT 100',
      ).bind(`%${q}%`).all<UserRow>()
    : await c.env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 100').all<UserRow>();
  return c.json({ users: (rows.results ?? []).map(publicAdminUser) });
});

adminRoutes.patch('/admin/users/:id/role', async (c) => {
  const me = await requireAdmin(c, ['super_admin']);
  if (me instanceof Response) return me;
  const role = str((await jsonBody(c))?.role, 20);
  if (!isRole(role)) return err(c, 400, 'Role tidak valid.');
  const id = c.req.param('id');
  if (id === me.id) return err(c, 400, 'Tidak bisa mengubah role sendiri.');
  const target = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?1').bind(id).first<UserRow>();
  if (!target) return err(c, 404, 'User tidak ditemukan.');
  await c.env.DB.prepare('UPDATE users SET role = ?1 WHERE id = ?2').bind(role, id).run();
  await logAudit(c.env, me.id, `role:${role}`, 'user', id);
  return c.json({ ok: true });
});

adminRoutes.get('/admin/stores', async (c) => {
  const me = await requireAdmin(c, ALL_ADMIN);
  if (me instanceof Response) return me;
  const rows = await c.env.DB.prepare('SELECT * FROM stores ORDER BY username ASC LIMIT 200').all<StoreRow>();
  return c.json({ stores: (rows.results ?? []).map(publicStore) });
});

adminRoutes.patch('/admin/stores/:id/status', async (c) => {
  const me = await requireAdmin(c, MANAGE);
  if (me instanceof Response) return me;
  const status = str((await jsonBody(c))?.status, 20);
  if (!isStoreStatus(status)) return err(c, 400, 'Status harus: active atau suspended.');
  const username = c.req.param('id').toLowerCase();
  const res = await c.env.DB.prepare('UPDATE stores SET status = ?1 WHERE username = ?2')
    .bind(status, username).run();
  if ((res.meta?.changes ?? 0) === 0) return err(c, 404, 'Toko tidak ditemukan.');
  await logAudit(c.env, me.id, `store:${status}`, 'store', username);
  return c.json({ ok: true });
});

// --- Custom domain agen (super_admin + admin). ---
// Worker TIDAK punya token API Cloudflare, jadi pemasangan domain di sisi
// Cloudflare tetap langkah manual oleh Muse (Workers Custom Domains API).
// Endpoint di sini hanya menyimpan domain di D1 + memverifikasi hasilnya.
adminRoutes.put('/admin/stores/:username/custom-domain', async (c) => {
  const me = await requireAdmin(c, DOMAIN_MANAGE);
  if (me instanceof Response) return me;
  const username = c.req.param('username').toLowerCase();
  const domain = normalizeDomain((await jsonBody(c))?.custom_domain);
  const bad = domainError(domain);
  if (bad) return err(c, 400, bad);
  const store = await getStoreByUsername(c.env, username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  const clash = await c.env.DB.prepare(
    'SELECT username FROM stores WHERE custom_domain = ?1 AND username != ?2',
  ).bind(domain, username).first<{ username: string }>();
  if (clash) return err(c, 409, `Domain sudah dipakai toko @${clash.username}.`);
  try {
    await c.env.DB.prepare('UPDATE stores SET custom_domain = ?1 WHERE username = ?2')
      .bind(domain, username).run();
  } catch {
    return err(c, 409, 'Domain sudah dipakai toko lain.');
  }
  await logAudit(c.env, me.id, 'store:custom-domain:set', 'store', username);
  return c.json({ ok: true, custom_domain: domain });
});

adminRoutes.delete('/admin/stores/:username/custom-domain', async (c) => {
  const me = await requireAdmin(c, DOMAIN_MANAGE);
  if (me instanceof Response) return me;
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  await c.env.DB.prepare('UPDATE stores SET custom_domain = NULL WHERE username = ?1')
    .bind(username).run();
  await logAudit(c.env, me.id, 'store:custom-domain:remove', 'store', username);
  return c.json({ ok: true });
});

adminRoutes.get('/admin/stores/:username/custom-domain/check', async (c) => {
  const me = await requireAdmin(c, ALL_ADMIN);
  if (me instanceof Response) return me;
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  const domain = (store.custom_domain ?? '').toLowerCase();
  if (!domain) return err(c, 400, 'Toko ini belum punya domain kustom.');
  // Hanya domain yang tersimpan di D1 yang boleh dicek — bukan URL bebas (anti-SSRF).
  let status: 'active' | 'not-attached' | 'unreachable';
  let message: string;
  try {
    const res = await fetch(`https://${domain}/`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'ChatourTravel-domain-check/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    const html = (await res.text().catch(() => '')).toLowerCase();
    const servesStore = res.status === 200
      && html.includes('window.__custom_store__')
      && html.includes(`"${username}"`);
    if (servesStore) {
      status = 'active';
      message = 'Domain sudah aktif dan menampilkan toko ini.';
    } else {
      status = 'not-attached';
      message = 'Domain sudah bisa dijangkau, tapi belum menampilkan toko ini — domain belum dipasang di Cloudflare atau DNS belum mengarah ke Worker.';
    }
  } catch {
    status = 'unreachable';
    message = 'Domain belum bisa dijangkau — DNS (CNAME) belum dipasang atau belum tersebar. Pasang CNAME dulu, tunggu beberapa menit, lalu periksa lagi.';
  }
  return c.json({ ok: status === 'active', status, message, domain });
});

adminRoutes.get('/admin/orders', async (c) => {
  const me = await requireAdmin(c, ALL_ADMIN);
  if (me instanceof Response) return me;
  const rows = await c.env.DB.prepare(
    `SELECT o.*, p.name AS product_name FROM orders o
     LEFT JOIN products p ON p.store_username = o.store_username AND p.product_id = o.product_id
     ORDER BY o.date DESC, o.id DESC LIMIT 100`,
  ).all<OrderRow & { product_name: string | null }>();
  return c.json({ orders: (rows.results ?? []).map((r) => publicOrder(r, r.product_name ?? undefined)) });
});

adminRoutes.delete('/admin/stores/:id', async (c) => {
  const me = await requireAdmin(c, DELETE_ROLES);
  if (me instanceof Response) return me;
  const username = c.req.param('id').toLowerCase();
  const res = await c.env.DB.prepare('DELETE FROM stores WHERE username = ?1').bind(username).run();
  if ((res.meta?.changes ?? 0) === 0) return err(c, 404, 'Toko tidak ditemukan.');
  await logAudit(c.env, me.id, 'store:delete', 'store', username);
  return c.json({ ok: true });
});

adminRoutes.delete('/admin/users/:id', async (c) => {
  const me = await requireAdmin(c, DELETE_ROLES);
  if (me instanceof Response) return me;
  const id = c.req.param('id');
  if (id === me.id) return err(c, 400, 'Tidak bisa menghapus akun sendiri.');
  const target = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?1').bind(id).first<UserRow>();
  if (!target) return err(c, 404, 'User tidak ditemukan.');
  if ((target.role ?? 'merchant') === 'super_admin' && me.role !== 'super_admin') {
    return err(c, 403, 'Hanya super admin yang bisa menghapus super admin.');
  }
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(id).run();
  await logAudit(c.env, me.id, 'user:delete', 'user', id);
  return c.json({ ok: true });
});

// --- Blog / posts (dikelola admin, ditampilkan di company profile) ---
adminRoutes.get('/admin/posts', async (c) => {
  const me = await requireAdmin(c, ALL_ADMIN);
  if (me instanceof Response) return me;
  const rows = await c.env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC, id DESC LIMIT 200',
  ).all<PostRow>();
  return c.json({ posts: (rows.results ?? []).map(publicPost) });
});

adminRoutes.post('/admin/posts', async (c) => {
  const me = await requireAdmin(c, POST_MANAGE);
  if (me instanceof Response) return me;
  const p = parsePostInput(await jsonBody(c));
  if (!p || !p.title) return err(c, 400, 'Judul wajib diisi dan slug harus huruf kecil/angka/strip.');
  const now = new Date().toISOString();
  const id = newId('post');
  try {
    await c.env.DB.prepare(
      `INSERT INTO posts (id, slug, title, excerpt, content, cover_url, category, status, author_id, meta_description, created_at, updated_at, published_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
      .bind(id, p.slug, p.title, p.excerpt, p.content, p.cover_url, p.category, p.status, me.id, p.meta_description, now, now, p.status === 'published' ? now : null)
      .run();
  } catch {
    return err(c, 400, 'Slug sudah dipakai artikel lain.');
  }
  await logAudit(c.env, me.id, 'post:create', 'post', id);
  const row = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?1').bind(id).first<PostRow>();
  return c.json({ post: row ? publicPost(row) : null }, 201);
});

adminRoutes.patch('/admin/posts/:id', async (c) => {
  const me = await requireAdmin(c, POST_MANAGE);
  if (me instanceof Response) return me;
  const p = parsePostInput(await jsonBody(c));
  if (!p || !p.title) return err(c, 400, 'Judul wajib diisi dan slug harus huruf kecil/angka/strip.');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?1').bind(id).first<PostRow>();
  if (!existing) return err(c, 404, 'Artikel tidak ditemukan.');
  const now = new Date().toISOString();
  const publishedAt = p.status === 'published' ? (existing.published_at ?? now) : null;
  try {
    await c.env.DB.prepare(
      `UPDATE posts SET slug = ?1, title = ?2, excerpt = ?3, content = ?4, cover_url = ?5,
       category = ?6, status = ?7, meta_description = ?8, updated_at = ?9, published_at = ?10 WHERE id = ?11`,
    )
      .bind(p.slug, p.title, p.excerpt, p.content, p.cover_url, p.category, p.status, p.meta_description, now, publishedAt, id)
      .run();
  } catch {
    return err(c, 400, 'Slug sudah dipakai artikel lain.');
  }
  await logAudit(c.env, me.id, 'post:update', 'post', id);
  const row = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?1').bind(id).first<PostRow>();
  return c.json({ post: row ? publicPost(row) : null });
});

adminRoutes.delete('/admin/posts/:id', async (c) => {
  const me = await requireAdmin(c, POST_MANAGE);
  if (me instanceof Response) return me;
  const res = await c.env.DB.prepare('DELETE FROM posts WHERE id = ?1').bind(c.req.param('id')).run();
  if ((res.meta?.changes ?? 0) === 0) return err(c, 404, 'Artikel tidak ditemukan.');
  await logAudit(c.env, me.id, 'post:delete', 'post', c.req.param('id'));
  return c.json({ ok: true });
});
