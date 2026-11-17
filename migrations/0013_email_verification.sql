-- Verifikasi email saat signup (via Resend) + pengaturan platform.
-- Akun baru tidak aktif sebelum email terverifikasi: users.email_verified
-- 0 saat daftar (dibuat 1 saat klik tautan verifikasi); akun lama diisi 1
-- agar tidak ada yang terkunci.
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
UPDATE users SET email_verified = 1;

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications (token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications (user_id);

-- Pengaturan platform (key-value). Kunci API Resend diisi admin lewat
-- /admin → Pengaturan, bukan di kode/env; tidak pernah dikirim utuh ke client.
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
