// GET /api/dashboard — ringkasan merchant (auth).
import { Hono } from 'hono';
import type { App, OrderRow } from '../types';
import { dayStr, err } from '../lib/http';
import { getSessionUser } from '../lib/auth';
import { publicOrder } from '../lib/db';

export const dashboardRoutes: App = new Hono();

dashboardRoutes.get('/dashboard', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const username = user.username;

  const totals = await c.env.DB.prepare(
    `SELECT
       (SELECT COALESCE(SUM(revenue), 0) FROM orders WHERE store_username = ?1 AND status != 'cancelled') AS revenue,
       (SELECT COUNT(*) FROM orders WHERE store_username = ?1) AS orders,
       (SELECT COALESCE(SUM(views), 0) FROM analytics_daily WHERE store_username = ?1) AS views,
       (SELECT COALESCE(SUM(clicks), 0) FROM analytics_daily WHERE store_username = ?1) AS clicks,
       (SELECT COUNT(*) FROM products WHERE store_username = ?1) AS products`,
  )
    .bind(username)
    .first<{ revenue: number; orders: number; views: number; clicks: number; products: number }>();

  const chart: Array<{ date: string; label: string; views: number; clicks: number; orders: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = dayStr(d);
    const row = await c.env.DB.prepare(
      'SELECT views, clicks FROM analytics_daily WHERE store_username = ?1 AND metric_date = ?2',
    )
      .bind(username, ds)
      .first<{ views: number; clicks: number }>();
    const oc = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM orders WHERE store_username = ?1 AND substr(date, 1, 10) = ?2 AND status != 'cancelled'",
    )
      .bind(username, ds)
      .first<{ n: number }>();
    chart.push({
      date: ds,
      label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      views: row?.views ?? 0,
      clicks: row?.clicks ?? 0,
      orders: oc?.n ?? 0,
    });
  }

  const recentRows = await c.env.DB.prepare(
    `SELECT o.*, p.name AS product_name FROM orders o
     LEFT JOIN products p ON p.store_username = o.store_username AND p.product_id = o.product_id
     WHERE o.store_username = ?1 ORDER BY o.date DESC, o.id DESC LIMIT 10`,
  )
    .bind(username)
    .all<OrderRow & { product_name: string | null }>();
  const recent_orders = (recentRows.results ?? []).map((r) => publicOrder(r, r.product_name ?? undefined));

  const topRows = await c.env.DB.prepare(
    `SELECT o.product_id AS product_id, p.name AS product_name,
            SUM(o.quantity) AS qty, SUM(o.revenue) AS revenue
     FROM orders o LEFT JOIN products p ON p.store_username = o.store_username AND p.product_id = o.product_id
     WHERE o.store_username = ?1 AND o.status != 'cancelled'
     GROUP BY o.product_id ORDER BY revenue DESC LIMIT 5`,
  )
    .bind(username)
    .all<{ product_id: string; product_name: string | null; qty: number; revenue: number }>();
  const top_products = (topRows.results ?? []).map((r) => ({
    product_id: r.product_id,
    product_name: r.product_name ?? r.product_id,
    quantity: r.qty,
    revenue: r.revenue,
  }));

  return c.json({
    totals: {
      revenue: totals?.revenue ?? 0,
      orders: totals?.orders ?? 0,
      views: totals?.views ?? 0,
      clicks: totals?.clicks ?? 0,
      products: totals?.products ?? 0,
    },
    chart,
    recent_orders,
    top_products,
  });
});
