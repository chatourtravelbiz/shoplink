# Shoplink D1

Clone **Shoplink** (link-in-bio storefront untuk seller Instagram) yang berjalan di
**Cloudflare Workers + Hono + D1 + R2** — tanpa Next.js, tanpa Supabase, dan
**tanpa pembayaran online sama sekali** (tanpa Stripe / Razorpay / billing).

Pembeli memesan lewat form, order dicatat di toko, lalu konfirmasi ke penjual via
WhatsApp (pesan order terisi otomatis). Metode bayar: **WhatsApp / COD / Transfer
manual**.

## Arsitektur

```
Browser (SPA statis, hash routing)
  └─ public/index.html + public/js/*        (Tailwind via CDN, Bahasa Indonesia)
Cloudflare Workers (Hono, TypeScript)
  ├─ src/index.ts                            bootstrap + middleware + mount route
  ├─ src/routes/auth.ts                      signup / login / logout / session
  ├─ src/routes/dashboard.ts                 ringkasan merchant + grafik 7 hari
  ├─ src/routes/products.ts                  CRUD produk milik toko sendiri
  ├─ src/routes/orders.ts                    daftar + ubah status order (merchant)
  ├─ src/routes/settings.ts                  pengaturan toko
  ├─ src/routes/stores.ts                    storefront publik + order publik
  ├─ src/routes/analytics.ts                 POST /api/analytics/track
  ├─ src/routes/uploads.ts                   upload foto -> R2, serve /api/files/*
  └─ src/lib/{db,auth,crypto,validation,whatsapp,http}.ts
Cloudflare D1 (SQLite) — binding `DB`
Cloudflare R2 (foto produk) — binding `ASSETS`
```

Semua file kode dijaga tipis (< 250 baris, mayoritas < 130 baris). Semua query D1
memakai prepared statement `.bind()` — tidak ada interpolasi value ke SQL.
Semua output dinamis di frontend di-escape (`esc()`), aksi memakai event
delegation (`data-action`), bukan inline handler berisi data user.

## Fitur

- **Landing** — penjelasan + tombol daftar / lihat toko demo.
- **Auth** — signup (buat user + toko default), login, logout, session cookie
  sendiri (PBKDF2-SHA256, 100.000 iterasi, WebCrypto; cookie HttpOnly,
  SameSite=Lax, Secure saat HTTPS).
- **Dashboard** — omzet, order, kunjungan, klik, produk; grafik 7 hari; order
  terbaru + ubah status (pending/confirmed/completed/cancelled); produk terlaris.
- **Produk** — tambah/edit/hapus; nama, harga Rp, stok, kategori, deskripsi,
  status; gambar via URL tempel (Unsplash) **atau** upload file ke R2.
- **Pengaturan** — nama toko, tagline, bio, nomor WhatsApp, mata uang, tema warna
  (emerald/rose/amber/sky/violet), logo URL.
- **Storefront publik** — `/:username`: header toko, tombol WhatsApp, grid
  produk, filter kategori + cari; `/:username/p/:id`: detail + form order.
- **Order publik** — tanpa login; stok berkurang bila stok > 0 (stok 0 = pre-order
  tanpa batas); balasan berisi `whatsapp_url` (`wa.me/<nomor seller>?text=...`).
- **Analitik** — view toko + klik produk dicatat ke `analytics_daily` /
  `analytics_events`.

## Setup langkah-demi-langkah

```bash
npm install
npx wrangler login

# 1. Buat database D1 (sekali saja)
npx wrangler d1 create shoplink-d1
#    Salin database_id yang tampil ke wrangler.toml
#    (ganti "ganti-dengan-id-setelah-create")

# 2. Buat bucket R2 untuk foto produk (sekali saja; opsional — tanpa ini
#    upload mengembalikan 503 dan produk tetap bisa memakai image_url)
npx wrangler r2 bucket create shoplink-d1-assets

# 3. Migrasi + seed lokal
npm run db:migrate:local   # menjalankan migrations/0001_init.sql
npm run db:seed            # generate + isi migrations/0002_seed_demo.sql

# 4. Jalankan lokal
npm run dev                # http://localhost:8787
npm run typecheck          # tsc --noEmit

# 5. Migrasi + seed di Cloudflare (remote), lalu deploy
npm run db:migrate:remote
npm run db:seed:remote
npm run deploy
```

> Catatan: script `dev` sengaja **tanpa** `--persist-to`, supaya state D1 lokal
> yang dipakai `wrangler dev --local` sama dengan yang dipakai
> `wrangler d1 ... --local` (keduanya default ke `.wrangler/state/v3`).

## Akun demo

| | |
| --- | --- |
| Email | `john@example.com` |
| Password | `password123` |
| Toko | `@demo` — "Toko Demo" (`/demo`) |

