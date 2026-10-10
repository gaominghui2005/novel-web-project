// Cloudflare Pages 顶层 catch-all router
// 路径:/functions/api/[[path]].js
//
// 与 /api/* 路径对应,内部按 url 路径分发给 handler。
// 复用 api/* ESM 模块(同步函数风格),不做大改动。

import * as pathHandler from 'file:///C:/Users/PC/Desktop/小说网页项目/api/index.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const p = url.pathname; // 例如 /api/auth/phone-password

  // 路由解析
  const match = routeOf(p);
  if (!match) {
    return json({ ok: false, error: 'not found' }, 404);
  }

  try {
    const mod = match.mod;  // 来自 api/*
    const params = match.params;
    const handler = mod.default || mod.handler;
    if (!handler) return json({ ok: false, error: 'no handler' }, 500);

    // 适配 Pages fetch request -> Node-like (req,res)
    const res = await run(handler, context.request, params);
    return res;
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
}

// 模拟 express 的 req / res,handler 内部还按习惯写
async function run(handler, request, params) {
  const url = new URL(request.url);
  const method = request.method;

  // body 解析
  let body = {};
  const ct = request.headers.get('content-type') || '';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      if (ct.includes('application/json')) {
        body = await request.json();
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const txt = await request.text();
        body = Object.fromEntries(new URLSearchParams(txt));
      } else {
        body = await request.json().catch(() => ({}));
      }
    } catch (e) { body = {}; }
  }

  // 假装 req
  const req = {
    method,
    headers: Object.fromEntries(request.headers),
    body,
    query: Object.fromEntries(url.searchParams),
    params,
    raw: request,
  };

  // 聚合 res 的写状态
  let statusCode = 200;
  let headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  let sent = false;
  let payload = null;

  const res = {
    status(c) { statusCode = c; return res; },
    setHeader(k, v) { headers.set(k, v); return res; },
    getHeader(k) { return headers.get(k); },
    json(body, code) {
      if (typeof code === 'number') statusCode = code;
      payload = JSON.stringify(body);
      sent = true;
    },
    end() { sent = true; },
    send(body) {
      if (typeof body === 'object') payload = JSON.stringify(body);
      else payload = String(body);
      sent = true;
    },
  };

  // 跑 handler
  await handler(req, res);

  // 自定义 cookie header 等都已写到 headers
  if (!sent) {
    return new Response('', { status: statusCode, headers });
  }

  // 这是 post-接(POST phone-password 用 setTokenCookie 写到 res.setHeader)
  return new Response(payload || '', { status: statusCode, headers });
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// ---------- 路由表 ----------
const routeOf = (pathname) => {
  // /api/health
  if (pathname === '/api/health') return { mod: mod('health.js'), params: {} };

  // /api/auth/*
  if (pathname === '/api/auth/phone-password') return { mod: mod('auth/phone-password.js'), params: {} };
  if (pathname === '/api/auth/me') return { mod: mod('auth/me.js'), params: {} };
  if (pathname === '/api/auth/logout') return { mod: mod('auth/logout.js'), params: {} };
  if (pathname === '/api/auth/become-author') return { mod: mod('auth/become-author.js'), params: {} };

  // /api/books
  if (pathname === '/api/books' || pathname === '/api/books/') return { mod: mod('books/index.js'), params: {} };

  // /api/books/:id
  let m = pathname.match(/^\/api\/books\/([^/]+?)\/?$/);
  if (m) return { mod: mod('books/[id].js'), params: { id: m[1] } };

  // /api/books/:id/chapters
  m = pathname.match(/^\/api\/books\/([^/]+)\/chapters\/?$/);
  if (m) return { mod: mod('books/[id]/chapters.js'), params: { id: m[1] } };

  // /api/books/:id/cover
  m = pathname.match(/^\/api\/books\/([^/]+)\/cover\/?$/);
  if (m) return { mod: mod('books/[id]/cover.js'), params: { id: m[1] } };

  // /api/chapters/:id
  m = pathname.match(/^\/api\/chapters\/([^/]+?)\/?$/);
  if (m) return { mod: mod('chapters/[id].js'), params: { id: m[1] } };

  if (pathname === '/api/history' || pathname === '/api/history/') return { mod: mod('history.js'), params: {} };
  if (pathname === '/api/shelf' || pathname === '/api/shelf/') return { mod: mod('shelf.js'), params: {} };

  // /api/banners
  if (pathname === '/api/banners' || pathname === '/api/banners/') return { mod: mod('banners.js'), params: {} };

  // /api/ratings
  if (pathname === '/api/ratings' || pathname === '/api/ratings/') return { mod: mod('ratings.js'), params: {} };

  // /api/ratings/me/:bookId
  m = pathname.match(/^\/api\/ratings\/me\/([^/]+?)\/?$/);
  if (m) return { mod: mod('ratings/me/[bookId].js'), params: { bookId: m[1] } };

  return null;
};

const API_DIR = 'C:\\Users\\PC\\Desktop\\小说网页项目\\api';
function mod(rel) {
  // 用 file:// 绝对路径,避免 Windows 相对 import 解析错
  let abs = API_DIR + '\\' + rel;
  abs = abs.replace(/\\/g, '/');
  if (!abs.startsWith('/')) abs = '/' + abs;
  return 'file://' + abs;
}
