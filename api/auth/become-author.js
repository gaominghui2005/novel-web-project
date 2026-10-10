// 用户申请成为作�?自己点一�?
import { getDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';
import { ok, bad, allowMethods } from '../../lib/http.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  const phone = requireAuth(req, res);
  if (!phone) return;

  const db = await getDB();
  const { error } = await db.from('users').update({ is_author: true }).eq('phone', phone);
  if (error) return bad(res, error.message, 500);
  return ok(res);
}
