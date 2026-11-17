// Chatour Travel — bootstrap Hono saja. Semua route ada di src/routes/*,
// semua helper ada di src/lib/*. Satu Worker di root chatourtravel.com:
// company profile (/) + blog (/blog) + toko agen (/:username) + /api/*.
// Tanpa pembayaran online: order via WhatsApp / COD / Transfer manual.
// Tanpa Stripe/Razorpay/billing.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { App } from './types';
import { serveSpa, serveSpaForStore, serveSpaWithStoreMeta } from './lib/spa';
import { getStoreByCustomDomain } from './lib/db';
import { profileRoutes } from './routes/profile';
import { authRoutes } from './routes/auth';
import { dashboardRoutes } from './routes/dashboard';
import { productsRoutes } from './routes/products';
import { ordersRoutes } from './routes/orders';
import { settingsRoutes } from './routes/settings';
import { storesRoutes } from './routes/stores';
import { adminRoutes } from './routes/admin';
import { adminDomainRoutes } from './routes/admin-domains';
import { analyticsRoutes } from './routes/analytics';
import { showcaseRoutes } from './routes/showcase';
import { uploadsRoutes } from './routes/uploads';

const app: App = new Hono();

// Host utama (profile + toko di /:username). Domain lain dicocokkan dengan
// stores.custom_domain — fondasi custom domain agen — termasuk subdomain
// chatourtravel.com (mis. demo.chatourtravel.com), yang dicadangkan untuk
// platform dan dipasang langsung oleh admin, bukan lewat pengajuan agen.
function isMainHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === 'chatourtravel.com' ||
    h.endsWith('.chatourtravel.com') ||
    h.endsWith('.workers.dev') ||
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h === '127.0.0.1'
  );
}

app.use(async (c, next) => {
  const host = new URL(c.req.url).hostname;
  const ownSubdomain = host.toLowerCase().endsWith('.chatourtravel.com');
  if (!isMainHost(host) || ownSubdomain) {
    try {
      const store = await getStoreByCustomDomain(c.env, host);
      if (store) c.set('customStore', store.username);
    } catch {
      // DB belum punya kolom custom_domain (dev lokal lama): abaikan, lanjut normal.
    }
  }
  await next();
});

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

// Company profile (/) + blog (/blog, /blog/:slug) + sitemap/robots.
app.route('/', profileRoutes);

app.route('/api', authRoutes);
app.route('/api', dashboardRoutes);
app.route('/api', productsRoutes);
app.route('/api', ordersRoutes);
app.route('/api', settingsRoutes);
app.route('/api', storesRoutes);
app.route('/api', adminRoutes);
app.route('/api', adminDomainRoutes);
app.route('/api', analyticsRoutes);
app.route('/api', showcaseRoutes);
app.route('/api', uploadsRoutes);

// 404 JSON hanya untuk /api/* yang tidak dikenal. Path non-API adalah route SPA:
// /login, /dashboard, /:username, /:username/p/:id, ... — layani spa.html.
// Di host custom domain agen, /p/:id adalah produk toko itu sendiri.
app.notFound(async (c) => {
  const path = c.req.path;
  if (path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(path)) {
    return c.json({ error: 'Tidak ditemukan.' }, 404);
  }
  const customStore = c.get('customStore');
  // /demo pindah permanen ke demo.chatourtravel.com (301; query dipertahankan,
  // mis. /demo/p/:id?done=1&wa=... dari alur order). Berlaku juga bila path
  // /demo dibuka di subdomain itu sendiri (→ /).
  const demoMatch = /^\/demo(\/.*)?$/.exec(path);
  if (demoMatch) {
    const url = new URL(c.req.url);
    url.hostname = 'demo.chatourtravel.com';
    url.pathname = path.slice(5) || '/';
    return c.redirect(url.toString(), 301);
  }
  if (customStore) {
    const productMatch = /^\/p\/([^/]+)$/.exec(path);
    if (productMatch) return serveSpaForStore(c, customStore, productMatch[1]);
    if (path === '/') return serveSpaForStore(c, customStore);
  }
  // /:username dan /:username/p/:id — shell SPA + meta Open Graph toko/produk
  // (crawler WhatsApp/Telegram membaca meta ini; username bukan toko → shell polos).
  const productMatch = /^\/([a-z0-9_]{3,30})\/p\/([^/]+)$/.exec(path);
  if (productMatch) return serveSpaWithStoreMeta(c, productMatch[1], productMatch[2]);
  const storeMatch = /^\/([a-z0-9_]{3,30})$/.exec(path);
  if (storeMatch) return serveSpaWithStoreMeta(c, storeMatch[1]);
  return serveSpa(c);
});

// Jangan pernah expose stack trace / detail error internal ke client.
app.onError((error, c) => {
  console.error('Unhandled error:', error instanceof Error ? error.message : 'unknown');
  return c.json({ error: 'Terjadi kesalahan di server.' }, 500);
});

export default app;
