// Shoplink D1 — bootstrap Hono saja. Semua route ada di src/routes/*,
// semua helper ada di src/lib/*. Tanpa pembayaran online: order via
// WhatsApp / COD / Transfer manual. Tanpa Stripe/Razorpay/billing.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { App } from './types';
import { serveSpa } from './lib/spa';
import { authRoutes } from './routes/auth';
import { dashboardRoutes } from './routes/dashboard';
import { productsRoutes } from './routes/products';
import { ordersRoutes } from './routes/orders';
import { settingsRoutes } from './routes/settings';
import { storesRoutes } from './routes/stores';
import { adminRoutes } from './routes/admin';
import { analyticsRoutes } from './routes/analytics';
import { uploadsRoutes } from './routes/uploads';

const app: App = new Hono();

// Header keamanan dasar untuk semua respons API.
app.use('/api/*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Frame-Options', 'DENY');
});

// CORS hanya untuk API, dan hanya mengizinkan origin yang memanggil (same-origin
// di deploy normal). Kredensial dipakai untuk cookie session.
app.use('/api/*', cors({ origin: (o) => o, credentials: true }));

app.get('/api/health', (c) => c.json({ ok: true, service: 'shoplink-d1', time: new Date().toISOString() }));

app.route('/api', authRoutes);
app.route('/api', dashboardRoutes);
app.route('/api', productsRoutes);
app.route('/api', ordersRoutes);
app.route('/api', settingsRoutes);
app.route('/api', storesRoutes);
app.route('/api', adminRoutes);
app.route('/api', analyticsRoutes);
app.route('/api', uploadsRoutes);

// 404 JSON hanya untuk /api/* yang tidak dikenal. Path non-API (/, /demo,
// /dashboard, ...) adalah route SPA: layani index.html via binding Assets.
// Path file statis yang hilang (ada ekstensi) tetap 404 JSON, bukan HTML.
app.notFound(async (c) => {
  const path = c.req.path;
  if (path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(path)) {
    return c.json({ error: 'Tidak ditemukan.' }, 404);
  }
  return serveSpa(c);
});

// Jangan pernah expose stack trace / detail error internal ke client.
app.onError((error, c) => {
  console.error('Unhandled error:', error instanceof Error ? error.message : 'unknown');
  return c.json({ error: 'Terjadi kesalahan di server.' }, 500);
});

export default app;
