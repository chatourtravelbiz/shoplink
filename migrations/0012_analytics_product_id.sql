-- Analitik per produk: produk mana yang paling dilihat & diklik (30 hari terakhir).
ALTER TABLE analytics_events ADD COLUMN product_id TEXT;
CREATE INDEX IF NOT EXISTS idx_analytics_events_store_product ON analytics_events (store_username, product_id, metric_date);
