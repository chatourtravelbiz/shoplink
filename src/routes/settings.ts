// GET /api/settings, PUT /api/settings — pengaturan toko sendiri (auth).
import { Hono } from 'hono';
import type { App } from '../types';
import { err, jsonBody } from '../lib/http';
import { getSessionUser } from '../lib/auth';
import { getStoreByUsername, publicStore, publicUser } from '../lib/db';
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
  const sectionOrder = str(body.section_order, 20) || 'products-first';
  const logoUrl = str(body.logo_url, 500);
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
       social_links = ?11 WHERE username = ?12`,
  )
    .bind(storeName, tagline, storeBio, whatsapp, currency, theme, logoUrl, buttonStyle, showBadge, sectionOrder, JSON.stringify(socialLinks), user.username)
    .run();
  await c.env.DB.prepare('UPDATE users SET whatsapp_number = ?1 WHERE id = ?2').bind(whatsapp, user.id).run();
  const store = await getStoreByUsername(c.env, user.username);
  return c.json({ store: store ? publicStore(store) : null });
});
