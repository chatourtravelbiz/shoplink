-- Showcase / brosur toko agen — item display di storefront publik.
CREATE TABLE IF NOT EXISTS showcase_items (
  id TEXT PRIMARY KEY,
  store_username TEXT NOT NULL REFERENCES stores(username) ON UPDATE CASCADE ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_showcase_store ON showcase_items (store_username, sort_order ASC, created_at DESC);
