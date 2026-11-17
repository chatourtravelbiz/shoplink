// POST /api/auth/signup|login|logout, GET /api/auth/session|check-username
import { Hono } from 'hono';
import type { App, UserRow } from '../types';
import { err, jsonBody } from '../lib/http';
import { hashPassword, newId, verifyPassword } from '../lib/crypto';
import { clearSessionCookie, createSession, getSessionToken, getSessionUser, isSecureRequest } from '../lib/auth';
import { getStoreByUsername, publicStore, publicUser } from '../lib/db';
import { isEmail, isUsername, RESERVED_USERNAMES, str } from '../lib/validation';
import { normalizeWaDigits } from '../lib/whatsapp';

export const authRoutes: App = new Hono();

authRoutes.post('/auth/signup', async (c) => {
  const body = await jsonBody(c);
  const email = str(body?.email).toLowerCase();
  const username = str(body?.username, 30).toLowerCase();
  const password = String(body?.password ?? '');
  const firstName = str(body?.first_name, 60);
  const lastName = str(body?.last_name, 60);
  const whatsapp = str(body?.whatsapp_number, 20);
  if (!isEmail(email)) return err(c, 400, 'Email tidak valid.');
  if (!isUsername(username)) return err(c, 400, 'Username harus 3–30 karakter, huruf kecil, angka, atau underscore.');
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
    `INSERT INTO users (id, email, username, password_hash, first_name, last_name, bio, whatsapp_number, avatar_url, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  )
    .bind(userId, email, username, await hashPassword(password), firstName || null, lastName || null, '', whatsapp, '', now)
    .run();
  await c.env.DB.prepare(
    `INSERT INTO stores (username, user_id, email, first_name, last_name, user_bio, whatsapp_number, avatar_url, logo_url, store_name, tagline, store_bio, currency, theme, section_order, trust_badges_json, banners_json)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`,
  )
    .bind(
      username, userId, email, firstName || null, lastName || null, '', whatsapp, '', '',
      username, 'Belanja lewat WhatsApp', '', 'IDR', 'emerald', 'showcase-first',
      JSON.stringify([{ text: 'Fast Respon via WhatsApp' }, { text: 'Berizin Resmi PPIU' }, { text: 'Pembimbing Bersertifikat BNSP' }]), '[]',
    )
    .run();

  c.header('Set-Cookie', await createSession(c.env, userId, isSecureRequest(c.req.raw)));
  return c.json({ user: { id: userId, email, username, first_name: firstName, last_name: lastName, whatsapp_number: whatsapp } }, 201);
});

authRoutes.post('/auth/login', async (c) => {
  const body = await jsonBody(c);
  const email = str(body?.email).toLowerCase();
  const password = String(body?.password ?? '');
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(email).first<UserRow>();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return err(c, 401, 'Email atau password salah.');
  }
  c.header('Set-Cookie', await createSession(c.env, row.id, isSecureRequest(c.req.raw)));
  return c.json({ user: publicUser(row) });
});

authRoutes.post('/auth/logout', async (c) => {
  const token = getSessionToken(c.req.raw);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?1').bind(token).run();
  c.header('Set-Cookie', clearSessionCookie());
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
    return c.json({ available: false, error: 'Username harus 3–30 karakter (huruf kecil, angka, underscore).' });
  }
  const row = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?1').bind(username).first();
  return c.json({ available: !row });
});
