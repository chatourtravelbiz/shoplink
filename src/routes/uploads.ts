// POST /api/uploads (auth, multipart) -> R2; GET /api/files/* -> serve dari R2.
// Bila bucket R2 belum ter-bind: 503 dengan pesan jelas (frontend tetap bisa
// memakai image_url tempel). Validasi: hanya gambar, maksimal 5 MB.
import { Hono } from 'hono';
import type { App } from '../types';
import { err } from '../lib/http';
import { getSessionUser } from '../lib/auth';
import { newId } from '../lib/crypto';

export const uploadsRoutes: App = new Hono();

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

uploadsRoutes.post('/uploads', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  if (!c.env.ASSETS) {
    return err(c, 503, 'Bucket R2 belum ter-bind. Set dulu [[r2_buckets]] di wrangler.toml, atau pakai image_url (tempel link gambar) untuk sementara.');
  }
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return err(c, 400, 'File gambar wajib diisi (field "file").');
  if (!ALLOWED_TYPES.includes(file.type)) return err(c, 400, 'File harus berupa gambar (JPEG, PNG, WebP, GIF, atau AVIF).');
  if (file.size > MAX_FILE_BYTES) return err(c, 400, 'Ukuran gambar maksimal 5 MB.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60) || 'gambar';
  const key = `products/${user.username}/${newId('img')}-${safeName}`;
  await c.env.ASSETS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return c.json({ url: `/api/files/${key}`, key }, 201);
});

uploadsRoutes.get('/files/*', async (c) => {
  if (!c.env.ASSETS) return err(c, 503, 'Bucket R2 belum ter-bind.');
  const key = c.req.path.replace(/^\/api\/files\//, '');
  if (!key || key.includes('..') || key.startsWith('/')) return err(c, 400, 'Key file tidak valid.');
  const obj = await c.env.ASSETS.get(key);
  if (!obj) return err(c, 404, 'File tidak ditemukan.');
  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType ?? 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=86400');
  return new Response(obj.body, { headers });
});
