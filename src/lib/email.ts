// Email verifikasi via Resend. Kunci API disimpan admin di tabel
// platform_settings (diisi lewat /admin → Pengaturan), bukan di kode/env,
// dan tidak pernah dikirim utuh ke client. Domain pengirim (chatourtravel.com)
// harus sudah terverifikasi di dashboard Resend agar email terkirim.
import type { Env } from '../types';
import { newId, newToken } from './crypto';

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export async function getPlatformSetting(env: Env, key: string): Promise<string> {
  const row = await env.DB.prepare('SELECT value FROM platform_settings WHERE key = ?1')
    .bind(key)
    .first<{ value: string }>();
  return row?.value || '';
}

async function setPlatformSetting(env: Env, key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO platform_settings (key, value, updated_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  )
    .bind(key, value, now)
    .run();
}

export { setPlatformSetting };

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}

export async function getResendStatus(env: Env): Promise<{ configured: boolean; key_masked: string; from: string }> {
  const key = await getPlatformSetting(env, 'resend_api_key');
  const from = (await getPlatformSetting(env, 'resend_from')) || 'Chatour Travel <noreply@chatourtravel.com>';
  return { configured: Boolean(key), key_masked: maskKey(key), from };
}

/** Buat token verifikasi baru (24 jam); token lama yang belum dipakai dihapus. */
export async function createVerification(env: Env, userId: string): Promise<string> {
  await env.DB.prepare("DELETE FROM email_verifications WHERE user_id = ?1 AND used_at IS NULL")
    .bind(userId)
    .run();
  const token = newToken();
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO email_verifications (id, user_id, token, expires_at, used_at, created_at)
     VALUES (?1, ?2, ?3, ?4, NULL, ?5)`,
  )
    .bind(newId('ev'), userId, token, expires, now.toISOString())
    .run();
  const base = (env.APP_URL || 'https://chatourtravel.com').replace(/\/$/, '');
  return `${base}/api/auth/verify?token=${token}`;
}

export async function sendVerificationEmail(
  env: Env,
  to: string,
  name: string,
  link: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = await getPlatformSetting(env, 'resend_api_key');
  if (!key) return { ok: false, error: 'resend_not_configured' };
  const from = (await getPlatformSetting(env, 'resend_from')) || 'Chatour Travel <noreply@chatourtravel.com>';
  const safeName = esc(name || 'Agen');
  const html = `<!doctype html><html><body style="font-family:sans-serif;color:#1c1917;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#b02a00">Verifikasi email kamu</h2>
    <p>Halo ${safeName},</p>
    <p>Terima kasih sudah mendaftar di <b>Chatour Travel</b>. Klik tombol di bawah untuk memverifikasi email ini dan mengaktifkan akun &amp; tokomu:</p>
    <p><a href="${esc(link)}" style="display:inline-block;background:#b02a00;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px">Verifikasi Email Saya</a></p>
    <p>Atau salin tautan ini ke browser:<br><a href="${esc(link)}">${esc(link)}</a></p>
    <p style="color:#78716c;font-size:14px">Tautan berlaku 24 jam. Bila kamu tidak merasa mendaftar, abaikan email ini.</p>
    <p style="color:#78716c;font-size:14px">Chatour Travel — Biro Umroh &amp; Haji</p>
  </body></html>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Verifikasi email akun Chatour Travel',
        html,
        text: `Halo ${name || 'Agen'}, verifikasi email akun Chatour Travel kamu lewat tautan ini (berlaku 24 jam): ${link}`,
      }),
    });
    if (!res.ok) {
      let msg = '';
      try { msg = (await res.json() as { message?: string }).message || ''; } catch { /* abaikan */ }
      return { ok: false, error: msg || `resend_${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'resend_unreachable' };
  }
}
