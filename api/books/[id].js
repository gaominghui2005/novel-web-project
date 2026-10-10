import { getDB } from 'file:///C:/Users/PC/Desktop/小说网页项目/lib/db.js';
import { ok, bad, allowMethods } from 'file:///C:/Users/PC/Desktop/小说网页项目/lib/http.js';

// GET /api/books/[id]    公开
export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;
  const id = req.query.id;
  const db = await getDB();
  const [{ data: book, error }, { data: ratings }] = await Promise.all([
    db.from('books')
      .select('id, title, author, genre, cover_url, hot, intro, author_phone, created_at')
      .eq('id', id)
      .maybeSingle(),
    db.from('ratings').select('score').eq('book_id', id),
  ]);
  if (error) return bad(res, error.message, 500);
  if (!book) return bad(res, '书不存在', 404);

  const n = (ratings || []).length;
  const sum = (ratings || []).reduce((a, r) => a + r.score, 0);
  const avg = n === 0 ? 0 : sum / n;
  const bayes = (sum + 5 * 3.0) / (n + 5);
  const bookWithRating = {
    ...book,
    rating_n: n,
    rating_avg: Math.round(avg * 10) / 10,
    rating_bayes: Math.round(bayes * 100) / 100,
  };

  const { data: chapters } = await db
    .from('chapters')
    .select('id, title, order_index, status, created_at')
    .eq('book_id', id)
    .order('order_index', { ascending: true });

  return ok(res, { book: bookWithRating, chapters: chapters || [] });
}
