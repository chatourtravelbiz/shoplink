// Serve file HTML dari binding Assets (STATIC) untuk route SPA & profile.
// Dipakai Hono notFound (/login, /demo, ...) dan route beranda (/).
// File statis yang ada sudah dilayani Assets sebelum Worker dipanggil.
import type { AppContext } from '../types';

/** Ambil satu file HTML dari Assets; null bila tidak ada. */
export async function serveAssetHtml(c: AppContext, file: string): Promise<Response | null> {
  const binding = c.env.STATIC;
  if (!binding) return null;
  const res = await binding.fetch(new Request(`http://localhost/${file}`));
  if (!res.ok) return null;
  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}

export async function serveSpa(c: AppContext): Promise<Response> {
  const res = await serveAssetHtml(c, 'spa.html');
  if (res) return res;
  return c.json({ error: 'Tidak ditemukan.' }, 404);
}

/** Shell SPA dengan username toko yang disuntik — untuk host custom domain agen,
 *  supaya / di domain agen langsung menampilkan tokonya (tanpa /:username). */
export async function serveSpaForStore(c: AppContext, username: string): Promise<Response> {
  const binding = c.env.STATIC;
  if (!binding) return c.json({ error: 'Tidak ditemukan.' }, 404);
  const res = await binding.fetch(new Request('http://localhost/spa.html'));
  if (!res.ok) return c.json({ error: 'Tidak ditemukan.' }, 404);
  const safe = username.replace(/[^a-z0-9-]/gi, '');
  const html = (await res.text()).replace(
    '</head>',
    `<script>window.__CUSTOM_STORE__=${JSON.stringify(safe)};</script></head>`,
  );
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
