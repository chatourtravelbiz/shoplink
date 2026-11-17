// GET /api/settings, PUT /api/settings — pengaturan toko sendiri (auth).
import { Hono } from 'hono';
import type { App } from '../types';
import { err, jsonBody } from '../lib/http';
import { getSessionUser } from '../lib/auth';
import { getStoreByUsername, publicStore, publicUser } from '../lib/db';
import { isTheme, str } from '../lib/validation';

export const settingsRoutes: App = new Hono();

settingsRoutes.get('/settings', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const store = await getStoreByUsername(c.env, user.username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  return c.json({ store: publicStore(store), user: publicUser(user) });
});

settingsRoutes.put('/settings', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const body = await jsonBody(c);
  if (!body) return err(c, 400, 'Data tidak valid.');
  const storeName = str(body.store_name, 120);
  const tagline = str(body.tagline, 200);
  const storeBio = str(body.store_bio, 2000);
  const whatsapp = str(body.whatsapp_number, 20);
  const currency = str(body.currency, 10).toUpperCase() || 'IDR';
  const theme = str(body.theme, 20) || 'emerald';
  const logoUrl = str(body.logo_url, 500);
  if (!storeName) return err(c, 400, 'Nama toko wajib diisi.');
  if (!whatsapp) return err(c, 400, 'Nomor WhatsApp wajib diisi.');
  if (!isTheme(theme)) return err(c, 400, 'Tema tidak valid.');
  await c.env.DB.prepare(
    `UPDATE stores SET store_name = ?1, tagline = ?2, store_bio = ?3, whatsapp_number = ?4,
       currency = ?5, theme = ?6, logo_url = ?7 WHERE username = ?8`,
  )
    .bind(storeName, tagline, storeBio, whatsapp, currency, theme, logoUrl, user.username)
    .run();
  await c.env.DB.prepare('UPDATE users SET whatsapp_number = ?1 WHERE id = ?2').bind(whatsapp, user.id).run();
  const store = await getStoreByUsername(c.env, user.username);
  return c.json({ store: store ? publicStore(store) : null });
});
