// Custom domain agen — endpoint admin (RBAC via requireAdmin).
// Dipisah dari admin.ts supaya file tetap tipis. Worker TIDAK punya token
// API Cloudflare: pemasangan domain di sisi Cloudflare tetap langkah manual
// oleh Muse (Workers Custom Domains API). Endpoint di sini hanya menyimpan
// domain di D1 + memverifikasi hasilnya + menyetujui/menolak pengajuan agen.
import { Hono } from 'hono';
import type { App } from '../types';
import { err, jsonBody } from '../lib/http';
import { getStoreByUsername } from '../lib/db';
import { domainError, normalizeDomain } from '../lib/domain';
import { logAudit, requireAdmin, type AdminRole } from '../lib/rbac';

export const adminDomainRoutes: App = new Hono();

const ALL_ADMIN: AdminRole[] = ['super_admin', 'admin', 'moderator', 'support'];
const DOMAIN_MANAGE: AdminRole[] = ['super_admin', 'admin'];

// --- Custom domain agen (super_admin + admin). ---
// Worker TIDAK punya token API Cloudflare, jadi pemasangan domain di sisi
// Cloudflare tetap langkah manual oleh Muse (Workers Custom Domains API).
// Endpoint di sini hanya menyimpan domain di D1 + memverifikasi hasilnya.
adminDomainRoutes.put('/admin/stores/:username/custom-domain', async (c) => {
  const me = await requireAdmin(c, DOMAIN_MANAGE);
  if (me instanceof Response) return me;
  const username = c.req.param('username').toLowerCase();
  const domain = normalizeDomain((await jsonBody(c))?.custom_domain);
  const bad = domainError(domain);
  if (bad) return err(c, 400, bad);
  const store = await getStoreByUsername(c.env, username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  const clash = await c.env.DB.prepare(
    'SELECT username FROM stores WHERE custom_domain = ?1 AND username != ?2',
  ).bind(domain, username).first<{ username: string }>();
  if (clash) return err(c, 409, `Domain sudah dipakai toko @${clash.username}.`);
  try {
    await c.env.DB.prepare('UPDATE stores SET custom_domain = ?1 WHERE username = ?2')
      .bind(domain, username).run();
  } catch {
    return err(c, 409, 'Domain sudah dipakai toko lain.');
  }
  await logAudit(c.env, me.id, 'store:custom-domain:set', 'store', username);
  return c.json({ ok: true, custom_domain: domain });
});

adminDomainRoutes.delete('/admin/stores/:username/custom-domain', async (c) => {
  const me = await requireAdmin(c, DOMAIN_MANAGE);
  if (me instanceof Response) return me;
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  await c.env.DB.prepare('UPDATE stores SET custom_domain = NULL WHERE username = ?1')
    .bind(username).run();
  await logAudit(c.env, me.id, 'store:custom-domain:remove', 'store', username);
  return c.json({ ok: true });
});

adminDomainRoutes.get('/admin/stores/:username/custom-domain/check', async (c) => {
  const me = await requireAdmin(c, ALL_ADMIN);
  if (me instanceof Response) return me;
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  const domain = (store.custom_domain ?? '').toLowerCase();
  if (!domain) return err(c, 400, 'Toko ini belum punya domain kustom.');
  // Hanya domain yang tersimpan di D1 yang boleh dicek — bukan URL bebas (anti-SSRF).
  let status: 'active' | 'not-attached' | 'unreachable';
  let message: string;
  try {
    const res = await fetch(`https://${domain}/`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'ChatourTravel-domain-check/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    const html = (await res.text().catch(() => '')).toLowerCase();
    const servesStore = res.status === 200
      && html.includes('window.__custom_store__')
      && html.includes(`"${username}"`);
    if (servesStore) {
      status = 'active';
      message = 'Domain sudah aktif dan menampilkan toko ini.';
    } else {
      status = 'not-attached';
      message = 'Domain sudah bisa dijangkau, tapi belum menampilkan toko ini — domain belum dipasang di Cloudflare atau DNS belum mengarah ke Worker.';
    }
  } catch {
    status = 'unreachable';
    message = 'Domain belum bisa dijangkau — DNS (CNAME) belum dipasang atau belum tersebar. Pasang CNAME dulu, tunggu beberapa menit, lalu periksa lagi.';
  }
  return c.json({ ok: status === 'active', status, message, domain });
});


adminDomainRoutes.post('/admin/stores/:username/custom-domain/approve', async (c) => {
  const me = await requireAdmin(c, DOMAIN_MANAGE);
  if (me instanceof Response) return me;
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  const domain = (store.custom_domain_request ?? '').toLowerCase();
  if (!domain) return err(c, 400, 'Tidak ada pengajuan domain untuk toko ini.');
  const bad = domainError(domain);
  if (bad) return err(c, 400, bad);
  const clash = await c.env.DB.prepare(
    'SELECT username FROM stores WHERE custom_domain = ?1 AND username != ?2',
  ).bind(domain, username).first<{ username: string }>();
  if (clash) return err(c, 409, `Domain sudah dipakai toko @${clash.username}.`);
  try {
    await c.env.DB.prepare(
      'UPDATE stores SET custom_domain = ?1, custom_domain_request = NULL WHERE username = ?2',
    ).bind(domain, username).run();
  } catch {
    return err(c, 409, 'Domain sudah dipakai toko lain.');
  }
  await logAudit(c.env, me.id, 'store:custom-domain:approve', 'store', username);
  return c.json({ ok: true, custom_domain: domain });
});

adminDomainRoutes.post('/admin/stores/:username/custom-domain/reject', async (c) => {
  const me = await requireAdmin(c, DOMAIN_MANAGE);
  if (me instanceof Response) return me;
  const username = c.req.param('username').toLowerCase();
  const store = await getStoreByUsername(c.env, username);
  if (!store) return err(c, 404, 'Toko tidak ditemukan.');
  await c.env.DB.prepare('UPDATE stores SET custom_domain_request = NULL WHERE username = ?1')
    .bind(username).run();
  await logAudit(c.env, me.id, 'store:custom-domain:reject', 'store', username);
  return c.json({ ok: true });
});
