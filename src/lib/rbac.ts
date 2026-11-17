// RBAC admin platform — cek role di SERVER untuk setiap endpoint /api/admin/*.
// Peran: super_admin (semua + atur role), admin (kelola user/toko/order, tanpa
// atur role), moderator (lihat + suspend toko), support (lihat saja),
// merchant (bukan admin — 403 di semua endpoint admin).
import type { AppContext, UserRow } from '../types';
import { err } from './http';
import { getSessionUser } from './auth';
import { newId } from './crypto';
import { isAdminRole } from './validation';

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support';

/** Ambil user login yang rolenya termasuk `allowed`. Bila tidak berhak,
    kembalikan Response error-nya — pemanggil: `if (u instanceof Response) return u;` */
export async function requireAdmin(
  c: AppContext,
  allowed: AdminRole[],
): Promise<UserRow | Response> {
  const user = await getSessionUser(c.env, c.req.raw);
  if (!user) return err(c, 401, 'Belum login.');
  const role = user.role ?? 'merchant';
  if (!isAdminRole(role) || !allowed.includes(role as AdminRole)) {
    return err(c, 403, 'Akses ditolak: butuh peran admin.');
  }
  return user;
}

/** Catat aksi admin ke audit_log. Gagal audit tidak boleh menggagalkan aksi. */
export async function logAudit(
  env: AppContext['env'],
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
): Promise<void> {
  try {
    await env.DB.prepare(
      'INSERT INTO audit_log (id, actor_id, action, target_type, target_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
    )
      .bind(newId('au'), actorId, action, targetType, targetId, new Date().toISOString())
      .run();
  } catch {
    // Audit tidak kritis.
  }
}
