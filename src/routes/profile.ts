// Company profile + blog SEO (server-rendered) — port dari Worker
// chatour-profile, kini menyatu di shoplink-d1. Konten profile dari
// /content.json (satu file, mudah diedit); artikel dari D1 (tabel posts,
// dikelola admin panel). Tanpa dependensi baru.
import { Hono } from 'hono';
import type { App, AppContext, Env, PostRow } from '../types';
import { serveAssetHtml, serveSpaForStore } from '../lib/spa';
import { renderHome } from '../lib/profile-render';
import { renderArticle, tocHtml, TOC_SCRIPT } from '../lib/toc';

export const profileRoutes: App = new Hono();

const WA_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
const WA_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="${WA_PATH}"/></svg>`;

type ProfileContent = { waLink?: string; shopUrl?: string; email?: string; agen?: { waLink?: string }; faq?: { q: string; a: string }[] };

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

const fmtDate = (iso: string | null): string => {
  try {
    return new Date(iso ?? '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

async function getContent(env: Env): Promise<ProfileContent> {
  try {
    const res = await env.STATIC?.fetch(new Request('http://localhost/content.json'));
    if (res?.ok) return (await res.json()) as ProfileContent;
  } catch {
    // pakai default di bawah
  }
  return { waLink: '#', shopUrl: 'https://demo.chatourtravel.com/', email: 'info@chatourtravel.com' };
}

function header(c: ProfileContent): string {
  return `<header class="topbar"><div class="wrap topbar-inner">
    <a class="brand" href="/"><img src="/logo-chatour.png" alt="Logo Chatour Travel" class="brand-logo" /><span class="brand-name">Chatour Travel</span></a>
    <nav class="nav" aria-label="Navigasi utama">
      <a href="/#tentang">Tentang</a><a href="/#umroh">Paket Umroh</a><a href="/#haji">Paket Haji</a>
      <a href="/blog">Blog</a><a href="/#faq">FAQ</a><a href="/#kontak">Kontak</a>
    </nav>
    <button id="theme-toggle" type="button" class="theme-toggle" aria-label="Ganti mode gelap/terang">🌙</button>
    <a class="btn btn-wa" href="${esc(c.agen?.waLink || c.waLink || '#')}" target="_blank" rel="noopener">${WA_SVG}<span class="btn-wa-label">WhatsApp</span></a>
  </div></header>`;
}

function footer(c: ProfileContent): string {
  return `<footer class="footer"><div class="wrap footer-inner">
    <img src="/logo-chatour.png" alt="Logo Chatour Travel" class="footer-logo" />
    <p><strong>Chatour Travel</strong> — Biro Umroh &amp; Haji</p>
    <nav class="footer-nav">
      <a href="/#tentang">Tentang</a><a href="/#umroh">Paket Umroh</a><a href="/#haji">Paket Haji</a>
      <a href="/blog">Blog</a><a href="/#kontak">Kontak</a>
    </nav>
    <p class="muted">Situs Pusat: <a href="https://chatourtravel.id/" target="_blank" rel="noopener">chatourtravel.id</a></p>
    <p class="muted"><a href="https://www.facebook.com/share/1Fw2HpRVqy/?mibextid=wwXIfr" target="_blank" rel="noopener">Facebook</a> · <a href="https://youtube.com/@chatourofficial" target="_blank" rel="noopener">YouTube</a> · <a href="https://www.instagram.com/chatourtravelofficial" target="_blank" rel="noopener">Instagram</a> · <a href="https://tiktok.com/@chatour.official" target="_blank" rel="noopener">TikTok</a> · <a href="https://play.google.com/store/apps/details?id=com.chatour.jamaah.app" target="_blank" rel="noopener">Aplikasi Jamaah</a></p>
    <p class="muted">© ${new Date().getFullYear()} Chatour Travel. Semua hak dilindungi.</p>
  </div></footer><button id="scroll-top" type="button" class="scroll-top" aria-label="Kembali ke atas">↑</button>`;
}

/** Saklar mode gelap halaman blog (beranda memakai profile.js). */
const THEME_SCRIPT = `<script>(function(){var b=document.getElementById('theme-toggle');if(!b)return;var s=function(){b.textContent=document.documentElement.classList.contains('dark')?'☀️':'🌙'};s();b.addEventListener('click',function(){var d=document.documentElement.classList.toggle('dark');try{localStorage.setItem('ct-theme',d?'dark':'light')}catch(e){}s();});})();</script>`;

/** Tombol kembali ke atas halaman blog (beranda memakai profile.js). */
const SCROLL_SCRIPT = `<script>(function(){var b=document.getElementById('scroll-top');if(!b)return;var t=function(){b.classList.toggle('show',window.scrollY>400)};t();window.addEventListener('scroll',t,{passive:true});b.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});})();</script>`;

// Akordeon FAQ (halaman blog) — logika sama dengan profile.js di beranda.
const FAQ_SCRIPT = `<script>document.addEventListener('click',function(e){var b=e.target.closest('[data-faq]');if(!b)return;var a=b.closest('.faq-item').querySelector('.faq-a');var open=a.hasAttribute('hidden');a.toggleAttribute('hidden',!open);b.setAttribute('aria-expanded',String(open));b.querySelector('span').textContent=open?'−':'+';});</script>`;

// Seksi FAQ — dipakai halaman blog (beranda punya versinya di profile.html).
const faqSection = (c: ProfileContent): string => {
  const items = c.faq || [];
  if (!items.length) return '';
  return `<section class="section section-alt" id="faq"><div class="wrap">
    <h2>Masih Ragu? Ini Jawabannya</h2>
    <p class="lead">Pertanyaan yang paling sering ditanyakan calon jamaah.</p>
    <div id="faq-list">${items.map((f, i) => `<div class="faq-item">
      <button class="faq-q" type="button" aria-expanded="${i === 0}" data-faq="${i}">${esc(f.q)}<span aria-hidden="true">${i === 0 ? '−' : '+'}</span></button>
      <div class="faq-a" ${i === 0 ? '' : 'hidden'}>${esc(f.a)}</div>
    </div>`).join('')}</div></div></section>`;
};

function page(site: string, opts: {
  title: string; description: string; canonical: string; ogImage?: string;
  jsonLd?: object; body: string; content: ProfileContent; script?: string;
}): Response {
  const { title, description, canonical, ogImage, jsonLd, body, content, script } = opts;
  const meta = `<meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Chatour Travel" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(ogImage || `${site}/logo-chatour.png`)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/png" href="/logo-chatour.png" />
  <link rel="stylesheet" href="/profile.css" />
  <script>try{var t=localStorage.getItem('ct-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}</script>`;
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  return new Response(`<!doctype html><html lang="id"><head>${meta}${ld}</head><body>${header(content)}<main>${body}</main>${footer(content)}${script || ''}${THEME_SCRIPT}${SCROLL_SCRIPT}</body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

async function listPosts(env: Env): Promise<PostRow[]> {
  try {
    const rows = await env.DB.prepare(
      "SELECT slug, title, excerpt, cover_url, category, published_at FROM posts WHERE status = 'published' ORDER BY published_at DESC, created_at DESC LIMIT 100",
    ).all<PostRow>();
    return rows.results ?? [];
  } catch {
    return []; // DB belum punya tabel posts (mis. dev lokal): blog kosong, bukan 500.
  }
}

const siteOf = (c: AppContext): string => c.env.APP_URL || 'https://chatourtravel.com';

// Beranda = company profile, dirender di server agar isinya terbaca Google/curl.
// Di host custom domain agen, / adalah tokonya.
profileRoutes.get('/', async (c) => {
  const customStore = c.get('customStore');
  if (customStore) return serveSpaForStore(c, customStore);
  const rendered = await renderHome(c.env);
  if (rendered) return rendered;
  const res = await serveAssetHtml(c, 'profile.html');
  if (res) return res;
  return c.text('Halaman tidak ditemukan.', 404);
});

profileRoutes.get('/blog', async (c) => {
  const site = siteOf(c);
  const content = await getContent(c.env);
  const posts = await listPosts(c.env);
  const cards = posts.length
    ? posts.map((p) => `<article class="card">
      ${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="${esc(p.title)}" style="width:100%;border-radius:12px;margin-bottom:12px" loading="lazy" />` : ''}
      <p class="meta">${esc(p.category)} · ${esc(fmtDate(p.published_at))}</p>
      <h3><a href="/blog/${esc(p.slug)}" style="color:inherit;text-decoration:none">${esc(p.title)}</a></h3>
      <p>${esc(p.excerpt)}</p>
      <a class="btn btn-primary" href="/blog/${esc(p.slug)}">Baca Artikel →</a>
    </article>`).join('')
    : '<p class="lead">Belum ada artikel. Silakan kembali lagi.</p>';
  return page(site, {
    title: 'Blog — Info & Berita Umroh dan Haji | Chatour Travel',
    description: 'Artikel, info, dan berita terbaru seputar Umroh dan Haji dari Chatour Travel: panduan, tips, dan persiapan ibadah.',
    canonical: `${site}/blog`,
    body: `<section class="section"><div class="wrap"><h2 style="text-align:center">Blog &amp; Berita</h2>
      <p class="lead">Info, panduan, dan berita terbaru seputar Umroh &amp; Haji.</p>
      <div class="grid cards">${cards}</div></div></section>${faqSection(content)}`,
    content,
    script: FAQ_SCRIPT,
  });
});

profileRoutes.get('/blog/:slug', async (c) => {
  const site = siteOf(c);
  const slug = c.req.param('slug');
  if (!/^[a-z0-9-]+$/.test(slug)) return c.text('Artikel tidak ditemukan.', 404);
  const content = await getContent(c.env);
  let row: PostRow | null = null;
  try {
    row = await c.env.DB.prepare("SELECT * FROM posts WHERE slug = ?1 AND status = 'published'").bind(slug).first<PostRow>();
  } catch {
    row = null;
  }
  if (!row) return c.text('Artikel tidak ditemukan.', 404);
  const canonical = `${site}/blog/${row.slug}`;
  const desc = row.meta_description || row.excerpt || row.title;
  const cover = row.cover_url ? (row.cover_url.startsWith('http') ? row.cover_url : `${site}${row.cover_url}`) : `${site}/logo-chatour.png`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: row.title, description: desc, image: cover,
    datePublished: row.published_at || row.created_at, dateModified: row.updated_at,
    author: { '@type': 'Organization', name: 'Chatour Travel', url: site },
    publisher: { '@type': 'Organization', name: 'Chatour Travel', url: site },
  };
  const { html: articleHtml, toc } = renderArticle(row.content);
  return page(site, {
    title: `${row.title} | Chatour Travel`,
    description: desc, canonical, ogImage: cover, jsonLd, script: toc.length >= 2 ? TOC_SCRIPT : undefined,
    body: `<section class="section"><div class="wrap" style="max-width:760px">
      <p><a href="/blog">← Semua Artikel</a></p>
      <p class="meta">${esc(row.category)} · ${esc(fmtDate(row.published_at))}</p>
      <h1>${esc(row.title)}</h1>
      ${row.cover_url ? `<img src="${esc(row.cover_url)}" alt="${esc(row.title)}" style="width:100%;border-radius:12px;margin:16px 0" />` : ''}
      ${tocHtml(toc)}
      <div class="article-body">${articleHtml}</div>
      <p class="note" style="margin-top:32px">Punya pertanyaan tentang paket Umroh &amp; Haji? <a href="${esc(content.agen?.waLink || content.waLink || '#')}" target="_blank" rel="noopener">Hubungi kami via WhatsApp</a>.</p>
    </div></section>`,
    content,
  });
});

profileRoutes.get('/sitemap.xml', async (c) => {
  const site = siteOf(c);
  const posts = await listPosts(c.env);
  const urls = ['', '/blog', ...posts.map((p) => `/blog/${p.slug}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site}${u}</loc></url>`).join('\n')}\n</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
});

profileRoutes.get('/robots.txt', (c) => {
  const site = siteOf(c);
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
});
