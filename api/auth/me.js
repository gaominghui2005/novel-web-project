import { getDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';
import { ok, bad, allowMethods } from '../../lib/http.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'DELETE'])) return;
  const phone = requireAuth(req, res);
  if (!phone) return;

  const db = await getDB();
  const { data, error } = await db
    .from('users')
    .select('phone, name, is_author, is_editor')
    .eq('phone', phone)
    .single();
  if (error) return bad(res, error.message, 500);
  return ok(res, {
    user: {
      phone: data.phone,
      name: data.name,
      isAuthor: data.is_author,
      isEditor: data.is_editor,
    },
  });
}
