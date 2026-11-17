// Storefront publik:
// GET /api/stores/:username, GET /api/stores/:username/products/:id,
// POST /api/stores/:username/orders (tanpa auth; order via WhatsApp/COD/Transfer).
import { Hono } from 'hono';
import type { App, OrderRow, ProductRow } from '../types';
import { err, jsonBody } from '../lib/http';
import { getStoreByUsername, publicOrder, publicProduct, publicStore, trackEvent } from '../lib/db';
import { isPaymentMethod, str, validQty } from '../lib/validation';
import { buildOrderWhatsAppUrl } from '../lib/whatsapp';
import { newId } from '../lib/crypto';

export const storesRoutes: App = new Hono();

storesRoutes.get('/stores/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store || (store.status ?? 'active') === 'suspended') return err(c, 404, 'Toko tidak ditemukan.');
  const rows = await c.env.DB.prepare(
    "SELECT * FROM products WHERE store_username = ?1 AND status = 'active' ORDER BY created_at DESC, product_id ASC",
  )
    .bind(username)
    .all<ProductRow>();
  await trackEvent(c.env, username, 'view', `/${username}`, c.req.header('Referer'));
  return c.json({ store: publicStore(store), products: (rows.results ?? []).map(publicProduct) });
});

storesRoutes.get('/stores/:username/products/:id', async (c) => {
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store || (store.status ?? 'active') === 'suspended') return err(c, 404, 'Toko tidak ditemukan.');
  const product = await c.env.DB.prepare(
    "SELECT * FROM products WHERE store_username = ?1 AND product_id = ?2 AND status = 'active'",
  )
    .bind(username, c.req.param('id'))
    .first<ProductRow>();
  if (!product) return err(c, 404, 'Produk tidak ditemukan.');
  return c.json({ store: publicStore(store), product: publicProduct(product) });
});

storesRoutes.post('/stores/:username/orders', async (c) => {
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store || (store.status ?? 'active') === 'suspended') return err(c, 404, 'Toko tidak ditemukan.');
  const body = await jsonBody(c);
  const productId = str(body?.product_id, 60);
  const quantity = validQty(body?.quantity);
  const customerName = str(body?.customer_name, 120);
  const customerPhone = str(body?.customer_phone, 20);
  const customerAddress = str(body?.customer_address, 500);
  const notes = str(body?.notes, 500);
  const paymentMethod = str(body?.payment_method, 20) || 'whatsapp';
  if (!productId) return err(c, 400, 'Produk wajib dipilih.');
  if (quantity === null) return err(c, 400, 'Jumlah minimal 1, maksimal 99.');
  if (!customerName) return err(c, 400, 'Nama pembeli wajib diisi.');
  if (!customerPhone) return err(c, 400, 'Nomor WhatsApp pembeli wajib diisi.');
  if (!isPaymentMethod(paymentMethod)) {
    return err(c, 400, 'Metode pembayaran harus: whatsapp, cod, atau transfer.');
  }
  const product = await c.env.DB.prepare(
    "SELECT * FROM products WHERE store_username = ?1 AND product_id = ?2 AND status = 'active'",
  )
    .bind(username, productId)
    .first<ProductRow>();
  if (!product) return err(c, 404, 'Produk tidak ditemukan atau tidak aktif.');
  // Stok 0 = tanpa batas stok (pre-order). Stok > 0: cek & kurangi.
  if (product.stock > 0 && quantity > product.stock) {
    return err(c, 400, `Stok tersisa ${product.stock}.`);
  }
  const total = product.price * quantity;
  const orderId = newId('o');
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO orders (id, store_username, product_id, quantity, revenue, date, notes, status, customer_name, customer_phone, customer_address, payment_method)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
  )
    .bind(orderId, username, productId, quantity, total, now, notes || null, 'pending', customerName, customerPhone, customerAddress || null, paymentMethod)
    .run();
  if (product.stock > 0) {
    await c.env.DB.prepare('UPDATE products SET stock = MAX(0, stock - ?1) WHERE store_username = ?2 AND product_id = ?3')
      .bind(quantity, username, productId)
      .run();
  }
  const whatsappUrl = buildOrderWhatsAppUrl(store.whatsapp_number, {
    storeName: store.store_name,
    productName: product.name,
    quantity,
    total,
    customerName,
    customerPhone,
    customerAddress,
    paymentMethod,
    notes,
  });
  const orderRow: OrderRow = {
    id: orderId, store_username: username, product_id: productId, quantity, revenue: total,
    date: now, notes, status: 'pending', customer_name: customerName,
    customer_phone: customerPhone, customer_address: customerAddress, payment_method: paymentMethod,
  };
  return c.json({ order: publicOrder(orderRow, product.name), whatsapp_url: whatsappUrl }, 201);
});
