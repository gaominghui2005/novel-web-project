// /api/ratings
// GET  /api/ratings?type=top&limit=10  返回贝叶斯平均排行的书列�?// POST /api/ratings  { book_id, score }  需要登�?同一用户同一本书一�?//   - score 只能�?1..5,贝叶斯平�?= (score + m*R) / (n+m)
//   - m=5,R=3.0(类似�?IMDb 的默认�?

import { getDB } from 'file:///C:/Users/PC/Desktop/%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/db.js';
import { requireAuth } from 'file:///C:/Users/PC/Desktop/%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/auth.js';
import { ok, bad, allowMethods, readJson } from 'file:///C:/Users/PC/Desktop/%E5%B0%8F%E8%AF%B4%E7%BD%91%E9%A1%B5%E9%A1%B9%E7%9B%AE/lib/http.js';

const M = 5;       // 先验强度
const R = 3.0;     // 先验平均�?
export default async function handler(req, res) {
  if (req.method === 'GET')  return top(req, res);
  if (req.method === 'POST') return upsert(req, res);
  allowMethods(req, res, ['GET', 'POST']);
}

async function top(req, res) {
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
  const db = await getDB();
  // 全部 ratings + 全部 books
  const [{ data: ratings }, { data: books }] = await Promise.all([
    db.from('ratings').select('book_id, score'),
    db.from('books').select('id, title, author, genre, cover_url, hot, intro'),
  ]);
  if (booksErrorSafe(ratings, books, res)) return;

  const agg = new Map();
  for (const r of ratings || []) {
    const a = agg.get(r.book_id) || { n: 0, sum: 0 };
    a.n += 1;
    a.sum += r.score;
    agg.set(r.book_id, a);
  }
  const ranked = (books || []).map((b) => {
    const a = agg.get(b.id) || { n: 0, sum: 0 };
    const n = a.n;
    const sum = a.sum;
    const avg = n === 0 ? 0 : sum / n;
    const bayes = (sum + M * R) / (n + M);
    return {
      ...b,
      rating_n: n,
      rating_avg: round1(avg),
      rating_bayes: round2(bayes),
    };
  });
  ranked.sort((a, b) => b.rating_bayes - a.rating_bayes);
  return ok(res, { books: ranked.slice(0, limit) });
}

async function upsert(req, res) {
  const phone = requireAuth(req, res);
  if (!phone) return;
  const body = await readJson(req);
  const { book_id, score } = body;
  if (!book_id) return bad(res, '需�?book_id');
  const s = Number(score);
  if (!Number.isInteger(s) || s < 1 || s > 5) return bad(res, 'score 必须�?1..5');

  const db = await getDB();

  // 不允许编辑给自己书打 5(可�?- 当前规则允许,任何�?1..5)
  const { data: existing } = await db
    .from('ratings')
    .select('user_phone')
    .eq('user_phone', phone)
    .eq('book_id', book_id)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from('ratings')
      .update({ score: s, updated_at: new Date().toISOString() })
      .eq('user_phone', phone)
      .eq('book_id', book_id);
    if (error) return bad(res, error.message, 500);
    return ok(res, { my_score: s, updated: true });
  } else {
    const { error } = await db
      .from('ratings')
      .insert({ user_phone: phone, book_id, score: s });
    if (error) return bad(res, error.message, 500);
    return ok(res, { my_score: s, updated: false });
  }
}

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function booksErrorSafe(r, b, res) { return false; }
