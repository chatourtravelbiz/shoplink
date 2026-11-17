// Render beranda company profile di server (bukan hanya client-side),
// supaya Google + curl melihat isi aslinya: legalitas, alamat, jam,
// sosial, paket. Template tetap public/profile.html, data tetap
// public/content.json; profile.js di browser hanya mengulang isi yang sama.
import type { Env } from '../types';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

const SOCIAL_PATHS: Record<string, string> = {
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  instagram: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.859 0-3.211.016-3.586.061-4.859.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
};

type C = Record<string, any>;

const waHref = (c: C, text?: string): string => {
  const base = c.waLink || '#';
  return text ? `${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}` : base;
};

const socialLinks = (c: C): string =>
  (c.sosial || []).map((s: any) => {
    const d = SOCIAL_PATHS[s.icon] || '';
    const svg = d ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg> ` : '';
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener">${svg}${esc(s.nama)}</a>`;
  }).join(' ');

const card = (judul: string, isi: string): string =>
  `<article class="card feature"><h3>${esc(judul)}</h3><p>${esc(isi)}</p></article>`;

// Keunggulan berkelompok (3 kelompok, maks 8 kartu) dari content.json.
const keunggulanGroups = (c: C): string =>
  (c.keunggulanGroups || []).map((g: any) => `<div class="group"><h3 class="group-title">${esc(g.judul)}</h3><p class="group-sub">${esc(g.sub)}</p><div class="grid">${(g.items || []).map((k: any) => card(k.judul, k.isi)).join('')}</div></div>`).join('');

// Strip legalitas: baris ringkas, bukan kartu besar.
const trustStrip = (c: C): string =>
  (c.legalitas || []).map((l: any) => `<li><strong>${esc(l.judul)}</strong> — ${esc(l.isi)}</li>`).join('');

const stats = (c: C): string =>
  (c.statistik || []).map((s: any) => `<div class="stat"><div class="stat-num">${esc(s.angka)}</div><div class="stat-label">${esc(s.label)}</div></div>`).join('');

// Harga & jadwal ditulis SEKALI di catatan seksi paket, bukan di tiap kartu:
// kartu hanya menampilkan durasi, fasilitas, dan CTA WhatsApp.
const paketCard = (p: any, c: C): string =>
  `<article class="card"><h3>${esc(p.nama)}</h3><p class="meta">${esc(p.durasi)}</p><ul>${(p.fasilitas || []).map((f: string) => `<li>${esc(f)}</li>`).join('')}</ul><a class="btn btn-wa" href="${esc(waHref(c, `Assalamu'alaikum, saya ingin bertanya tentang ${p.nama}.`))}" target="_blank" rel="noopener">Tanya Paket Ini</a></article>`;

/** Ganti isi elemen ber-id di template dengan HTML yang dihitung. */
const fill = (html: string, id: string, inner: string): string =>
  html.replace(new RegExp(`(<[^>]+id="${id}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`), `$1${inner}$3`);

const fillHref = (html: string, id: string, href: string): string =>
  html.replace(new RegExp(`(<[^>]+id="${id}"[^>]*href=")[^"]*(")`), `$1${esc(href)}$2`);

const fillHrefText = (html: string, id: string, href: string, text: string): string =>
  fill(fillHref(html, id, href), id, esc(text));

export async function renderHome(env: Env): Promise<Response | null> {
  let html: string;
  let c: C;
  try {
    const [hRes, cRes] = await Promise.all([
      env.STATIC?.fetch(new Request('http://localhost/profile.html')),
      env.STATIC?.fetch(new Request('http://localhost/content.json')),
    ]);
    if (!hRes?.ok || !cRes?.ok) return null;
    html = await hRes.text();
    c = (await cRes.json()) as C;
  } catch {
    return null;
  }
  const waText = "Assalamu'alaikum, saya ingin bertanya tentang paket Umroh & Haji Chatour Travel.";
  html = html
    .replace(/<h1 id="hero-title">[\s\S]*?<\/h1>/, `<h1 id="hero-title">${esc(c.heroTitle)}</h1>`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(c.biro)} — Biro Umroh &amp; Haji</title>`);
  html = fill(html, 'hero-sub', esc(c.heroSub));
  html = fill(html, 'tentang-text', esc(c.tentang));
  html = fill(html, 'footer-izin', esc(c.izin));
  html = fill(html, 'layanan-list', (c.layanan || []).map((l: string) => `<span class="chip">${esc(l)}</span>`).join(''));
  html = fill(html, 'keunggulan', keunggulanGroups(c));
  html = fill(html, 'trust-strip', trustStrip(c));
  html = fill(html, 'statistik', stats(c));
  html = fill(html, 'testimoni-note', esc(c.testimoniNote || ''));
  html = fill(html, 'paket-umroh', (c.paketUmroh || []).map((p: any) => paketCard(p, c)).join(''));
  html = fill(html, 'paket-haji', (c.paketHaji || []).map((p: any) => paketCard(p, c)).join(''));
  html = fill(html, 'cara-daftar', (c.caraDaftar || []).map((s: any) => `<article class="card"><span class="step-num">${esc(s.langkah)}</span><h3>${esc(s.judul)}</h3><p>${esc(s.isi)}</p></article>`).join(''));
  html = fill(html, 'testimoni', (c.testimoni || []).map((t: any) => `<article class="card"><p class="quote">&ldquo;${esc(t.isi)}&rdquo;</p><p class="quote-name">${esc(t.nama)}</p></article>`).join(''));
  html = fill(html, 'faq-list', (c.faq || []).map((f: any, i: number) => `<div class="faq-item"><button class="faq-q" type="button" aria-expanded="${i === 0}" data-faq="${i}">${esc(f.q)}<span aria-hidden="true">${i === 0 ? '−' : '+'}</span></button><div class="faq-a" ${i === 0 ? '' : 'hidden'}>${esc(f.a)}</div></div>`).join(''));
  html = fillHrefText(html, 'kontak-wa', waHref(c), c.waNumber);
  html = fillHrefText(html, 'kontak-tel', c.telLink || '#', c.telepon);
  html = fillHrefText(html, 'kontak-email', `mailto:${c.email}`, c.email);
  html = fill(html, 'kontak-email-note', esc(c.emailNote || ''));
  html = fill(html, 'kontak-alamat', esc(c.alamat));
  html = fill(html, 'kontak-jam', esc(c.jam));
  html = fill(html, 'sosial-list', socialLinks(c));
  html = fillHrefText(html, 'kontak-app', c.appUrl || '#', `${c.appName || 'Aplikasi Jamaah'} (Play Store)`);
  html = fillHref(html, 'footer-pusat', c.pusatUrl || 'https://chatourtravel.id/');
  html = fill(html, 'footer-sosial', socialLinks(c));
  html = fillHref(html, 'footer-app', c.appUrl || '#');
  for (const id of ['nav-wa', 'hero-wa', 'kontak-wa-btn', 'cta-wa']) html = fillHref(html, id, waHref(c, waText));
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
