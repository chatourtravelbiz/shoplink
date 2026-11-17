// Meta Open Graph untuk halaman toko & produk — dibaca crawler WhatsApp/
// Telegram/Facebook saat tautan dibagikan (mereka tidak menjalankan JS,
// jadi meta harus disuntik server-side ke shell SPA sebelum dikirim).
import type { Env, ProductRow, StoreRow } from '../types';
import { publicProduct, publicStore } from './db';

const escAttr = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Jadikan URL absolut; hanya http(s) atau path absolut yang diterima. */
function absUrl(env: Env, url: string | null | undefined): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${(env.APP_URL || 'https://chatourtravel.com').replace(/\/$/, '')}${u}`;
  return '';
}

function desc(text: string, fallback: string): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const d = clean || fallback;
  return d.length > 200 ? `${d.slice(0, 197)}…` : d;
}

export function ogMetaTags(o: { title: string; description: string; image: string; url: string; type: string }): string {
  const { title, description, image, url, type } = o;
  const tags = [
    `<meta property="og:title" content="${escAttr(title)}" />`,
    `<meta property="og:description" content="${escAttr(description)}" />`,
    `<meta property="og:url" content="${escAttr(url)}" />`,
    `<meta property="og:type" content="${escAttr(type)}" />`,
    `<meta property="og:site_name" content="Chatour Travel" />`,
    `<meta property="og:locale" content="id_ID" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escAttr(title)}" />`,
    `<meta name="twitter:description" content="${escAttr(description)}" />`,
  ];
  if (image) {
    tags.push(
      `<meta property="og:image" content="${escAttr(image)}" />`,
      `<meta name="twitter:image" content="${escAttr(image)}" />`,
    );
  }
  return tags.join('\n  ');
}

/** Meta untuk halaman toko (/:username) atau produk (/:username/p/:id). */
export function storeOgMeta(
  env: Env,
  store: StoreRow,
  product: ProductRow | null,
  url: string,
): string {
  const s = publicStore(store);
  const base = env.APP_URL || 'https://chatourtravel.com';
  const logo = absUrl(env, s.logo_url) || absUrl(env, s.avatar_url) || `${base}/logo-chatour.png`;
  if (product) {
    const p = publicProduct(product);
    return ogMetaTags({
      title: `${p.name} — ${s.store_name} | Chatour Travel`,
      description: desc(p.description, `${s.store_name} — agen Umroh & Haji Chatour Travel.`),
      image: absUrl(env, p.image_url) || logo,
      url,
      type: 'product',
    });
  }
  return ogMetaTags({
    title: `${s.store_name} (@${s.username}) — Chatour Travel`,
    description: desc(s.store_bio || s.tagline, `${s.store_name} — agen Umroh & Haji Chatour Travel. Pesan paket lewat WhatsApp.`),
    image: logo,
    url,
    type: 'website',
  });
}
