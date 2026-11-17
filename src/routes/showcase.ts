// Showcase / brosur toko agen — CRUD milik toko sendiri (auth) + publik.
// GET /api/showcase, POST /api/showcase, PATCH/DELETE /api/showcase/:id,
// GET /api/stores/:username/showcase (publik, hanya toko active).
import { Hono } from 'hono';
import type { App, ShowcaseRow } from '../types';
import { err, jsonBody } from '../lib/http';
import { getSessionUser } from '../lib/auth';
import { getStoreByUsername, publicShowcase } from '../lib/db';
import { str } from '../lib/validation';
import { newId } from '../lib/crypto';

export const showcaseRoutes: App = new Hono();

function parseShowcaseInput(body: Record<string, unknown> | null) {
  if (!body) return null;
  return {
    title: str(body.title, 120),
    description: str(body.description, 2000),
    image_url: str(body.image_url, 500),
    link_url: str(body.link_url, 500),
    file_url: str(body.file_url, 500),
    sort_order: Math.min(9999, Math.max(0, Math.floor(Number(body.sort_order) || 0))),
  };
}

showcaseRoutes.get('/showcase', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM showcase_items WHERE store_username = ?1 ORDER BY sort_order ASC, created_at DESC',
  )
    .bind(user.username)
    .all<ShowcaseRow>();
  return c.json({ items: (rows.results ?? []).map(publicShowcase) });
});

showcaseRoutes.post('/showcase', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const s = parseShowcaseInput(await jsonBody(c));
  if (!s || !s.title) return err(c, 400, 'Judul showcase wajib diisi.');
  const id = newId('sc');
  await c.env.DB.prepare(
    `INSERT INTO showcase_items (id, store_username, title, description, image_url, link_url, file_url, sort_order, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(id, user.username, s.title, s.description, s.image_url, s.link_url, s.file_url, s.sort_order, new Date().toISOString())
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM showcase_items WHERE id = ?1').bind(id).first<ShowcaseRow>();
  return c.json({ item: row ? publicShowcase(row) : null }, 201);
});

showcaseRoutes.patch('/showcase/:id', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const s = parseShowcaseInput(await jsonBody(c));
  if (!s || !s.title) return err(c, 400, 'Judul showcase wajib diisi.');
  const res = await c.env.DB.prepare(
    `UPDATE showcase_items SET title = ?1, description = ?2, image_url = ?3, link_url = ?4,
     file_url = ?5, sort_order = ?6 WHERE id = ?7 AND store_username = ?8`,
  )
    .bind(s.title, s.description, s.image_url, s.link_url, s.file_url, s.sort_order, c.req.param('id'), user.username)
    .run();
  if ((res.meta?.changes ?? 0) === 0) return err(c, 404, 'Item showcase tidak ditemukan.');
  const row = await c.env.DB.prepare('SELECT * FROM showcase_items WHERE id = ?1').bind(c.req.param('id')).first<ShowcaseRow>();
  return c.json({ item: row ? publicShowcase(row) : null });
});

showcaseRoutes.delete('/showcase/:id', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const res = await c.env.DB.prepare('DELETE FROM showcase_items WHERE id = ?1 AND store_username = ?2')
    .bind(c.req.param('id'), user.username)
    .run();
  if ((res.meta?.changes ?? 0) === 0) return err(c, 404, 'Item showcase tidak ditemukan.');
  return c.json({ ok: true });
});

showcaseRoutes.get('/stores/:username/showcase', async (c) => {
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store || (store.status ?? 'active') === 'suspended') return err(c, 404, 'Toko tidak ditemukan.');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM showcase_items WHERE store_username = ?1 ORDER BY sort_order ASC, created_at DESC',
  )
    .bind(username)
    .all<ShowcaseRow>();
  return c.json({ items: (rows.results ?? []).map(publicShowcase) });
});
