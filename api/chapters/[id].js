// GET /api/chapters/[id]    公开正文(已审核)
// PUT /api/chapters/[id]    作者本人
import { getDB } from '../../lib/db.js';
import { getPhone } from '../../lib/auth.js';
import { ok, bad, allowMethods, readJson } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return getOne(req, res);
  if (req.method === 'PUT') return update(req, res);
  allowMethods(req, res, ['GET', 'PUT']);
}

async function getOne(req, res) {
  const id = req.query.id;
  const db = await getDB();
  const { data, error } = await db
    .from('chapters')
    .select('id, book_id, title, body, order_index, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) return bad(res, error.message, 500);
  if (!data) return bad(res, '章节不存在', 404);
  if (data.status !== 'approved') return bad(res, '章节未公开', 403);
  return ok(res, { chapter: data });
}

async function update(req, res) {
  const phone = getPhone(req);
  if (!phone) return bad(res, '未登录', 401);

  const id = req.query.id;
  const body = await readJson(req);
  const { title, body: content } = body;

  const db = await getDB();
  const { data: user } = await db.from('users').select('is_author').eq('phone', phone).single();
  if (!user?.is_author) return bad(res, '需要先申请成为作者', 403);

  const patch = {};
  if (title) patch.title = title;
  if (content) patch.body = content;

  const { data, error } = await db.from('chapters').update(patch).eq('id', id).select().single();
  if (error) return bad(res, error.message, 500);
  return ok(res, { chapter: data });
}
