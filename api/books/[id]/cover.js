// POST /api/books/[id]/cover  设置封面 URL(用户上传图片后拿到 URL,再调这里)
// 无 AI 了
import { getDB } from '../../../lib/db.js';
import { getPhone } from '../../../lib/auth.js';
import { ok, bad, allowMethods, readJson } from '../../../lib/http.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  const phone = getPhone(req);
  if (!phone) return bad(res, '未登录', 401);
  const id = req.query.id;

  const body = await readJson(req);
  const { cover_url } = body;
  if (!cover_url) return bad(res, '需要 cover_url');

  const db = await getDB();
  const { data: user } = await db.from('users').select('is_author').eq('phone', phone).single();
  if (!user?.is_author) return bad(res, '需要先申请成为作者', 403);

  const { data, error } = await db
    .from('books')
    .update({ cover_url })
    .eq('id', id)
    .select()
    .single();
  if (error) return bad(res, error.message, 500);
  return ok(res, { book: data });
}
