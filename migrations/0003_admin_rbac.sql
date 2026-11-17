-- Admin platform RBAC — dibuat oleh scripts/make-admin.mjs. Hash di sini aman disimpan;
-- password awalnya HANYA ditampilkan saat script dijalankan (jangan commit passwordnya).
-- Kolom role di users + status di stores (idempotent dalam arti migrasi hanya jalan sekali via wrangler).
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'merchant';
ALTER TABLE stores ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log (actor_id);
-- Akun super admin: admin@chatourtravel.com (username "admin", tanpa toko — /admin adalah panel, bukan storefront).
-- Bila email sudah ada (mis. dibuat manual), INSERT diabaikan dan UPDATE di bawah yang menaikkan role-nya.
INSERT OR IGNORE INTO users (id, email, username, password_hash, first_name, last_name, bio, whatsapp_number, avatar_url, created_at, role) VALUES ('u_admin_chatour', 'admin@chatourtravel.com', 'admin', '1160b635623e3f3a1b1b317cd87d4eb0:026024704e990d9016e729363a892e10615c8f367f512b14206e10426581df93', 'Admin', 'Chatour', 'Super Admin Chatour Travel', '', '', '2026-11-17T09:32:59.847Z', 'super_admin');
UPDATE users SET role = 'super_admin' WHERE email = 'admin@chatourtravel.com';
