-- Fondasi custom domain agen: toko bisa dilayani dari domainnya sendiri
-- (mis. agen-ali.com -> toko @ali di /). Pemasangan domain (agen arahkan
-- CNAME + admin pasang custom domain via API) adalah langkah berikutnya;
-- migrasi ini hanya menyiapkan kolomnya. UNIQUE index mengizinkan banyak NULL.
ALTER TABLE stores ADD COLUMN custom_domain TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_custom_domain ON stores(custom_domain);
