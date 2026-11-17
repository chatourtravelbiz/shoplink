// GET /api/settings, PUT /api/settings — pengaturan toko sendiri (auth).
import { Hono } from 'hono';
import type { App } from '../types';
import { err, jsonBody } from '../lib/http';
import { getSessionUser } from '../lib/auth';
import { getStoreByUsername, publicStore, publicUser } from '../lib/db';
import { domainError, normalizeDomain } from '../lib/domain';
import { isButtonStyle, isSectionOrder, isTheme, str } from '../lib/validation';
import { normalizeSocialLinks } from '../lib/social';

export const settingsRoutes: App = new Hono();

settingsRoutes.get('/settings', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const store = await getStoreByUsername(c.env, user.username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  return c.json({ store: publicStore(store), user: publicUser(user) });
});

settingsRoutes.put('/settings', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const body = await jsonBody(c);
  if (!body) return err(c, 400, 'Data tidak valid.');
  const storeName = str(body.store_name, 120);
  const tagline = str(body.tagline, 200);
  const storeBio = str(body.store_bio, 2000);
  const whatsapp = str(body.whatsapp_number, 20);
  const currency = str(body.currency, 10).toUpperCase() || 'IDR';
  const theme = str(body.theme, 20) || 'chatour';
  const buttonStyle = str(body.button_style, 20) || 'rounded';
  const showBadge = body.show_badge === 1 || body.show_badge === '1' || body.show_badge === true ? 1 : 0;
  const sectionOrder = str(body.section_order, 20) || 'showcase-first';
  const logoUrl = str(body.logo_url, 500);
  const current = await getStoreByUsername(c.env, user.username);
  // Badge kepercayaan: maks 3, masing-masing maks 40 karakter, yang kosong dibuang.
  // Bila klien lama tidak mengirim field ini, pakai nilai yang sudah tersimpan.
  const trustBadges = Array.isArray(body.trust_badges)
    ? body.trust_badges
        .map((b) => str(typeof b === 'string' ? b : b?.text, 40))
        .filter(Boolean)
        .slice(0, 3)
        .map((text) => ({ text }))
    : current?.trust_badges ?? [];
  if (!storeName) return err(c, 400, 'Nama toko wajib diisi.');
  if (!whatsapp) return err(c, 400, 'Nomor WhatsApp wajib diisi.');
  if (!isTheme(theme)) return err(c, 400, 'Tema tidak valid.');
  if (!isButtonStyle(buttonStyle)) return err(c, 400, 'Bentuk tombol tidak valid.');
  if (!isSectionOrder(sectionOrder)) return err(c, 400, 'Urutan seksi tidak valid.');
  let socialLinks = {};
  try {
    socialLinks = normalizeSocialLinks(
      body.social_links ?? {
        instagram: body.social_instagram,
        facebook: body.social_facebook,
        tiktok: body.social_tiktok,
        youtube: body.social_youtube,
      },
    );
  } catch (e) {
    return err(c, 400, e instanceof Error ? e.message : 'Akun sosial tidak valid.');
  }
  await c.env.DB.prepare(
    `UPDATE stores SET store_name = ?1, tagline = ?2, store_bio = ?3, whatsapp_number = ?4,
       currency = ?5, theme = ?6, logo_url = ?7, button_style = ?8, show_badge = ?9, section_order = ?10,
       social_links = ?11, trust_badges_json = ?12 WHERE username = ?13`,
  )
    .bind(storeName, tagline, storeBio, whatsapp, currency, theme, logoUrl, buttonStyle, showBadge, sectionOrder, JSON.stringify(socialLinks), JSON.stringify(trustBadges), user.username)
    .run();
  await c.env.DB.prepare('UPDATE users SET whatsapp_number = ?1 WHERE id = ?2').bind(whatsapp, user.id).run();
  const store = await getStoreByUsername(c.env, user.username);
  return c.json({ store: store ? publicStore(store) : null });
});

// Pengajuan custom domain oleh agen (hanya diteruskan ke admin, bukan langsung aktif).
settingsRoutes.put('/settings/custom-domain-request', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const domain = normalizeDomain((await jsonBody(c))?.custom_domain);
  const bad = domainError(domain);
  if (bad) return err(c, 400, bad);
  const store = await getStoreByUsername(c.env, user.username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  if ((store.custom_domain ?? '').toLowerCase() === domain) {
    return err(c, 400, 'Domain ini sudah aktif di tokomu.');
  }
  const clash = await c.env.DB.prepare(
    'SELECT username FROM stores WHERE custom_domain = ?1 AND username != ?2',
  ).bind(domain, user.username).first<{ username: string }>();
  if (clash) return err(c, 409, 'Domain sudah dipakai toko lain.');
  await c.env.DB.prepare('UPDATE stores SET custom_domain_request = ?1 WHERE username = ?2')
    .bind(domain, user.username).run();
  return c.json({ ok: true, custom_domain_request: domain });
});

settingsRoutes.delete('/settings/custom-domain-request', async (c) => {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const store = await getStoreByUsername(c.env, user.username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  await c.env.DB.prepare('UPDATE stores SET custom_domain_request = NULL WHERE username = ?1')
    .bind(user.username).run();
  return c.json({ ok: true });
});
