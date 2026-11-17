-- Akun sosial agen (selain WhatsApp): instagram, facebook, tiktok, youtube.
-- Disimpan sebagai JSON di stores.social_links, mis.
-- {"instagram": "https://instagram.com/nama", "tiktok": "https://tiktok.com/@nama"}.
-- Nomor WhatsApp yang sudah ada tidak diubah.
ALTER TABLE stores ADD COLUMN social_links TEXT NOT NULL DEFAULT '{}';
