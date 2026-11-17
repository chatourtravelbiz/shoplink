// Serve file HTML dari binding Assets (STATIC) untuk route SPA & profile.
// Dipakai Hono notFound (/login, /demo, ...) dan route beranda (/).
// File statis yang ada sudah dilayani Assets sebelum Worker dipanggil.
import type { AppContext, ProductRow } from '../types';
import { getStoreByUsername } from './db';
import { storeOgMeta } from './og';

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

function injectHead(html: string, inject: string): string {
  return html.replace('</head>', `${inject}</head>`);
}

/** Shell SPA + meta Open Graph toko/produk. Toko/produk tidak ditemukan atau
 *  disuspend → shell polos (meta bawaan spa.html), seperti sebelumnya. */
export async function serveSpaWithStoreMeta(c: AppContext, username: string, productId?: string): Promise<Response> {
  const binding = c.env.STATIC;
  if (!binding) return c.json({ error: 'Tidak ditemukan.' }, 404);
  const res = await binding.fetch(new Request('http://localhost/spa.html'));
  if (!res.ok) return c.json({ error: 'Tidak ditemukan.' }, 404);
  const html = await res.text();
  const store = await getStoreByUsername(c.env, username.toLowerCase());
  if (!store || (store.status ?? 'active') === 'suspended') {
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
  }
  let product: ProductRow | null = null;
  if (productId) {
    product = await c.env.DB.prepare(
      "SELECT * FROM products WHERE store_username = ?1 AND product_id = ?2 AND status = 'active'",
    )
      .bind(username.toLowerCase(), productId)
      .first<ProductRow>();
  }
  const meta = storeOgMeta(c.env, store, product, c.req.url);
  return new Response(injectHead(html, `  ${meta}\n`), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}

/** Shell SPA dengan username toko yang disuntik — untuk host custom domain agen,
 *  supaya / di domain agen langsung menampilkan tokonya (tanpa /:username). */
export async function serveSpaForStore(c: AppContext, username: string, productId?: string): Promise<Response> {
  const binding = c.env.STATIC;
  if (!binding) return c.json({ error: 'Tidak ditemukan.' }, 404);
  const res = await binding.fetch(new Request('http://localhost/spa.html'));
  if (!res.ok) return c.json({ error: 'Tidak ditemukan.' }, 404);
  const safe = username.replace(/[^a-z0-9-]/gi, '');
  let html = await res.text();
  const store = await getStoreByUsername(c.env, safe.toLowerCase());
  if (store && (store.status ?? 'active') !== 'suspended') {
    let product: ProductRow | null = null;
    if (productId) {
      product = await c.env.DB.prepare(
        "SELECT * FROM products WHERE store_username = ?1 AND product_id = ?2 AND status = 'active'",
      )
        .bind(safe.toLowerCase(), productId)
        .first<ProductRow>();
    }
    html = injectHead(html, `  ${storeOgMeta(c.env, store, product, c.req.url)}\n`);
  }
  html = injectHead(html, `<script>window.__CUSTOM_STORE__=${JSON.stringify(safe)};</script>`);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
