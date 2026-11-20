// POST /api/auth/signup|login|logout, GET /api/auth/session|check-username
import { Hono } from 'hono';
import type { App, Env, UserRow } from '../types';
import { err, jsonBody } from '../lib/http';
import { hashPassword, newId, verifyPassword } from '../lib/crypto';
import { clearSessionCookie, createSession, getSessionToken, getSessionUser, isSecureRequest } from '../lib/auth';
import { getStoreByUsername, publicStore, publicUser } from '../lib/db';
import { isEmail, isUsername, RESERVED_USERNAMES, str } from '../lib/validation';
import { normalizeWaDigits } from '../lib/whatsapp';
import { createVerification, sendVerificationEmail } from '../lib/email';

export const authRoutes: App = new Hono();

/** Buat toko untuk user yang baru terverifikasi (dipakai hanya di /verify). */
async function createStoreForUser(env: Env, u: UserRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO stores (username, user_id, email, first_name, last_name, user_bio, whatsapp_number, avatar_url, logo_url, store_name, tagline, store_bio, currency, theme, section_order, trust_badges_json, banners_json)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`,
  )
    .bind(
      u.username, u.id, u.email, u.first_name || null, u.last_name || null, '', u.whatsapp_number, '', '',
      u.username, 'Belanja lewat WhatsApp', '', 'IDR', 'emerald', 'showcase-first',
      JSON.stringify([{ text: 'Fast Respon via WhatsApp' }, { text: 'Berizin Resmi PPIU' }, { text: 'Pembimbing Bersertifikat BNSP' }]), '[]',
    )
    .run();
}

authRoutes.post('/auth/signup', async (c) => {
  const body = await jsonBody(c);
  const email = str(body?.email).toLowerCase();
  const username = str(body?.username, 30).toLowerCase();
  const password = String(body?.password ?? '');
  const firstName = str(body?.first_name, 60);
  const lastName = str(body?.last_name, 60);
  const whatsapp = str(body?.whatsapp_number, 20);
  if (!isEmail(email)) return err(c, 400, 'Email tidak valid.');
  if (!isUsername(username)) return err(c, 400, 'Username harus 3–30 karakter, huruf kecil atau angka.');
  if (RESERVED_USERNAMES.has(username)) return err(c, 400, 'Username ini dipakai sistem, pilih yang lain.');
  if (password.length < 6 || password.length > 128) return err(c, 400, 'Password minimal 6 karakter.');
  if (!whatsapp) return err(c, 400, 'Nomor WhatsApp wajib diisi.');
  if (normalizeWaDigits(whatsapp).length < 9) return err(c, 400, 'Nomor WhatsApp tidak valid.');

  const byEmail = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first();
  if (byEmail) return err(c, 409, 'Email sudah terdaftar.');
  const byUsername = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?1').bind(username).first();
  if (byUsername) return err(c, 409, 'Username sudah dipakai.');

  const userId = newId('u');
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, username, password_hash, first_name, last_name, bio, whatsapp_number, avatar_url, email_verified, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10)`,
  )
    .bind(userId, email, username, await hashPassword(password), firstName || null, lastName || null, '', whatsapp, '', now)
    .run();

  // Akun BELUM aktif: toko baru dibuat setelah email terverifikasi, dan
  // belum ada session. Kirim tautan verifikasi via Resend (bila kuncinya
  // sudah diisi admin); bila email gagal terkirim, user tetap bisa minta
  // kirim ulang dari halaman login.
  const link = await createVerification(c.env, userId);
  const sent = await sendVerificationEmail(c.env, email, firstName || username, link);
  return c.json({
    user: { id: userId, email, username, first_name: firstName, last_name: lastName, whatsapp_number: whatsapp },
    email_sent: sent.ok,
  }, 201);
});

authRoutes.post('/auth/login', async (c) => {
  const body = await jsonBody(c);
  const email = str(body?.email).toLowerCase();
  const password = String(body?.password ?? '');
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(email).first<UserRow>();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return err(c, 401, 'Email atau password salah.');
  }
  if (!row.email_verified) {
    return c.json({ error: 'Email kamu belum diverifikasi. Cek inbox (dan folder spam), lalu klik tautan verifikasi.', code: 'email_not_verified' }, 403);
  }
  c.header('Set-Cookie', await createSession(c.env, row.id, isSecureRequest(c.req.raw)));
  return c.json({ user: publicUser(row) });
});

