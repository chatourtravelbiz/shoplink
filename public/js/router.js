// Router path bersih (History API).
// Tidak ada akses DOM/API di sini — fungsi murni atas string path.
export const RESERVED = new Set([
  'signup',
  'login',
  'dashboard',
  'products',
  'settings',
  'admin',
  'api',
  'js',
  'index.html',
  'favicon.ico',
]);

/** Parse pathname bersih -> route. Segmen pertama selain reserved = username toko. */
export function parsePath(pathname) {
  const parts = String(pathname || '/')
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  if (parts.length === 0) return { kind: 'notfound' };
  const [first, second, third] = parts;
  if (first === 'signup') return { kind: 'signup' };
  if (first === 'login') return { kind: 'login' };
  if (first === 'dashboard') return { kind: 'dashboard' };
  if (first === 'products') return { kind: 'products' };
  if (first === 'settings') return { kind: 'settings' };
  if (first === 'admin') return { kind: 'admin' };
  if (parts.length === 3 && second === 'p' && third) {
    return { kind: 'product', username: first, productId: third };
  }
  if (parts.length === 1 && !RESERVED.has(first)) {
    return { kind: 'store', username: first };
  }
  return { kind: 'notfound' };
}

export function isInternalPath(href) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return false;
  const path = href.split('?')[0];
  if (path.startsWith('/api/')) return false;
  if (path.startsWith('/js/')) return false;
  if (path === '/index.html' || path === '/favicon.ico') return false;
  return true;
}
