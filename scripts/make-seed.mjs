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

const products = [
  { id: 'demo-umroh-reguler', name: 'Umroh Reguler 9 Hari', price: 0, category: 'Umroh', stock: 20, collection: 'Umroh', img: '', desc: 'Paket Umroh 9 hari.', highlights: ['Hotel bintang 4', 'Tiket pesawat PP', 'Visa Umroh', 'Makan 3x sehari', 'Pembimbing & manasik'] },
  { id: 'demo-umroh-plus-turki', name: 'Umroh Plus Turki 12 Hari', price: 0, category: 'Umroh', stock: 20, collection: 'Umroh', img: '', desc: 'Paket Umroh 12 hari plus city tour Turki.', highlights: ['Hotel bintang 4', 'Tiket pesawat PP', 'Visa Umroh', 'City tour Turki', 'Pembimbing & manasik'] },
  { id: 'demo-umroh-ramadhan', name: 'Umroh Ramadhan 14 Hari', price: 0, category: 'Umroh', stock: 20, collection: 'Umroh', img: '', desc: 'Paket Umroh Ramadhan 14 hari.', highlights: ['Hotel bintang 4', 'Tiket pesawat PP', 'Visa Umroh', 'I\'tikaf & buka puasa', 'Pembimbing & manasik'] },
  { id: 'demo-haji-reguler', name: 'Haji Reguler', price: 0, category: 'Haji', stock: 20, collection: 'Haji', img: '', desc: 'Haji Reguler ±40 hari.', highlights: ['Kuota resmi pemerintah', 'Hotel di Makkah & Madinah', 'Makan selama di Tanah Suci', 'Pembimbing haji', 'Manasik lengkap'] },
  { id: 'demo-haji-khusus', name: 'Haji Khusus (ONH Plus)', price: 0, category: 'Haji', stock: 20, collection: 'Haji', img: '', desc: 'Haji Khusus (ONH Plus) ±25 hari.', highlights: ['Hotel bintang 5 dekat masjid', 'Penerbangan langsung', 'Makan 3x sehari', 'Pembimbing haji', 'Manasik lengkap'] },
  { id: 'demo-tiket-umroh', name: 'Tiket Umroh PP', price: 0, category: 'Tiket', stock: 20, collection: 'Tiket', img: '', desc: 'Tiket pesawat pulang-pergi untuk perjalanan Umroh.', highlights: ['Penerbangan langsung', 'Tiket pesawat PP', 'Harga tanya via WhatsApp'] },
];

const orders = [
  { id: 'o_demo_1', product: products[0], qty: 1, date: daysAgo(2, 11), status: 'completed', name: 'Ayu Lestari', phone: '081234567890', address: 'Jl. Merdeka No. 12, Bandung', method: 'transfer', notes: 'Mohon info jadwal keberangkatan' },
  { id: 'o_demo_2', product: products[3], qty: 2, date: daysAgo(1, 14), status: 'confirmed', name: 'Budi Santoso', phone: '082112345678', address: 'Jl. Sudirman No. 45, Jakarta', method: 'transfer', notes: '' },
  { id: 'o_demo_3', product: products[2], qty: 1, date: daysAgo(0, 9), status: 'pending', name: 'Citra Dewi', phone: '085678901234', address: 'Jl. Diponegoro No. 8, Surabaya', method: 'transfer', notes: 'Tanya harga & jadwal Ramadhan' },
];

const lines = [];
lines.push('-- Seed demo — dibuat otomatis oleh scripts/make-seed.mjs. JANGAN edit manual; jalankan ulang scriptnya.');
lines.push('-- Akun demo: john@example.com / password123  (toko @demo, "Toko Demo")');
lines.push(`INSERT OR REPLACE INTO users (id, email, username, password_hash, first_name, last_name, bio, whatsapp_number, avatar_url, created_at) VALUES (${q('u_demo_john')}, ${q('john@example.com')}, ${q('demo')}, ${q(passwordHash)}, ${q('John')}, ${q('Doe')}, ${q('Agen demo Chatour Travel')}, ${q('6281234567890')}, '', ${q(iso(today))});`);
lines.push(`INSERT OR REPLACE INTO stores (username, user_id, email, first_name, last_name, user_bio, whatsapp_number, avatar_url, logo_url, store_name, tagline, store_bio, currency, theme, section_order, trust_badges_json, banners_json) VALUES (${q('demo')}, ${q('u_demo_john')}, ${q('john@example.com')}, ${q('John')}, ${q('Doe')}, ${q('Agen demo Chatour Travel')}, ${q('6281234567890')}, '', '', ${q('Toko Demo')}, ${q('Pesan paket lewat WhatsApp')}, ${q('Toko demo agen Chatour Travel — paket Umroh & Haji. Pesan mudah, konfirmasi langsung via WhatsApp.')}, ${q('IDR')}, ${q('chatour')}, ${q('showcase-first')}, ${q(JSON.stringify([{ text: 'Fast Respon via WhatsApp' }, { text: 'Berizin Resmi PPIU' }, { text: 'Pembimbing Bersertifikat BNSP' }]))}, ${q('[]')});`);

for (const p of products) {
  lines.push(`INSERT OR REPLACE INTO products (store_username, product_id, image_url, images_json, name, price, description, status, created_at, category, stock, collection_name, variants_json, highlights_json) VALUES (${q('demo')}, ${q(p.id)}, ${q(p.img)}, ${q(JSON.stringify(p.img ? [p.img] : []))}, ${q(p.name)}, ${p.price}, ${q(p.desc)}, ${q('active')}, ${q(iso(today))}, ${q(p.category)}, ${p.stock}, ${q(p.collection)}, ${q('[]')}, ${q(JSON.stringify(p.highlights))});`);
}
for (const o of orders) {
  lines.push(`INSERT OR REPLACE INTO orders (id, store_username, product_id, quantity, revenue, date, notes, status, customer_name, customer_phone, customer_address, payment_method) VALUES (${q(o.id)}, ${q('demo')}, ${q(o.product.id)}, ${o.qty}, ${o.product.price * o.qty}, ${q(iso(o.date))}, ${q(o.notes)}, ${q(o.status)}, ${q(o.name)}, ${q(o.phone)}, ${q(o.address)}, ${q(o.method)});`);
}
// Analitik demo TIDAK di-seed (dashboard demo harus mulai dari 0 kunjungan/klik;
// angka contoh lama sudah dihapus dari seed dan dari D1).
lines.push(`INSERT OR REPLACE INTO analytics_events (id, store_username, event_type, metric_date, source, referrer_host, page_path, created_at) VALUES (${q('ae_demo_seed')}, ${q('demo')}, ${q('view')}, ${q(isoDate(today))}, ${q('instagram')}, ${q('instagram.com')}, ${q('/s/demo')}, ${q(iso(today))});`);

writeFileSync(out, lines.join('\n') + '\n');
console.log(`Seed ditulis ke ${out} (hash PBKDF2-SHA256 untuk password123)`);
