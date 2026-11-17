// GET/POST /api/products, PATCH/DELETE /api/products/:id — milik toko sendiri (auth).
import { Hono } from 'hono';
import type { App, ProductRow } from '../types';
import { err, jsonBody } from '../lib/http';
import { getSessionUser } from '../lib/auth';
import { publicProduct } from '../lib/db';
import { isProductStatus, str, validPrice, validStock } from '../lib/validation';
import { newId } from '../lib/crypto';

export const productsRoutes: App = new Hono();

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop';

type ProductInput = {
  name: string;
  price: number;
  description: string;
  status: string;
  category: string;
  stock: number;
  imageUrl: string;
  collection: string;
  variants: unknown[];
  highlights: string[];
};

function parseProductInput(body: Record<string, unknown> | null): ProductInput | null {
  if (!body) return null;
  const price = validPrice(body.price);
  if (price === null) return null;
  const status = str(body.status, 20) || 'active';
  if (!isProductStatus(status)) return null;
  const highlights = Array.isArray(body.highlights)
    ? body.highlights.map((h) => str(h, 120)).filter(Boolean)
    : [];
  return {
    name: str(body.name, 120),
    price,
    description: str(body.description, 2000),
    status,
    category: str(body.category, 60) || 'Umum',
    stock: validStock(body.stock),
    imageUrl: str(body.image_url, 500),
    collection: str(body.collection ?? body.collection_name, 60),
    variants: Array.isArray(body.variants) ? body.variants : [],
    highlights,
  };
}

productsRoutes.get('/products', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM products WHERE store_username = ?1 ORDER BY created_at DESC, product_id ASC',
  )
    .bind(user.username)
    .all<ProductRow>();
  return c.json({ products: (rows.results ?? []).map(publicProduct) });
});

productsRoutes.post('/products', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const p = parseProductInput(await jsonBody(c));
  if (!p || !p.name) return err(c, 400, 'Nama produk wajib diisi dan harga harus valid.');
  const productId = newId('p');
  const now = new Date().toISOString();
  const imageUrl = p.imageUrl || FALLBACK_IMAGE;
  await c.env.DB.prepare(
    `INSERT INTO products (store_username, product_id, image_url, images_json, name, price, description, status, created_at, category, stock, collection_name, variants_json, highlights_json)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
  )
    .bind(user.username, productId, imageUrl, JSON.stringify([imageUrl]), p.name, p.price, p.description, p.status, now, p.category, p.stock, p.collection || null, JSON.stringify(p.variants), JSON.stringify(p.highlights))
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM products WHERE store_username = ?1 AND product_id = ?2')
    .bind(user.username, productId)
    .first<ProductRow>();
  return c.json({ product: row ? publicProduct(row) : null }, 201);
});

productsRoutes.patch('/products/:id', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM products WHERE store_username = ?1 AND product_id = ?2')
    .bind(user.username, id)
    .first<ProductRow>();
  if (!existing) return err(c, 404, 'Produk tidak ditemukan.');
  const merged = { ...publicProduct(existing), ...(await jsonBody(c)) };
  const p = parseProductInput(merged);
  if (!p || !p.name) return err(c, 400, 'Nama produk wajib diisi dan harga harus valid.');
  const imageUrl = p.imageUrl || existing.image_url;
  await c.env.DB.prepare(
    `UPDATE products SET image_url = ?1, images_json = ?2, name = ?3, price = ?4, description = ?5,
       status = ?6, category = ?7, stock = ?8, collection_name = ?9, variants_json = ?10, highlights_json = ?11
     WHERE store_username = ?12 AND product_id = ?13`,
  )
    .bind(imageUrl, JSON.stringify([imageUrl]), p.name, p.price, p.description, p.status, p.category, p.stock, p.collection || null, JSON.stringify(p.variants), JSON.stringify(p.highlights), user.username, id)
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM products WHERE store_username = ?1 AND product_id = ?2')
    .bind(user.username, id)
    .first<ProductRow>();
  return c.json({ product: row ? publicProduct(row) : null });
});

productsRoutes.delete('/products/:id', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const res = await c.env.DB.prepare('DELETE FROM products WHERE store_username = ?1 AND product_id = ?2')
    .bind(user.username, c.req.param('id'))
    .run();
  if ((res.meta?.changes ?? 0) === 0) return err(c, 404, 'Produk tidak ditemukan.');
  return c.json({ ok: true });
});
