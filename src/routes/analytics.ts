// POST /api/analytics/track — catat view/click toko publik (tanpa auth).
import { Hono } from 'hono';
import type { App } from '../types';
import { err, jsonBody } from '../lib/http';
import { getStoreByUsername, trackEvent } from '../lib/db';
import { str } from '../lib/validation';

export const analyticsRoutes: App = new Hono();

analyticsRoutes.post('/analytics/track', async (c) => {
  const body = await jsonBody(c);
  const storeUsername = str(body?.store_username, 30).toLowerCase();
  const eventType = str(body?.event_type, 10);
  if (!storeUsername || !['view', 'click'].includes(eventType)) {
    return err(c, 400, 'store_username dan event_type (view/click) wajib diisi.');
  }
  const store = await getStoreByUsername(c.env, storeUsername);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  await trackEvent(c.env, storeUsername, eventType as 'view' | 'click', str(body?.page_path, 200), c.req.header('Referer'));
  return c.json({ ok: true });
});