Seed dibuat oleh `scripts/make-seed.mjs`: hash password dihitung dengan
PBKDF2-SHA256 Node (format `salt:hash` yang sama dengan verifikasi WebCrypto di
Worker) — **bukan** hash palsu / hardcode. Jalankan ulang scriptnya bila ingin
seed baru; file `migrations/0002_seed_demo.sql` adalah hasil generate.

## Skema D1 (`migrations/0001_init.sql`)

- `users` — id, email (UNIQUE), username (UNIQUE), password_hash, nama, bio,
  whatsapp_number, avatar_url, created_at
- `stores` — username (PK, FK ke users), user_id (UNIQUE), data toko, currency
  default `IDR`, theme default `emerald`, trust_badges/banners sebagai JSON TEXT
- `products` — PK (store_username, product_id), harga REAL, stok, kategori,
  collection, variants/highlights JSON TEXT
- `sessions` — token (PK), user_id, expires_at
- `orders` — id, store_username, product_id, quantity, revenue, date, notes,
  status, data pembeli, payment_method (`whatsapp`/`cod`/`transfer`)
- `analytics_daily` — PK (store_username, metric_date), views, clicks
- `analytics_events` — id, store_username, event_type, metric_date, source,
  referrer_host, page_path

Semua FK memakai `ON DELETE CASCADE`, plus index untuk produk, order, session,
dan analitik.

## API

| Method & path | Keterangan |
| --- | --- |
| `GET /api/health` | Health check |
| `POST /api/auth/signup` | Buat user + toko default (201, set cookie) |
| `POST /api/auth/login` | Login (set cookie) |
| `POST /api/auth/logout` | Hapus session + cookie |
| `GET /api/auth/session` | User + toko saat ini |
| `GET /api/auth/check-username?username=` | Cek ketersediaan username |
| `GET /api/dashboard` | Total, grafik 7 hari, order terbaru, produk terlaris |
| `GET/POST /api/products`, `PATCH/DELETE /api/products/:id` | CRUD produk (auth) |
| `GET/PUT /api/settings` | Pengaturan toko (auth) |
| `GET /api/orders`, `PATCH /api/orders/:id` | Order merchant (auth) |
| `GET /api/stores/:username` | Storefront publik + track view |
| `GET /api/stores/:username/products/:id` | Detail produk publik |
| `POST /api/stores/:username/orders` | Order publik → `{ order, whatsapp_url }` |
| `POST /api/analytics/track` | `{ store_username, event_type: view\|click, page_path }` |
| `POST /api/uploads` | Multipart `file` → R2, `{ url: /api/files/<key> }` |
| `GET /api/files/<key>` | Serve file dari R2 |

## Keamanan

- Dependensi minimal dan di-pin eksak (lihat `package.json`): hanya `hono`
  (runtime) + `wrangler`, `typescript`, `@cloudflare/workers-types` (dev).
  Tanpa Stripe/Razorpay/billing, tanpa `better-sqlite3`, tanpa Next/React.
- `npm audit` di sandbox ini diblokir oleh kebijakan registry (HTTP 403
  `policy_denied` pada endpoint audit); sebagai gantinya semua 94 paket
  (langsung + transitif) diperiksa lewat OSV API — **0 kerentanan ditemukan**.
- Password PBKDF2-SHA256 100k iterasi (WebCrypto di Worker, Node di seed
  script); tidak ada secret/password/token yang di-hardcode di kode.
- Cookie session HttpOnly + SameSite=Lax + Secure saat HTTPS; error server
  tidak pernah mengekspos stack trace ke client (`onError` generik).
- Upload R2: hanya gambar (JPEG/PNG/WebP/GIF/AVIF), maksimal 5 MB.
- Validasi input: username `[a-z0-9_]{3,30}`, email, harga 0–1 M, stok
  0–1 jt, qty 1–99; semua string dipotong ke panjang maksimum.

## Batasan D1

- D1 adalah SQLite serverless: cocok untuk seller kecil–menengah (limit ±10 GB
  per database, ada batas baca/tulis per query). Jangan simpan file di D1 —
  itu tugas R2.
- Migrasi memakai `wrangler d1 migrations apply`; untuk mengubah skema,
  tambah file `migrations/000N_*.sql` baru, jangan edit yang sudah ter-apply.
- `database_id` di `wrangler.toml` masih placeholder — wajib diganti setelah
  `wrangler d1 create`, kalau tidak deploy remote akan gagal.
- Nama bucket R2 diganti di `wrangler.toml` (`[[r2_buckets]]`) bila memakai
  bucket lain; nama database diganti di `[[d1_databases]]` + perintah
  `wrangler d1 ...`.

## Tanpa Stripe — kenapa?

Pembayaran online sengaja tidak ada. Seller kecil di Instagram umumnya
konfirmasi manual: pembeli order di web, lalu bayar via transfer/COD dan
konfirmasi lewat WhatsApp. Itu yang diimplementasikan: `whatsapp_url` berisi
detail order, dan status order diubah manual oleh merchant di dashboard.
