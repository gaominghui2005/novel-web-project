// /api/books/[id]/chapters
import { getDB } from '../../../lib/db.js';
import { getPhone } from '../../../lib/auth.js';
import { ok, bad, allowMethods, readJson } from '../../../lib/http.js';

// GET 公开(只返回 status=approved)
// POST 作者本人
export default async function handler(req, res) {
  if (req.method === 'GET') return list(req, res);
  if (req.method === 'POST') return create(req, res);
  allowMethods(req, res, ['GET', 'POST']);
}

async function list(req, res) {
  const book_id = req.query.id;
  const db = await getDB();
  const { data, error } = await db
    .from('chapters')
    .select('id, title, order_index, status, created_at')
    .eq('book_id', book_id)
    .order('order_index', { ascending: true });
  if (error) return bad(res, error.message, 500);
  // 公开只看 approved
  return ok(res, { chapters: (data || []).filter((c) => c.status === 'approved') });
}

async function create(req, res) {
  const phone = getPhone(req);
  if (!phone) return bad(res, '未登录', 401);
  const book_id = req.query.id;

  const body = await readJson(req);
  const { title, body: content } = body;
  if (!title || !content) return bad(res, '缺少 title / body');

  const db = await getDB();
  const { data: user } = await db.from('users').select('is_author').eq('phone', phone).single();
  if (!user?.is_author) return bad(res, '需要先申请成为作者', 403);

  // 取下一个 order_index
  const { data: last } = await db
    .from('chapters')
    .select('order_index')
    .eq('book_id', book_id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = (last?.order_index || 0) + 1;

  const { data, error } = await db
    .from('chapters')
    .insert({
      book_id,
      title,
      body: content,
      order_index: next,
      status: 'approved', // 没有编辑审核,直接公开
    })
    .select()
    .single();
  if (error) return bad(res, error.message, 500);
  return ok(res, { chapter: data });
}
