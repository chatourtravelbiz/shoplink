// Aturan validasi input (dipakai semua route). Nilai yang lolos di sini saja
// yang diteruskan ke query D1 — selalu lewat .bind(), tidak pernah interpolasi.
export const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const THEMES = ['emerald', 'rose', 'amber', 'sky', 'violet'] as const;
export const PAYMENT_METHODS = ['whatsapp', 'cod', 'transfer'] as const;
export const ORDER_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
export const PRODUCT_STATUSES = ['active', 'draft', 'archived'] as const;
export const ROLES = ['super_admin', 'admin', 'moderator', 'support', 'merchant'] as const;
export const ADMIN_ROLES = ['super_admin', 'admin', 'moderator', 'support'] as const;
export const STORE_STATUSES = ['active', 'suspended'] as const;

/** Username yang tidak boleh didaftar — route sistem / panel admin. */
export const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'app', 'www', 'mail', 'dashboard', 'settings', 'products',
  'login', 'signup', 'support', 'help', 'chatour', 'shoplink',
]);

export const MAX_NAME_LEN = 120;
export const MAX_TEXT_LEN = 2000;
export const MAX_QTY = 99;

export function str(v: unknown, max = MAX_TEXT_LEN): string {
  return String(v ?? '').trim().slice(0, max);
}

export function isEmail(v: string): boolean {
  return EMAIL_RE.test(v);
}

export function isUsername(v: string): boolean {
  return USERNAME_RE.test(v);
}

export function isTheme(v: string): v is (typeof THEMES)[number] {
  return (THEMES as readonly string[]).includes(v);
}

export function isPaymentMethod(v: string): v is (typeof PAYMENT_METHODS)[number] {
  return (PAYMENT_METHODS as readonly string[]).includes(v);
}

export function isOrderStatus(v: string): v is (typeof ORDER_STATUSES)[number] {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}

export function isProductStatus(v: string): v is (typeof PRODUCT_STATUSES)[number] {
  return (PRODUCT_STATUSES as readonly string[]).includes(v);
}

export function isRole(v: string): v is (typeof ROLES)[number] {
  return (ROLES as readonly string[]).includes(v);
}

export function isAdminRole(v: string | null | undefined): v is (typeof ADMIN_ROLES)[number] {
  return !!v && (ADMIN_ROLES as readonly string[]).includes(v);
}

export function isStoreStatus(v: string): v is (typeof STORE_STATUSES)[number] {
  return (STORE_STATUSES as readonly string[]).includes(v);
}

/** Harga valid: angka hingga, >= 0, maksimal Rp 1 miliar. */
export function validPrice(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) return null;
  return Math.round(n * 100) / 100;
}

/** Stok valid: bilangan bulat 0..1.000.000. */
export function validStock(v: unknown): number {
  const n = Math.floor(Number(v) || 0);
  return Math.min(1_000_000, Math.max(0, n));
}

/** Qty order valid: bilangan bulat 1..99. */
export function validQty(v: unknown): number | null {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 1 || n > MAX_QTY) return null;
  return n;
}
