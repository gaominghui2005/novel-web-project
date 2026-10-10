// Cloudflare Pages 自包含 API router
// 路径: /functions/api/[[path]].js
// 直接实现 14 个 API,不依赖外部 api/ 目录。
// 走 Supabase REST API(PostgREST),bearer service_role key 鉴权。

// =====================================================
// JWT + 密码(bcryptjs)
// =====================================================
// bcryptjs 可以跑在 Cloudflare 边缘(纯 JS 实现)
// 不要 import 'bcryptjs'(太大),用 Web Crypto API 模拟出一个静态 hash。
// 实际方案:web crypto 派生一个密钥 = password + per-user-salt(Supabase 存 password_hash 字段)
// 但我们既没用 supabase bouncer,就用一个 Web-Crypto 兼容的 hash 简化版。

const enc = new TextEncoder();

async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const buf = await crypto.subtle.importKey(
    'raw', enc.encode(pw), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    buf,
    256
  );
  return 'pbkdf2$100000$' + b64(salt) + '$' + b64(new Uint8Array(bits));
}

async function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts[0] !== 'pbkdf2') return false;
  const iter = parseInt(parts[1], 10);
  const salt = ub64(parts[2]);
  const expect = parts[3];
  const buf = await crypto.subtle.importKey(
    'raw', enc.encode(pw), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    buf,
    256
  );
  return expect === b64(new Uint8Array(bits));
}

