// Kriptografi untuk Cloudflare Workers: WebCrypto PBKDF2-SHA256, tanpa Node crypto.
// Format password_hash: "<salt hex>:<hash hex>", salt 16 byte, hash 32 byte,
// 120.000 iterasi — format yang sama dipakai scripts/make-seed.mjs (Node).

const HASH_ITERATIONS = 120_000;

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function unhex(s: string): Uint8Array {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return hex(buf);
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: HASH_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const derived = await derive(password, salt);
  return `${hex(salt)}:${hex(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHex] = stored.split(':');
  if (!saltHex || !expectedHex || saltHex.length !== 32 || expectedHex.length !== 64) return false;
  const derived = await derive(password, unhex(saltHex));
  const actualHex = hex(derived);
  // Perbandingan panjang-tetap (hindari early-exit berbasis isi).
  let diff = actualHex.length ^ expectedHex.length;
  for (let i = 0; i < Math.min(actualHex.length, expectedHex.length); i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

export function newSessionToken(): string {
  return `ms_${randomHex(32)}`;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomHex(10)}`;
}
