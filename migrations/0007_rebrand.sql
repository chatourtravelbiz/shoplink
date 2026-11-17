-- Rebranding: tema default toko demo jadi chatour (merah bata), teks demo tanpa "Shoplink".
UPDATE stores SET theme = 'chatour', user_bio = 'Seller demo Chatour Travel', store_bio = 'Toko demo Chatour Travel — aneka fashion, kopi, dan aksesoris pilihan. Pesan mudah, konfirmasi langsung via WhatsApp.' WHERE username = 'demo';
UPDATE users SET bio = 'Seller demo Chatour Travel' WHERE username = 'demo';
