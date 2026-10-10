// GET /api/books  公开,任何人可读
// POST /api/books 需要 is_author
import { getDB } from 'file:///C:/Users/PC/Desktop/小说网页项目/lib/db.js';
import { ok, bad, allowMethods, readJson } from 'file:///C:/Users/PC/Desktop/小说网页项目/lib/http.js';
import { getPhone } from 'file:///C:/Users/PC/Desktop/小说网页项目/lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return list(req, res);
  if (req.method === 'POST') return create(req, res);
  allowMethods(req, res, ['GET', 'POST']);
}

async function list(req, res) {
  const db = await getDB();
  const [{ data, error }, { data: ratings }] = await Promise.all([
    db.from('books')
      .select('id, title, author, genre, cover_url, hot, intro, author_phone, created_at')
      .order('hot', { ascending: false }),
    db.from('ratings').select('book_id, score'),
  ]);
  if (error) return bad(res, error.message, 500);

  const agg = new Map();
  for (const r of ratings || []) {
    const a = agg.get(r.book_id) || { n: 0, sum: 0 };
    a.n += 1; a.sum += r.score;
    agg.set(r.book_id, a);
  }
  const M = 5, R = 3.0;
  const out = (data || []).map((b) => {
    const a = agg.get(b.id) || { n: 0, sum: 0 };
    const avg = a.n === 0 ? 0 : a.sum / a.n;
    const bayes = (a.sum + M * R) / (a.n + M);
    return {
      ...b,
      rating_n: a.n,
      rating_avg: Math.round(avg * 10) / 10,
      rating_bayes: Math.round(bayes * 100) / 100,
    };
  });
  return ok(res, { books: out });
}

async function create(req, res) {
  const phone = getPhone(req);
  if (!phone) return bad(res, '未登录', 401);
  const db = await getDB();

  // 必须 is_author
  const { data: user } = await db.from('users').select('is_author').eq('phone', phone).single();
  if (!user?.is_author) return bad(res, '需要先申请成为作者', 403);

  const body = await readJson(req);
  const { title, author, genre, intro, cover_url } = body;
  if (!title || !author) return bad(res, '缺少书名 / 作者');

  const id = 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const { data, error } = await db
    .from('books')
    .insert({
      id,
      title,
      author,
      genre: genre || '未分类',
      cover_url: cover_url || null,
      intro: intro || '',
      author_phone: phone,
    })
    .select()
    .single();
  if (error) return bad(res, error.message, 500);
  return ok(res, { book: data });
}
