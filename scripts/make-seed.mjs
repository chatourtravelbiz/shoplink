// Generate migrations/0002_seed_demo.sql dengan hash password ASLI (PBKDF2-SHA256,
// 100.000 iterasi, format salt:hash hex) — konsisten dengan verifikasi di src/auth.ts.
// Jalankan:  node scripts/make-seed.mjs
// Lalu:      npm run db:seed   (atau db:seed:remote)
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'migrations', '0002_seed_demo.sql');

const PASSWORD = 'password123';
const salt = randomBytes(16).toString('hex');
// PENTING: salt harus dipakai sebagai byte mentah (Buffer.from hex), bukan
// sebagai string UTF-8 — agar cocok dengan WebCrypto di Worker (src/lib/crypto.ts),
// yang derive dengan salt hasil unhex().
const hash = pbkdf2Sync(PASSWORD, Buffer.from(salt, 'hex'), 100_000, 32, 'sha256').toString('hex');
const passwordHash = `${salt}:${hash}`;

const q = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`;
const today = new Date();
const isoDate = (d) => d.toISOString().slice(0, 10);
const iso = (d) => d.toISOString();
const daysAgo = (n, h = 10) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d;
};

const U = 'https://images.unsplash.com';
const products = [
  { id: 'demo-tas-kulit', name: 'Tas Selempang Kulit Asli', price: 249000, category: 'Tas', stock: 12, collection: 'Best Seller', img: `${U}/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop`, desc: 'Tas selempang kulit asli dengan jahitan rapi, tali bisa diatur, dan cukup untuk dompet, HP, dan kunci.', highlights: ['Kulit asli', 'Tali adjustable', 'Jahitan rapi'] },
  { id: 'demo-sneakers', name: 'Sneakers Putih Kasual', price: 399000, category: 'Sepatu', stock: 20, collection: 'Best Seller', img: `${U}/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop`, desc: 'Sneakers putih ringan dengan sol empuk, nyaman dipakai seharian untuk jalan maupun kerja.', highlights: ['Sol empuk', 'Ringan', 'Mudah dipadukan'] },
  { id: 'demo-jam-tangan', name: 'Jam Tangan Klasik Kulit', price: 549000, category: 'Aksesoris', stock: 8, collection: 'Koleksi Baru', img: `${U}/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop`, desc: 'Jam tangan klasik tali kulit dengan tampilan minimalis, cocok untuk acara formal maupun santai.', highlights: ['Tali kulit', 'Tahan air (percikan)', 'Desain minimalis'] },
  { id: 'demo-headphone', name: 'Headphone Bluetooth', price: 299000, category: 'Elektronik', stock: 15, collection: 'Koleksi Baru', img: `${U}/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop`, desc: 'Headphone bluetooth dengan bass mantap dan baterai tahan sampai 20 jam. Cocok untuk kerja dan olahraga.', highlights: ['Baterai 20 jam', 'Bass mantap', 'Bluetooth 5.0'] },
  { id: 'demo-kopi-gayo', name: 'Kopi Gayo Arabika 250g', price: 89000, category: 'Makanan & Minuman', stock: 30, collection: 'Umum', img: `${U}/photo-1447933601403-0c6688de566e?q=80&w=1200&auto=format&fit=crop`, desc: 'Biji kopi arabika Gayo asli Aceh, disangrai medium. Aroma fruity dan rasa bersih, cocok untuk V60 maupun tubruk.', highlights: ['Arabika Gayo asli', 'Roast medium', '250 gram'] },
  { id: 'demo-kemeja-batik', name: 'Kemeja Batik Pria Lengan Panjang', price: 179000, category: 'Fashion', stock: 18, collection: 'Umum', img: `${U}/photo-1596755094514-f87e34085b2c?q=80&w=1200&auto=format&fit=crop`, desc: 'Kemeja batik katun adem dengan motif klasik, potongan rapi. Nyaman dipakai kerja maupun kondangan.', highlights: ['Katun adem', 'Motif klasik', 'Potongan rapi'] },
];

const orders = [
  { id: 'o_demo_1', product: products[0], qty: 1, date: daysAgo(2, 11), status: 'completed', name: 'Ayu Lestari', phone: '081234567890', address: 'Jl. Merdeka No. 12, Bandung', method: 'whatsapp', notes: 'Tolong packing rapi ya' },
  { id: 'o_demo_2', product: products[4], qty: 2, date: daysAgo(1, 14), status: 'confirmed', name: 'Budi Santoso', phone: '082112345678', address: 'Jl. Sudirman No. 45, Jakarta', method: 'transfer', notes: '' },
  { id: 'o_demo_3', product: products[1], qty: 1, date: daysAgo(0, 9), status: 'pending', name: 'Citra Dewi', phone: '085678901234', address: 'Jl. Diponegoro No. 8, Surabaya', method: 'cod', notes: 'COD sore hari' },
];

const lines = [];
lines.push('-- Seed demo — dibuat otomatis oleh scripts/make-seed.mjs. JANGAN edit manual; jalankan ulang scriptnya.');
lines.push('-- Akun demo: john@example.com / password123  (toko @demo, "Toko Demo")');
lines.push(`INSERT OR REPLACE INTO users (id, email, username, password_hash, first_name, last_name, bio, whatsapp_number, avatar_url, created_at) VALUES (${q('u_demo_john')}, ${q('john@example.com')}, ${q('demo')}, ${q(passwordHash)}, ${q('John')}, ${q('Doe')}, ${q('Seller demo Shoplink D1')}, ${q('6281234567890')}, '', ${q(iso(today))});`);
lines.push(`INSERT OR REPLACE INTO stores (username, user_id, email, first_name, last_name, user_bio, whatsapp_number, avatar_url, logo_url, store_name, tagline, store_bio, currency, theme, trust_badges_json, banners_json) VALUES (${q('demo')}, ${q('u_demo_john')}, ${q('john@example.com')}, ${q('John')}, ${q('Doe')}, ${q('Seller demo Shoplink D1')}, ${q('6281234567890')}, '', '', ${q('Toko Demo')}, ${q('Belanja lewat WhatsApp')}, ${q('Toko demo Shoplink D1 — aneka fashion, kopi, dan aksesoris pilihan. Pesan mudah, konfirmasi langsung via WhatsApp.')}, ${q('IDR')}, ${q('emerald')}, ${q(JSON.stringify([{ text: 'Fast Respon via WhatsApp' }, { text: 'Pengiriman Aman' }, { text: 'Bisa COD' }]))}, ${q('[]')});`);

for (const p of products) {
  lines.push(`INSERT OR REPLACE INTO products (store_username, product_id, image_url, images_json, name, price, description, status, created_at, category, stock, collection_name, variants_json, highlights_json) VALUES (${q('demo')}, ${q(p.id)}, ${q(p.img)}, ${q(JSON.stringify([p.img]))}, ${q(p.name)}, ${p.price}, ${q(p.desc)}, ${q('active')}, ${q(iso(today))}, ${q(p.category)}, ${p.stock}, ${q(p.collection)}, ${q('[]')}, ${q(JSON.stringify(p.highlights))});`);
}
for (const o of orders) {
  lines.push(`INSERT OR REPLACE INTO orders (id, store_username, product_id, quantity, revenue, date, notes, status, customer_name, customer_phone, customer_address, payment_method) VALUES (${q(o.id)}, ${q('demo')}, ${q(o.product.id)}, ${o.qty}, ${o.product.price * o.qty}, ${q(iso(o.date))}, ${q(o.notes)}, ${q(o.status)}, ${q(o.name)}, ${q(o.phone)}, ${q(o.address)}, ${q(o.method)});`);
}
// Analitik 7 hari terakhir (agar grafik dashboard demo tidak kosong)
const views = [42, 35, 51, 28, 63, 47, 58];
const clicks = [9, 7, 12, 5, 15, 11, 13];
for (let i = 6; i >= 0; i--) {
  const d = daysAgo(i);
  const idx = 6 - i;
  lines.push(`INSERT OR REPLACE INTO analytics_daily (store_username, metric_date, views, clicks) VALUES (${q('demo')}, ${q(isoDate(d))}, ${views[idx]}, ${clicks[idx]});`);
}
lines.push(`INSERT OR REPLACE INTO analytics_events (id, store_username, event_type, metric_date, source, referrer_host, page_path, created_at) VALUES (${q('ae_demo_seed')}, ${q('demo')}, ${q('view')}, ${q(isoDate(today))}, ${q('instagram')}, ${q('instagram.com')}, ${q('/s/demo')}, ${q(iso(today))});`);

writeFileSync(out, lines.join('\n') + '\n');
console.log(`Seed ditulis ke ${out} (hash PBKDF2-SHA256 untuk password123)`);
