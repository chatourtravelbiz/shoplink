-- Blog/berita company profile — tabel posts + 2 artikel contoh (CONTOH, bukan harga/jadwal resmi).
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Info',
  status TEXT NOT NULL DEFAULT 'draft',
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  meta_description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts (status, published_at DESC);
-- Artikel contoh 1 (published). Isi umum, tanpa harga/izin/jadwal spesifik.
INSERT OR IGNORE INTO posts (id, slug, title, excerpt, content, cover_url, category, status, author_id, meta_description, created_at, updated_at, published_at) VALUES (
  'post_panduan_umroh',
  'panduan-umroh-pertama-kali',
  'Panduan Umroh Pertama Kali: Persiapan, Dokumen, dan Tips',
  'Berangkat Umroh untuk pertama kali? Ini checklist persiapan, dokumen yang perlu disiapkan, dan tips agar perjalanan ibadah berjalan tenang.',
  'Umroh pertama kali sering terasa menegangkan, padahal sebagian besar rasa cemas itu hilang begitu persiapan selesai. Kuncinya ada pada tiga hal: dokumen, kesehatan, dan pemahaman manasik.

Dokumen yang umumnya perlu disiapkan antara lain paspor yang masih berlaku, KTP, kartu keluarga, dan pas foto. Setiap agen biasanya memberikan daftar dokumen terbaru, jadi pastikan mengikuti daftar dari agen Anda dan menyerahkan dokumen jauh sebelum keberangkatan, bukan di menit terakhir.

Dari sisi kesehatan, istirahat yang cukup sebelum berangkat sangat membantu. Perjalanan dan rangkaian ibadah membutuhkan stamina. Bawa obat pribadi bila ada, jaga cairan tubuh, dan jangan memaksakan diri saat badan terasa lelah. Ibadah yang tenang lebih baik daripada memaksakan semua rangkaian dalam satu waktu.

Pelajari juga urutan manasik secara garis besar sebelum berangkat: ihram, thawaf, sai, dan tahallul. Anda tidak perlu menghafal semuanya sendiri — pembimbing rombongan akan mendampingi — tetapi memahami garis besarnya membuat Anda lebih tenang dan fokus beribadah.

Terakhir, siapkan barang secukupnya. Pakaian yang nyaman, alas kaki yang mudah dilepas, dan tas kecil untuk barang penting biasanya sudah cukup. Sisanya bisa dibeli di sana. Yang paling penting dibawa adalah niat, kesabaran, dan kesiapan hati.',
  '',
  'Panduan',
  'published',
  'u_admin_chatour',
  'Panduan Umroh pertama kali: dokumen, persiapan kesehatan, manasik, dan tips packing dari Chatour Travel.',
  '2026-11-17T09:00:00.000Z',
  '2026-11-17T09:00:00.000Z',
  '2026-11-17T09:00:00.000Z'
);
-- Artikel contoh 2 (published). Isi umum, tanpa harga/izin/jadwal spesifik.
INSERT OR IGNORE INTO posts (id, slug, title, excerpt, content, cover_url, category, status, author_id, meta_description, created_at, updated_at, published_at) VALUES (
  'post_umroh_reguler_plus',
  'umroh-reguler-vs-umroh-plus',
  'Perbedaan Umroh Reguler dan Umroh Plus: Mana yang Cocok untukmu?',
  'Umroh reguler dan Umroh plus sama-sama ibadah Umroh, bedanya ada pada durasi dan destinasi tambahan. Kenali perbedaannya sebelum memilih paket.',
  'Umroh reguler umumnya berfokus pada ibadah di Makkah dan Madinah. Rangkaian perjalanannya lebih singkat dan padat, sehingga cocok bagi jamaah yang waktunya terbatas atau yang ingin fokus sepenuhnya pada ibadah.

Umroh plus menambahkan destinasi di luar dua kota suci, misalnya kunjungan ke negara lain sebelum atau sesudah rangkaian Umroh. Durasinya lebih panjang dan pengalamannya lebih beragam, tetapi tentu membutuhkan waktu dan biaya yang lebih besar.

Tidak ada pilihan yang lebih baik secara mutlak — yang ada adalah yang paling cocok dengan kondisi Anda. Pertimbangkan waktu cuti yang tersedia, kondisi fisik, dan siapa saja yang ikut berangkat. Jamaah yang membawa anak kecil atau orang tua, misalnya, perlu mempertimbangkan durasi perjalanan dengan lebih hati-hati.

Apa pun pilihannya, pastikan paket yang diambil jelas fasilitasnya: maskapai, hotel, jarak hotel ke masjid, makan, dan pendampingan selama perjalanan. Tanyakan semua itu di awal agar tidak ada kejutan di tengah jalan. Tim Chatour Travel siap membantu Anda membandingkan paket sebelum memutuskan.',
  '',
  'Info',
  'published',
  'u_admin_chatour',
  'Perbedaan Umroh reguler dan Umroh plus: durasi, destinasi, dan cara memilih paket yang cocok dari Chatour Travel.',
  '2026-11-17T09:00:00.000Z',
  '2026-11-17T09:00:00.000Z',
  '2026-11-17T09:00:00.000Z'
);
