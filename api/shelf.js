// 书架
// GET  -> 我的收藏
// POST { book_id } -> 收藏
// DELETE { book_id } -> 取消收藏
import { getDB } from 'file:///C:/Users/PC/Desktop/%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/db.js';
import { requireAuth } from 'file:///C:/Users/PC/Desktop/%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/auth.js';
import { ok, bad, allowMethods, readJson } from 'file:///C:/Users/PC/Desktop/%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/http.js';

export default async function handler(req, res) {
  const phone = requireAuth(req, res);
  if (!phone) return;

  if (req.method === 'GET') return list(res, phone);
  if (req.method === 'POST') return add(req, res, phone);
  if (req.method === 'DELETE') return remove(req, res, phone);
  allowMethods(req, res, ['GET', 'POST', 'DELETE']);
}

async function list(res, phone) {
  const db = await getDB();
  const { data, error } = await db
    .from('shelves')
    .select('book_id, added_at, books!inner(id, title, author, cover_url, genre, hot)')
    .eq('user_phone', phone)
    .order('added_at', { ascending: false });
  if (error) return bad(res, error.message, 500);
  const items = (data || []).map((r) => ({
    added_at: r.added_at,
    ...r.books,
  }));
  return ok(res, { shelf: items });
}

async function add(req, res, phone) {
  const body = await readJson(req);
  const { book_id } = body;
  if (!book_id) return bad(res, '需�?book_id');
  const db = await getDB();
  const { error } = await db.from('shelves').insert({ user_phone: phone, book_id });
  if (error && error.code !== '23505') return bad(res, error.message, 500); // 23505 = 已收�?  return ok(res);
}

async function remove(req, res, phone) {
  const body = await readJson(req);
  const { book_id } = body;
  if (!book_id) return bad(res, '需�?book_id');
  const db = await getDB();
  const { error } = await db.from('shelves').delete().eq('user_phone', phone).eq('book_id', book_id);
  if (error) return bad(res, error.message, 500);
  return ok(res);
}
