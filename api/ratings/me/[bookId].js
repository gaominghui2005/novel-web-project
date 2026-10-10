// GET /api/ratings/me/[bookId]
import { getDB } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';
import { ok, allowMethods } from '../../../lib/http.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;
  const phone = requireAuth(req, res);
  if (!phone) return;
  const book_id = req.query.bookId;
  if (!book_id) return ok(res, { score: null });
  const db = await getDB();
  const { data } = await db
    .from('ratings')
    .select('score')
    .eq('user_phone', phone)
    .eq('book_id', book_id)
    .maybeSingle();
  return ok(res, { score: data?.score ?? null });
}
