// Validasi + normalisasi custom domain agen (dipakai endpoint admin).
// Aturan: huruf kecil; skema http(s)://, trailing slash, dan titik akhir dibuang.
// www TIDAK ditambah/dihapus — www.agenku.com dan agenku.com adalah host berbeda.
const LABEL_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/** Normalisasi ringan: kecilkan huruf, buang skema dan trailing slash/titik. */
export function normalizeDomain(raw: unknown): string {
  let d = String(raw ?? '').trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.replace(/\/+$/, '');
  d = d.replace(/\.$/, '');
  return d;
}

/** Kembalikan pesan error (Bahasa Indonesia) bila domain tidak bisa dipakai, null bila OK. */
export function domainError(domain: string): string | null {
  if (!domain) return 'Domain wajib diisi — contoh: agenku.com.';
  if (/[\s/:?#@]/.test(domain)) return 'Domain tidak boleh berisi spasi, port, atau path — contoh: agenku.com.';
  if (domain.includes('_')) return 'Domain tidak boleh berisi garis bawah (_).';
  if (domain.length > 253) return 'Domain terlalu panjang (maksimal 253 karakter).';
  if (domain === 'chatourtravel.com' || domain.endsWith('.chatourtravel.com')) {
    return 'Domain chatourtravel.com dan subdomainnya dicadangkan untuk platform.';
  }
  if (domain === 'workers.dev' || domain.endsWith('.workers.dev')) {
    return 'Domain workers.dev tidak bisa dipakai sebagai domain agen.';
  }
  const labels = domain.split('.');
  if (labels.length < 2) return 'Domain harus punya titik — contoh: agenku.com.';
  for (const l of labels) {
    if (l.length < 1 || l.length > 63 || !LABEL_RE.test(l)) {
      return 'Format domain tidak valid — contoh: agenku.com.';
    }
  }
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return 'Domain harus diakhiri TLD yang valid — contoh: .com, .id.';
  }
  return null;
}
