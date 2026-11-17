-- Shoplink D1 — skema awal (SQLite / Cloudflare D1)
-- Disederhanakan dari skema asli: TANPA plan/subscription/Razorpay/Stripe.
-- Pembayaran hanya manual: WhatsApp / COD / Transfer (kolom payment_method di orders).
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  whatsapp_number TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stores (
  username TEXT PRIMARY KEY REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  user_bio TEXT,
  whatsapp_number TEXT NOT NULL,
  avatar_url TEXT,
  logo_url TEXT,
  store_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  store_bio TEXT,
  currency TEXT NOT NULL DEFAULT 'IDR',
  theme TEXT NOT NULL DEFAULT 'emerald',
  trust_badges_json TEXT,
  banners_json TEXT
);

CREATE TABLE IF NOT EXISTS products (
  store_username TEXT NOT NULL REFERENCES stores(username) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  images_json TEXT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  stock INTEGER NOT NULL DEFAULT 0,
  collection_name TEXT,
  variants_json TEXT,
  highlights_json TEXT,
  PRIMARY KEY (store_username, product_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  store_username TEXT NOT NULL REFERENCES stores(username) ON UPDATE CASCADE ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  revenue REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  payment_method TEXT NOT NULL DEFAULT 'whatsapp'
);

CREATE TABLE IF NOT EXISTS analytics_daily (
  store_username TEXT NOT NULL REFERENCES stores(username) ON UPDATE CASCADE ON DELETE CASCADE,
  metric_date TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (store_username, metric_date)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  store_username TEXT NOT NULL REFERENCES stores(username) ON UPDATE CASCADE ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  source TEXT,
  referrer_host TEXT,
  page_path TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_store_created ON products (store_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_store_status ON products (store_username, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_store_date ON orders (store_username, date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders (store_username, status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_store_created ON analytics_events (store_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_store_date ON analytics_events (store_username, metric_date);
