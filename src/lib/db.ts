// Mapper baris D1 -> JSON publik + pencatat analitik.
// Semua query memakai prepared statement .bind(); tidak ada interpolasi value
// (bahkan nama kolom tidak diinterpolasi — view/click memakai dua statement terpisah).
import type { Env, OrderRow, PostRow, ProductRow, ShowcaseRow, StoreRow, UserRow } from '../types';
import { dayStr, parseJson } from './http';
import { parseSocialLinksJson } from './social';
import { newId } from './crypto';

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    first_name: u.first_name,
    last_name: u.last_name,
    bio: u.bio ?? '',
    whatsapp_number: u.whatsapp_number,
    avatar_url: u.avatar_url ?? '',
    role: u.role ?? 'merchant',
  };
}

export function publicStore(s: StoreRow) {
  return {
    username: s.username,
    user_id: s.user_id,
    email: s.email,
    first_name: s.first_name,
    last_name: s.last_name,
    user_bio: s.user_bio ?? '',
    whatsapp_number: s.whatsapp_number,
    avatar_url: s.avatar_url ?? '',
    logo_url: s.logo_url ?? '',
    store_name: s.store_name,
    tagline: s.tagline,
    store_bio: s.store_bio ?? '',
    currency: s.currency,
    theme: s.theme ?? 'chatour',
    button_style: s.button_style || 'rounded',
    show_badge: s.show_badge === 0 ? 0 : 1,
    section_order: s.section_order || 'showcase-first',
    status: s.status ?? 'active',
    custom_domain: s.custom_domain ?? '',
    custom_domain_request: s.custom_domain_request ?? '',
    social_links: parseSocialLinksJson(s.social_links),
    trust_badges: parseJson(s.trust_badges_json, [] as Array<{ text: string }>),
    banners: parseJson(s.banners_json, [] as string[]),
  };
}

export function publicProduct(p: ProductRow) {
  return {
    id: p.product_id,
    store_username: p.store_username,
    image_url: p.image_url,
    images: parseJson(p.images_json, [p.image_url] as string[]),
    name: p.name,
    price: p.price,
    description: p.description,
    status: p.status,
    created_at: p.created_at,
    category: p.category,
    stock: p.stock,
    collection: p.collection_name ?? undefined,
    variants: parseJson(p.variants_json, [] as unknown[]),
    highlights: parseJson(p.highlights_json, [] as string[]),
  };
}

export function publicPost(p: PostRow) {
  return {
    id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt ?? '',
    content: p.content ?? '', cover_url: p.cover_url ?? '', category: p.category ?? 'Info',
    status: p.status ?? 'draft', author_id: p.author_id ?? null,
    meta_description: p.meta_description ?? '', created_at: p.created_at,
    updated_at: p.updated_at, published_at: p.published_at ?? null,
  };
}

export function publicShowcase(s: ShowcaseRow) {
  return {
    id: s.id, store_username: s.store_username, title: s.title,
    description: s.description ?? '', image_url: s.image_url ?? '',
    link_url: s.link_url ?? '', file_url: s.file_url ?? '',
    sort_order: s.sort_order ?? 0, created_at: s.created_at,
  };
}

export function publicOrder(o: OrderRow, productName?: string) {
  return {
    id: o.id,
    store_username: o.store_username,
    product_id: o.product_id,
    product_name: productName ?? o.product_id,
    quantity: o.quantity,
    revenue: o.revenue,
    date: o.date,
    notes: o.notes ?? '',
    status: o.status,
    customer_name: o.customer_name ?? '',
    customer_phone: o.customer_phone ?? '',
    customer_address: o.customer_address ?? '',
    payment_method: o.payment_method,
  };
}

export async function getStoreByUsername(env: Env, username: string): Promise<StoreRow | null> {
  return (await env.DB.prepare('SELECT * FROM stores WHERE username = ?1').bind(username).first<StoreRow>()) ?? null;
}

/** Fondasi custom domain agen: cari toko aktif dari hostname-nya. */
export async function getStoreByCustomDomain(env: Env, host: string): Promise<StoreRow | null> {
  const row = await env.DB.prepare('SELECT * FROM stores WHERE custom_domain = ?1')
    .bind(host.toLowerCase())
    .first<StoreRow>();
  if (!row || (row.status ?? 'active') === 'suspended') return null;
  return row;
}

/** Catat view/click. Gagal analitik tidak boleh menggagalkan request utama. */
export async function trackEvent(
  env: Env,
  storeUsername: string,
  eventType: 'view' | 'click',
  pagePath?: string,
  referrer?: string | null,
  productId?: string | null,
): Promise<void> {
  const today = dayStr(new Date());
  const now = new Date().toISOString();
  try {
    if (eventType === 'view') {
      await env.DB.prepare(
        `INSERT INTO analytics_daily (store_username, metric_date, views, clicks) VALUES (?1, ?2, 1, 0)
         ON CONFLICT(store_username, metric_date) DO UPDATE SET views = analytics_daily.views + 1`,
      )
        .bind(storeUsername, today)
        .run();
    } else {
      await env.DB.prepare(
        `INSERT INTO analytics_daily (store_username, metric_date, views, clicks) VALUES (?1, ?2, 0, 1)
         ON CONFLICT(store_username, metric_date) DO UPDATE SET clicks = analytics_daily.clicks + 1`,
      )
        .bind(storeUsername, today)
        .run();
    }
    let host = 'direct';
    if (referrer) {
      try {
        host = new URL(referrer).hostname;
      } catch {
        host = 'direct';
      }
    }
    await env.DB.prepare(
      `INSERT INTO analytics_events (id, store_username, event_type, metric_date, source, referrer_host, page_path, product_id, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
      .bind(newId('ae'), storeUsername, eventType, today, host, host, pagePath ?? null, productId || null, now)
      .run();
  } catch {
    // Diam-diam abaikan: analitik tidak kritis.
  }
}
