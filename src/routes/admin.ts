// Admin platform — /api/admin/* (RBAC, dicek di server via requireAdmin).
// super_admin: semua + atur role. admin: kelola user/toko/order, tanpa atur
// role & tanpa hapus super_admin. moderator: lihat + suspend toko.
// support: lihat saja. merchant: 403 di semua endpoint di sini.
import { Hono } from 'hono';
import type { App, OrderRow, StoreRow, UserRow } from '../types';
import { dayStr, err, jsonBody } from '../lib/http';
import { publicOrder, publicStore } from '../lib/db';
import { logAudit, requireAdmin, type AdminRole } from '../lib/rbac';
import { isRole, isStoreStatus, str } from '../lib/validation';

export const adminRoutes: App = new Hono();

const ALL_ADMIN: AdminRole[] = ['super_admin', 'admin', 'moderator', 'support'];
const MANAGE: AdminRole[] = ['super_admin', 'admin', 'moderator'];
const DELETE_ROLES: AdminRole[] = ['super_admin', 'admin'];

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
