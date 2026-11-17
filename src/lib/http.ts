import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppContext } from '../types';

/** Balasan error JSON konsisten. Pesan error tidak pernah berisi stack trace. */
export function err(c: AppContext, status: ContentfulStatusCode, message: string) {
  return c.json({ error: message }, status);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Tanggal UTC `YYYY-MM-DD` — dipakai sebagai kunci analytics_daily. */
export function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Baca body JSON; kembalikan null bila body bukan JSON (bukan throw). */
export async function jsonBody(c: AppContext): Promise<Record<string, unknown> | null> {
  const body = await c.req.json().catch(() => null);
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
}
