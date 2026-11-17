// Generate migrations/0003_admin_rbac.sql: skema RBAC + akun super admin.
// Password awal dibuat acak tiap pembuatan file (16 karakter, huruf+angka).
// Hash PBKDF2-SHA256 100.000 iterasi, format salt:hash — sama seperti make-seed.mjs.
// JANGAN jalankan ulang setelah file ada: script berhenti bila 0003 sudah ada,
// supaya hash (dan password awal) tidak berubah tanpa sengaja.
// Jalankan:  node scripts/make-admin.mjs
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'migrations', '0003_admin_rbac.sql');
if (existsSync(out)) {
  console.log('0003 sudah ada — tidak digenerate ulang. Hapus file-nya dulu bila memang ingin membuat ulang.');
  process.exit(0);
}

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
let password = process.env.ADMIN_INITIAL_PASSWORD || '';
if (!password) {
  const bytes = randomBytes(16);
  for (const b of bytes) password += alphabet[b % alphabet.length];
}

const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100_000, 32, 'sha256').toString('hex');
const passwordHash = `${salt}:${hash}`;
const now = new Date().toISOString();
const q = (v) => `'${String(v ?? '').replace(/'/g, "''")}'`;

const lines = [
  '-- Admin platform RBAC — dibuat oleh scripts/make-admin.mjs. Hash di sini aman disimpan;',
  '-- password awalnya HANYA ditampilkan saat script dijalankan (jangan commit passwordnya).',
  '-- Kolom role di users + status di stores (idempotent dalam arti migrasi hanya jalan sekali via wrangler).',
  `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'merchant';`,
  `ALTER TABLE stores ADD COLUMN status TEXT NOT NULL DEFAULT 'active';`,
  `CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, target_type TEXT, target_id TEXT, created_at TEXT NOT NULL);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log (actor_id);`,
  '-- Akun super admin: admin@chatourtravel.com (username "admin", tanpa toko — /admin adalah panel, bukan storefront).',
  `-- Bila email sudah ada (mis. dibuat manual), INSERT diabaikan dan UPDATE di bawah yang menaikkan role-nya.`,
  `INSERT OR IGNORE INTO users (id, email, username, password_hash, first_name, last_name, bio, whatsapp_number, avatar_url, created_at, role) VALUES (${q('u_admin_chatour')}, ${q('admin@chatourtravel.com')}, ${q('admin')}, ${q(passwordHash)}, ${q('Admin')}, ${q('Chatour')}, ${q('Super Admin Chatour Travel')}, '', '', ${q(now)}, ${q('super_admin')});`,
  `UPDATE users SET role = 'super_admin' WHERE email = 'admin@chatourtravel.com';`,
];
writeFileSync(out, lines.join('\n') + '\n');
console.log(`Migration ditulis ke ${out}`);
console.log(`ADMIN_PASSWORD=${password}`);
