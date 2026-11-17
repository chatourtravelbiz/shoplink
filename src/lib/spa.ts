// Serve index.html untuk semua path SPA non-API via binding Assets (STATIC).
// Dipakai Hono notFound: /api/* tetap 404 JSON, file statis yang ada sudah
// dilayani Assets sebelum Worker dipanggil.
import type { AppContext } from '../types';

export async function serveSpa(c: AppContext): Promise<Response> {
  const binding = c.env.STATIC;
  if (!binding) return c.json({ error: 'Tidak ditemukan.' }, 404);
  const res = await binding.fetch(new Request('http://localhost/index.html'));
  if (!res.ok) return c.json({ error: 'Tidak ditemukan.' }, 404);
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