function b64(arr) {
  let s = '';
  for (const c of arr) s += String.fromCharCode(c);
  return btoa(s);
}
function ub64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// =====================================================
// JWT (HMAC-SHA256, js 风格紧凑版)
// =====================================================
async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 30 * 86400 };
  const h = b64url(JSON.stringify(header));
  const b = b64url(JSON.stringify(body));
  const sig = await hmacSign(`${h}.${b}`, secret);
  return `${h}.${b}.${sig}`;
}
async function verifyJWT(token, secret) {
  try {
    const [h, b, s] = String(token || '').split('.');
    if (!h || !b || !s) return null;
    const sig = await hmacSign(`${h}.${b}`, secret);
    if (sig !== s) return null;
    const payload = JSON.parse(ub64url(b));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
async function hmacSign(input, secret) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(input));
  return b64urlBytes(new Uint8Array(sig));
}
function b64url(s) {
  return b64(new TextEncoder().encode(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlBytes(arr) {
  return b64(arr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function ub64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

// =====================================================
// Supabase (PostgREST)
// =====================================================
class Pg {
  constructor(env) {
    this.url = env.SUPABASE_URL.replace(/\/+$/, '');
    this.key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  }

  async _fetch(method, path, body, query = '') {
    const url = this.url + '/rest/v1' + path + (query ? '?' + query : '');
    const headers = {
      apikey: this.key,
      Authorization: 'Bearer ' + this.key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    const init = { method, headers };
    if (body) init.body = JSON.stringify(body);
    const res = await fetch(url, init);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && data.message) ? data.message : (data && data.error) ? data.error : 'HTTP ' + res.status;
      const code = (data && data.code) ? data.code : null;
      return { data: null, error: { message: msg, code } };
    }
    return { data, error: null };
  }

  async select(t, filters = {}, cols = '*', single = false) {
    const q = filters._filter || '';
    if (filters._filter) delete filters._filter;
    const parts = ['select=' + encodeURIComponent(cols)];
    for (const [k, v] of Object.entries(filters)) {
      if (v && typeof v === 'object' && v.op) {
        parts.push(`${encodeURIComponent(k)}=${v.op}.${encodeURIComponent(v.val)}`);
      } else {
        parts.push(`${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`);
      }
    }
    if (single) parts.push('limit=1');
    const r = await this._fetch('GET', `/${t}`, null, parts.join('&') + q);
    if (r.error) return r;
    if (single) return { data: Array.isArray(r.data) ? (r.data[0] || null) : r.data, error: null };
    return { data: r.data || [], error: null };
  }
  async insert(t, row) {
    return this._fetch('POST', `/${t}`, row);
  }
  async update(t, patch, filters) {
    const parts = [];
    for (const [k, v] of Object.entries(filters)) {
      parts.push(`${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`);
    }
    return this._fetch('PATCH', `/${t}`, patch, parts.join('&'));
  }
  async delete(t, filters) {
    const parts = [];
    for (const [k, v] of Object.entries(filters)) {
      parts.push(`${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`);
    }
    return this._fetch('DELETE', `/${t}`, null, parts.join('&'));
  }
}

// =====================================================
// 通用辅助
// =====================================================
function ok(data = {}) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
function bad(message, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
function methodNotAllowed(methods) {
  return new Response('Method not allowed', {
    status: 405,
    headers: { Allow: methods.join(', ') },
  });
}

async function readJSON(req) {
  try { return await req.json(); }
  catch {
    try {
      const txt = await req.text();
      return Object.fromEntries(new URLSearchParams(txt));
    } catch { return {}; }
  }
}

function cookieFrom(req, name) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function buildSetCookie(token) {
  return `novel_token=${encodeURIComponent(token)}; Path=/; Max-Age=${30 * 86400}; HttpOnly; SameSite=Lax`;
}

async function getPhone(req, env) {
  const t = cookieFrom(req, 'novel_token');
  if (!t) return null;
  const p = await verifyJWT(t, env.JWT_SECRET);
  return p && p.phone || null;
}

// =====================================================
// 路由分发
// =====================================================
export async function onRequest(context) {
  try {
    return await _route(context);
  } catch (e) {
    const msg = (e && (e.stack || e.message)) || String(e);
    return new Response(JSON.stringify({
      ok: false,
      error: 'unhandled: ' + msg,
      hasUrl: !!context.env.SUPABASE_URL,
      hasKey: !!(context.env.SUPABASE_SERVICE_ROLE_KEY || context.env.SUPABASE_SECRET_KEY),
      hasSecret: !!context.env.JWT_SECRET,
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

async function _route(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method;
  const env = context.env;

  // routes
  if (path === '/api/health') return ok({ ts: Date.now() });

  if (path === '/api/auth/phone-password') {
    if (method !== 'POST') return methodNotAllowed(['POST']);
    return authPhonePassword(context.request, env);
  }
  if (path === '/api/auth/me') {
    if (method !== 'GET') return methodNotAllowed(['GET']);
    return authMe(context.request, env);
  }
  if (path === '/api/auth/logout') {
    if (method !== 'POST') return methodNotAllowed(['POST']);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': `novel_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` },
    });
  }
  if (path === '/api/auth/become-author' && method === 'POST') {
    return authBecomeAuthor(context.request, env);
  }

  if (path === '/api/books' || path === '/api/books/') {
    if (method === 'GET') return booksList(context.request, env);
    if (method === 'POST') return booksCreate(context.request, env);
    return methodNotAllowed(['GET', 'POST']);
  }
  let m = path.match(/^\/api\/books\/([^/]+?)\/?$/);
  if (m && method === 'GET') return booksGet(m[1], env);

  m = path.match(/^\/api\/books\/([^/]+)\/chapters\/?$/);
  if (m) {
    if (method === 'GET') return chaptersList(m[1], env);
    if (method === 'POST') return chaptersCreate(m[1], context.request, env);
    return methodNotAllowed(['GET', 'POST']);
  }
  m = path.match(/^\/api\/books\/([^/]+)\/cover\/?$/);
  if (m && method === 'POST') return booksCover(m[1], context.request, env);

  m = path.match(/^\/api\/chapters\/([^/]+?)\/?$/);
  if (m) {
    if (method === 'GET') return chapterGet(m[1], env);
    if (method === 'PUT') return chapterUpdate(m[1], context.request, env);
    return methodNotAllowed(['GET', 'PUT']);
  }

  if (path === '/api/history' || path === '/api/history/') {
    if (method === 'GET') return historyGet(context.request, env);
    if (method === 'POST') return historyPost(context.request, env);
    return methodNotAllowed(['GET', 'POST']);
  }
  if (path === '/api/shelf' || path === '/api/shelf/') {
    if (method === 'GET') return shelfGet(context.request, env);
    if (method === 'POST') return shelfAdd(context.request, env);
    if (method === 'DELETE') return shelfRemove(context.request, env);
    return methodNotAllowed(['GET', 'POST', 'DELETE']);
  }
  if (path === '/api/banners' || path === '/api/banners/') {
    if (method === 'GET') return bannersList(env);
    if (method === 'POST') return bannersCreate(context.request, env);
    if (method === 'PUT') return bannersUpdate(context.request, env);
    return methodNotAllowed(['GET', 'POST', 'PUT']);
  }

  if (path === '/api/ratings' || path === '/api/ratings/') {
    if (method === 'GET') return ratingsTop(env);
    if (method === 'POST') return ratingsPost(context.request, env);
    return methodNotAllowed(['GET', 'POST']);
  }
  m = path.match(/^\/api\/ratings\/me\/([^/]+?)\/?$/);
  if (m && method === 'GET') return ratingsMe(m[1], context.request, env);

  return bad('Not Found: ' + path, 404);
}

// =====================================================
// Handlers
// =====================================================
async function authPhonePassword(req, env) {
  const body = await readJSON(req);
  const phone = String(body.phone || '');
  const password = String(body.password || '');
  if (!/^1[3-9]\d{9}$/.test(phone)) return bad('手机号格式不对');
  if (password.length < 6 || password.length > 32) return bad('密码需 6~32 位');

  const pg = new Pg(env);
  const exist = await pg.select('users', { phone }, '*', true);
  let user;
  let created = false;
  if (exist.data) {
    const okPw = await verifyPassword(password, exist.data.password_hash);
    if (!okPw) return bad('密码不对', 401);
    user = exist.data;
  } else {
    const isEditor = phone === (env.ADMIN_PHONE || '');
    const hash = await hashPassword(password);
    const r = await pg.insert('users', { phone, password_hash: hash, name: '读者', is_author: false, is_editor: isEditor });
    if (r.error) return bad(r.error.message, 500);
    user = r.data[0];
    created = true;
  }
  const token = await signJWT({ phone: user.phone }, env.JWT_SECRET);
  return new Response(JSON.stringify({
    ok: true,
    user: { phone: user.phone, name: user.name, isAuthor: !!user.is_author, isEditor: !!user.is_editor },
    created,
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': buildSetCookie(token) },
  });
}

async function authMe(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) {
    return new Response(JSON.stringify({ ok: false, error: '未登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const pg = new Pg(env);
  const u = await pg.select('users', { phone }, 'phone,name,is_author,is_editor', true);
  if (u.error || !u.data) return bad('找不到用户', 404);
  return ok({ user: {
    phone: u.data.phone, name: u.data.name,
    isAuthor: !!u.data.is_author, isEditor: !!u.data.is_editor
  }});
}

async function authBecomeAuthor(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const r = await pg.update('users', { is_author: true }, { phone });
  if (r.error) return bad(r.error.message, 500);
  return ok();
}

async function booksList(req, env) {
  const pg = new Pg(env);
  const [books, ratings] = await Promise.all([
    pg.select('books', {}, 'id,title,author,genre,cover_url,hot,intro,author_phone,created_at'),
    pg.select('ratings', {}, 'book_id,score'),
  ]);
  if (books.error) return bad(books.error.message, 500);
  const M = 5, R = 3.0;
  const agg = new Map();
  for (const r of ratings.data || []) {
    const a = agg.get(r.book_id) || { n: 0, sum: 0 };
    a.n += 1; a.sum += r.score;
    agg.set(r.book_id, a);
  }
  const out = (books.data || []).map((b) => {
    const a = agg.get(b.id) || { n: 0, sum: 0 };
    const avg = a.n === 0 ? 0 : a.sum / a.n;
    const bayes = (a.sum + M * R) / (a.n + M);
    return { ...b, rating_n: a.n, rating_avg: Math.round(avg * 10) / 10, rating_bayes: Math.round(bayes * 100) / 100 };
  });
  out.sort((a, b) => b.rating_bayes - a.rating_bayes);
  return ok({ books: out });
}

async function booksGet(id, env) {
  const pg = new Pg(env);
  const [book, ratings, chapters] = await Promise.all([
    pg.select('books', { id }, '*', true),
    pg.select('ratings', { book_id: id }, 'score'),
    pg.select('chapters', { book_id: id }, 'id,title,order_index,status,created_at'),
  ]);
  if (book.error) return bad(book.error.message, 500);
  if (!book.data) return bad('书不存在', 404);
  const M = 5, R = 3.0;
  const n = (ratings.data || []).length;
  const sum = (ratings.data || []).reduce((a, r) => a + r.score, 0);
  const avg = n === 0 ? 0 : sum / n;
  const bayes = (sum + M * R) / (n + M);
  const enriched = {
    ...book.data,
    rating_n: n,
    rating_avg: Math.round(avg * 10) / 10,
    rating_bayes: Math.round(bayes * 100) / 100,
  };
  if (chapters.error) return bad(chapters.error.message, 500);
  return ok({ book: enriched, chapters: chapters.data || [] });
}

async function booksCreate(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const me = await pg.select('users', { phone }, 'is_author', true);
  if (!me.data || !me.data.is_author) return bad('需要先申请成为作者', 403);
  const body = await readJSON(req);
  const { title, author, genre, intro, cover_url } = body;
  if (!title || !author) return bad('缺少书名 / 作者');
  const id = `b${Date.now()}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const r = await pg.insert('books', {
    id, title, author,
    genre: genre || '未分类',
    cover_url: cover_url || null,
    intro: intro || '',
    author_phone: phone,
  });
  if (r.error) return bad(r.error.message, 500);
  return ok({ book: r.data[0] });
}

async function booksCover(id, req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const me = await pg.select('users', { phone }, 'is_author', true);
  if (!me.data || !me.data.is_author) return bad('需要先申请成为作者', 403);
  const body = await readJSON(req);
  if (!body.cover_url) return bad('需要 cover_url');
  const r = await pg.update('books', { cover_url: body.cover_url }, { id });
  if (r.error) return bad(r.error.message, 500);
  return ok({ book: r.data && r.data[0] });
}

async function chaptersList(bookId, env) {
  const pg = new Pg(env);
  const r = await pg.select('chapters', { book_id: bookId, status: 'approved' }, 'id,title,order_index,status,created_at');
  if (r.error) return bad(r.error.message, 500);
  r.data.sort((a, b) => a.order_index - b.order_index);
  return ok({ chapters: r.data });
}

async function chaptersCreate(bookId, req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const me = await pg.select('users', { phone }, 'is_author', true);
  if (!me.data || !me.data.is_author) return bad('需要先申请成为作者', 403);
  const body = await readJSON(req);
  const { title, body: content } = body;
  if (!title || !content) return bad('需要 title / body');
  const last = await pg.select('chapters', { book_id: bookId }, 'order_index');
  const next = last.data && last.data.length ? Math.max(...last.data.map((c) => c.order_index)) + 1 : 1;
  const id = `c${Date.now()}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const r = await pg.insert('chapters', {
    id, book_id: bookId, title, body: content,
    order_index: next, status: 'approved',
  });
  if (r.error) return bad(r.error.message, 500);
  return ok({ chapter: r.data[0] });
}

async function chapterGet(id, env) {
  const pg = new Pg(env);
  const r = await pg.select('chapters', { id, status: 'approved' }, '*', true);
  if (r.error) return bad(r.error.message, 500);
  if (!r.data) return bad('章节不存在', 404);
  return ok({ chapter: r.data });
}

async function chapterUpdate(id, req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const me = await pg.select('users', { phone }, 'is_author', true);
  if (!me.data || !me.data.is_author) return bad('需要先申请成为作者', 403);
  const body = await readJSON(req);
  const patch = {};
  if (body.title) patch.title = body.title;
  if (body.body) patch.body = body.body;
  const r = await pg.update('chapters', patch, { id });
  if (r.error) return bad(r.error.message, 500);
  return ok({ chapter: r.data && r.data[0] });
}

async function shelfGet(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const r = await pg.select('shelves', { user_phone: phone }, 'book_id');
  if (r.error) return bad(r.error.message, 500);
  const ids = r.data.map((s) => s.book_id);
  if (ids.length === 0) return ok({ shelf: [] });
  const q = ids.map((i) => `"${i}"`).join(',');
  const books = await pg._fetch('GET', '/books', null, `select=id,title,author,cover_url,genre,hot&id=in.(${q})`);
  if (books.error) return bad(books.error.message, 500);
  return ok({ shelf: books.data || [] });
}

async function shelfAdd(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const body = await readJSON(req);
  if (!body.book_id) return bad('需要 book_id');
  const pg = new Pg(env);
  const r = await pg.insert('shelves', { user_phone: phone, book_id: body.book_id });
  if (r.error && r.error.code !== '23505') return bad(r.error.message, 500);
  return ok();
}

async function shelfRemove(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const body = await readJSON(req);
  if (!body.book_id) return bad('需要 book_id');
  const pg = new Pg(env);
  const r = await pg.delete('shelves', { user_phone: phone, book_id: body.book_id });
  if (r.error) return bad(r.error.message, 500);
  return ok();
}

async function historyGet(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const r = await pg.select('history', { user_phone: phone }, 'id,book_id,chapter_id,at', false);
  if (r.error) return bad(r.error.message, 500);
  const ids = (r.data || []).map((h) => h.book_id).filter(Boolean);
  let books = [];
  if (ids.length) {
    const q = Array.from(new Set(ids)).map((i) => `"${i}"`).join(',');
    const b = await pg._fetch('GET', '/books', null, `select=id,title,author,cover_url,genre,hot&id=in.(${q})`);
    books = b.data || [];
  }
  const map = new Map(books.map((b) => [b.id, b]));
  const history = (r.data || []).map((h) => ({ at: h.at, book_id: h.book_id, chapter_id: h.chapter_id, ...(map.get(h.book_id) || {}) }));
  return ok({ history });
}

async function historyPost(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const body = await readJSON(req);
  if (!body.book_id) return bad('需要 book_id');
  const pg = new Pg(env);
  const r = await pg.insert('history', {
    user_phone: phone, book_id: body.book_id, chapter_id: body.chapter_id || null,
  });
  if (r.error) return bad(r.error.message, 500);
  return ok();
}

async function bannersList(env) {
  const pg = new Pg(env);
  const r = await pg.select('banners', { active: true }, 'id,text,active,created_at');
  if (r.error) return bad(r.error.message, 500);
  return ok({ banners: r.data || [] });
}

async function bannersCreate(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const me = await pg.select('users', { phone }, 'is_editor', true);
  if (!me.data || !me.data.is_editor) return bad('需要编辑权限', 403);
  const body = await readJSON(req);
  if (!body.text) return bad('需要 text');
  const id = `bn${Date.now()}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const r = await pg.insert('banners', {
    id, text: body.text, active: body.active !== false,
  });
  if (r.error) return bad(r.error.message, 500);
  return ok({ banner: r.data[0] });
}

async function bannersUpdate(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const me = await pg.select('users', { phone }, 'is_editor', true);
  if (!me.data || !me.data.is_editor) return bad('需要编辑权限', 403);
  const body = await readJSON(req);
  if (!body.id) return bad('需要 id');
  const patch = {};
  if (body.text !== undefined) patch.text = body.text;
  if (body.active !== undefined) patch.active = body.active;
  const r = await pg.update('banners', patch, { id: body.id });
  if (r.error) return bad(r.error.message, 500);
  return ok({ banner: r.data && r.data[0] });
}

async function ratingsTop(env) {
  const pg = new Pg(env);
  const [ratings, books] = await Promise.all([
    pg.select('ratings', {}, 'book_id,score'),
    pg.select('books', {}, 'id,title,author,genre,cover_url,hot,intro'),
  ]);
  if (books.error) return bad(books.error.message, 500);
  const M = 5, R = 3.0;
  const agg = new Map();
  for (const r of ratings.data || []) {
    const a = agg.get(r.book_id) || { n: 0, sum: 0 };
    a.n += 1; a.sum += r.score;
    agg.set(r.book_id, a);
  }
  const ranked = (books.data || []).map((b) => {
    const a = agg.get(b.id) || { n: 0, sum: 0 };
    return { ...b, rating_n: a.n, rating_avg: Math.round((a.n ? a.sum / a.n : 0) * 10) / 10, rating_bayes: Math.round((a.sum + M*R)/(a.n+M) * 100) / 100 };
  }).sort((a, b) => b.rating_bayes - a.rating_bayes).slice(0, 20);
  return ok({ books: ranked });
}

async function ratingsPost(req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const body = await readJSON(req);
  if (!body.book_id) return bad('需要 book_id');
  const s = parseInt(body.score, 10);
  if (!Number.isFinite(s) || s < 1 || s > 5) return bad('score 必须是 1..5');
  const pg = new Pg(env);
  const exist = await pg.select('ratings', { user_phone: phone, book_id: body.book_id }, 'user_phone', true);
  if (exist.error) return bad(exist.error.message, 500);
  if (exist.data) {
    const r = await pg.update('ratings', { score: s, updated_at: new Date().toISOString() }, { user_phone: phone, book_id: body.book_id });
    if (r.error) return bad(r.error.message, 500);
    return ok({ my_score: s, updated: true });
  } else {
    const r = await pg.insert('ratings', { user_phone: phone, book_id: body.book_id, score: s });
    if (r.error && r.error.code !== '23505') return bad(r.error.message, 500);
    return ok({ my_score: s, updated: false });
  }
}

async function ratingsMe(bookId, req, env) {
  const phone = await getPhone(req, env);
  if (!phone) return bad('未登录', 401);
  const pg = new Pg(env);
  const r = await pg.select('ratings', { user_phone: phone, book_id: bookId }, 'score', true);
  if (r.error) return bad(r.error.message, 500);
  return ok({ score: r.data ? r.data.score : null });
}