// GET /api/auth/verify?token=... — tautan dari email verifikasi. Sukses:
// tandai terverifikasi + buat toko, lalu arahkan ke login. Gagal/kadaluarsa:
// arahkan ke login dengan pesan.
authRoutes.get('/auth/verify', async (c) => {
  const base = (c.env.APP_URL || 'https://chatourtravel.com').replace(/\/$/, '');
  const token = (c.req.query('token') || '').trim();
  const fail = (q: string) => c.redirect(`${base}/login?verify=${q}`, 302);
  if (!token) return fail('invalid');
  const row = await c.env.DB.prepare(
    'SELECT * FROM email_verifications WHERE token = ?1',
  )
    .bind(token)
    .first<{ id: string; user_id: string; expires_at: string; used_at: string | null }>();
  if (!row) return fail('invalid');
  if (row.used_at) return fail('used');
  if (new Date(row.expires_at).getTime() < Date.now()) return fail('expired');
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(row.user_id).first<UserRow>();
  if (!user) return fail('invalid');
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE email_verifications SET used_at = ?1 WHERE id = ?2').bind(now, row.id).run();
  await c.env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?1').bind(user.id).run();
  const store = await getStoreByUsername(c.env, user.username);
  if (!store) await createStoreForUser(c.env, user);
  return c.redirect(`${base}/login?verified=1`, 302);
});

// POST /api/auth/resend-verification {email} — kirim ulang email verifikasi.
authRoutes.post('/auth/resend-verification', async (c) => {
  const body = await jsonBody(c);
  const email = str(body?.email).toLowerCase();
  if (!isEmail(email)) return err(c, 400, 'Email tidak valid.');
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(email).first<UserRow>();
  // Balasan sama bila email tidak dikenal — jangan bocorkan keberadaan akun.
  if (!user) return c.json({ ok: true, email_sent: false });
  if (user.email_verified) return err(c, 400, 'Email ini sudah terverifikasi. Silakan masuk.');
  const last = await c.env.DB.prepare(
    'SELECT token, expires_at, created_at FROM email_verifications WHERE user_id = ?1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',
  )
    .bind(user.id)
    .first<{ token: string; expires_at: string; created_at: string }>();
  if (last && Date.now() - new Date(last.created_at).getTime() < 60_000) {
    return err(c, 429, 'Tunggu sebentar sebelum meminta email verifikasi lagi.');
  }
  let link: string;
  if (last && new Date(last.expires_at).getTime() > Date.now()) {
    const base = (c.env.APP_URL || 'https://chatourtravel.com').replace(/\/$/, '');
    link = `${base}/api/auth/verify?token=${last.token}`;
  } else {
    link = await createVerification(c.env, user.id);
  }
  const sent = await sendVerificationEmail(c.env, user.email, user.first_name || user.username, link);
  return c.json({ ok: true, email_sent: sent.ok });
});

authRoutes.post('/auth/logout', async (c) => {
  const token = getSessionToken(c.req.raw);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?1').bind(token).run();
  c.header('Set-Cookie', clearSessionCookie());
  return c.json({ ok: true });
});

// POST /api/auth/change-password — ganti password akun yang sedang login.
// Butuh password saat ini; sesi di perangkat lain dicabut, sesi ini tetap jalan.
authRoutes.post('/auth/change-password', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const body = await jsonBody(c);
  const current = String(body?.current_password ?? '');
  const next = String(body?.new_password ?? '');
  const confirm = String(body?.confirm_password ?? '');
  if (next.length < 6) return err(c, 400, 'Password baru minimal 6 karakter.');
  if (next !== confirm) return err(c, 400, 'Konfirmasi password baru tidak cocok.');
  if (next === current) return err(c, 400, 'Password baru sama dengan password saat ini.');
  if (!(await verifyPassword(current, user.password_hash))) {
    return err(c, 400, 'Password saat ini salah.');
  }
  await c.env.DB.prepare('UPDATE users SET password_hash = ?1 WHERE id = ?2')
    .bind(await hashPassword(next), user.id)
    .run();
  const token = getSessionToken(c.req.raw);
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND token != ?2')
      .bind(user.id, token)
      .run();
  }
  return c.json({ ok: true });
});

authRoutes.get('/auth/session', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const store = await getStoreByUsername(c.env, user.username);
  return c.json({ user: publicUser(user), store: store ? publicStore(store) : null });
});

authRoutes.get('/auth/check-username', async (c) => {
  const username = str(c.req.query('username'), 30).toLowerCase();
  if (!isUsername(username) || RESERVED_USERNAMES.has(username)) {
    return c.json({ available: false, error: 'Username harus 3–30 karakter (huruf kecil, angka).' });
  }
  const row = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?1').bind(username).first();
  return c.json({ available: !row });
});
