// GET /api/orders, PATCH /api/orders/:id — order milik toko sendiri (auth).
import { Hono } from 'hono';
import type { App, OrderRow } from '../types';
import { err, jsonBody } from '../lib/http';
import { getSessionUser } from '../lib/auth';
import { publicOrder } from '../lib/db';
import { isOrderStatus, str } from '../lib/validation';

export const ordersRoutes: App = new Hono();

ordersRoutes.get('/orders', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const rows = await c.env.DB.prepare(
    `SELECT o.*, p.name AS product_name FROM orders o
     LEFT JOIN products p ON p.store_username = o.store_username AND p.product_id = o.product_id
     WHERE o.store_username = ?1 ORDER BY o.date DESC, o.id DESC`,
  )
    .bind(user.username)
    .all<OrderRow & { product_name: string | null }>();
  return c.json({ orders: (rows.results ?? []).map((r) => publicOrder(r, r.product_name ?? undefined)) });
});

ordersRoutes.patch('/orders/:id', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const status = str((await jsonBody(c))?.status, 20);
  if (!isOrderStatus(status)) {
    return err(c, 400, 'Status harus: pending, confirmed, completed, atau cancelled.');
  }
  const res = await c.env.DB.prepare('UPDATE orders SET status = ?1 WHERE store_username = ?2 AND id = ?3')
    .bind(status, user.username, c.req.param('id'))
    .run();
  if ((res.meta?.changes ?? 0) === 0) return err(c, 404, 'Order tidak ditemukan.');
  return c.json({ ok: true });
});
