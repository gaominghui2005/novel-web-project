// 阅读历史
// GET  -> 我的历史
// POST { book_id, chapter_id } -> 记一条
import { getDB } from '../%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/db.js';
import { requireAuth } from '../%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/auth.js';
import { ok, bad, allowMethods, readJson } from '../%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/http.js';

export default async function handler(req, res) {
  const phone = requireAuth(req, res);
  if (!phone) return;

  if (req.method === 'GET') return list(res, phone);
  if (req.method === 'POST') return add(req, res, phone);
  allowMethods(req, res, ['GET', 'POST']);
}

async function list(res, phone) {
  const db = await getDB();
  const { data, error } = await db
    .from('history')
    .select('id, book_id, chapter_id, at')
    .eq('user_phone', phone)
    .order('at', { ascending: false })
    .limit(50);
  if (error) return bad(res, error.message, 500);
  const bookIds = [...new Set((data || []).map((h) => h.book_id).filter(Boolean))];
  let books = [];
  if (bookIds.length) {
    const r = await db.from('books').select('id, title, author, cover_url, genre, hot').in('id', bookIds);
    books = r.data || [];
  }
  const map = new Map(books.map((b) => [b.id, b]));
  const items = (data || []).map((h) => ({ at: h.at, ...(map.get(h.book_id) || { id: h.book_id }) }));
  return ok(res, { history: items });
}

async function add(req, res, phone) {
  const body = await readJson(req);
  const { book_id, chapter_id } = body;
  if (!book_id) return bad(res, '需要 book_id');
  const db = await getDB();
  const { error } = await db
    .from('history')
    .insert({ user_phone: phone, book_id, chapter_id: chapter_id || null });
  if (error) return bad(res, error.message, 500);
  return ok(res);
}
