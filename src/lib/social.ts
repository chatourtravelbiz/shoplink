// Normalisasi + validasi tautan sosial agen (instagram/facebook/tiktok/youtube).
// Input boleh username (@nama / nama) atau URL lengkap; yang disimpan selalu
// URL https penuh ke host resmi jaringan itu. URL di luar host itu (termasuk
// javascript:) ditolak — anti open-redirect / XSS.
export const SOCIAL_NETWORKS = ['instagram', 'facebook', 'tiktok', 'youtube'] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

const HOSTS: Record<SocialNetwork, string[]> = {
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
};

const USERNAME_RE = /^[A-Za-z0-9._-]{1,60}$/;

function hostAllowed(network: SocialNetwork, host: string): boolean {
  return HOSTS[network].some((base) => host === base || host === `www.${base}` || host.endsWith(`.${base}`));
}

function cleanPath(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

/** Normalisasi satu tautan: URL https penuh, atau null bila kosong. Lempar bila tidak valid. */
export function normalizeSocialLink(network: SocialNetwork, raw: unknown): string | null {
  let v = String(raw ?? '').trim();
  if (!v) return null;
  v = v.replace(/^@+/, '');
  if (v.includes('://') && !/^https?:\/\//i.test(v)) {
    throw new Error(`Tautan ${SOCIAL_LABELS[network]} tidak valid.`);
  }
  // Bentuk "instagram.com/nama" tanpa skema: tambahkan https:// dulu.
  const hasHostPrefix = HOSTS[network].some((base) => v.toLowerCase().startsWith(base + '/') || v.toLowerCase().startsWith(`www.${base}/`));
  if (/^https?:\/\//i.test(v) || hasHostPrefix) {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`Tautan ${SOCIAL_LABELS[network]} tidak valid.`);
    const host = url.hostname.toLowerCase();
    if (!hostAllowed(network, host)) throw new Error(`Tautan ${SOCIAL_LABELS[network]} harus ke ${HOSTS[network][0]}.`);
    const path = cleanPath(url.pathname);
    if (path === '/') throw new Error(`Tautan ${SOCIAL_LABELS[network]} harus mengarah ke sebuah akun.`);
    if (network === 'youtube') {
      // /watch, /channel/..., /@nama, /c/... diterima apa adanya.
      return `https://${host.replace(/^www\./, '')}${path}`;
    }
    const seg = path.replace(/^\/@?/, '');
    if (!USERNAME_RE.test(seg) || seg.includes('/')) {
      throw new Error(`Tautan ${SOCIAL_LABELS[network]} harus mengarah ke sebuah akun.`);
    }
    const handle = network === 'tiktok' ? `@${seg}` : seg;
    return `https://${host.replace(/^www\./, '')}/${handle}`;
  }
  // Username polos.
  if (!USERNAME_RE.test(v) || v.includes('/')) {
    throw new Error(`Username ${SOCIAL_LABELS[network]} tidak valid.`);
  }
  if (network === 'youtube' && /^UC[A-Za-z0-9_-]{22}$/.test(v)) return `https://youtube.com/channel/${v}`;
  if (network === 'tiktok') return `https://tiktok.com/@${v}`;
  return `https://${HOSTS[network][0]}/${network === 'youtube' ? `@${v}` : v}`;
}

/** Normalisasi sekumpulan tautan (objek atau string JSON). Kunci asing dibuang; kosong dihilangkan. */
export function normalizeSocialLinks(input: unknown): SocialLinks {
  const obj = typeof input === 'string' ? safeParse(input) : (input as Record<string, unknown> | null);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    if (input == null || input === '') return {};
    throw new Error('Akun sosial tidak valid.');
  }
  const out: SocialLinks = {};
  for (const network of SOCIAL_NETWORKS) {
    const url = normalizeSocialLink(network, obj[network]);
    if (url) out[network] = url;
  }
  return out;
}

function safeParse(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Parse JSON social_links dari DB (aman: nilai rusak dibuang, bukan dilempar). */
export function parseSocialLinksJson(raw: string | null | undefined): SocialLinks {
  if (!raw) return {};
  const parsed = safeParse(raw);
  if (!parsed) return {};
  const out: SocialLinks = {};
  for (const network of SOCIAL_NETWORKS) {
    try {
      const url = normalizeSocialLink(network, parsed[network]);
      if (url) out[network] = url;
    } catch {
      // Nilai tersimpan yang rusak: buang saja, jangan gagalkan halaman.
    }
  }
  return out;
}
