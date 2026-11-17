// Session cookie sendiri (tanpa library auth). Cookie: HttpOnly, SameSite=Lax,
// Secure saat request HTTPS (di production), masa berlaku 7 hari.
import type { Env, UserRow } from '../types';
import { newSessionToken } from './crypto';

export const SESSION_COOKIE = 'shoplink_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionCookie(token: string, expiresAt: Date, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getSessionToken(req: Request): string | null {
  const cookie = req.headers.get('Cookie');
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === SESSION_COOKIE) return rest.join('=').trim() || null;
  }
  return null;
}

export function isSecureRequest(req: Request): boolean {
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function createSession(env: Env, userId: string, secure: boolean): Promise<string> {
  const token = newSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(token, userId, expiresAt.toISOString(), now.toISOString())
    .run();
  return sessionCookie(token, expiresAt, secure);
}

export async function getSessionUser(env: Env, req: Request): Promise<UserRow | null> {
  const token = getSessionToken(req);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT users.* FROM sessions INNER JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?1 AND sessions.expires_at > ?2`,
  )
    .bind(token, new Date().toISOString())
    .first<UserRow>();
  return row ?? null;
}
