// Cloudflare Pages catch-all router
// 路径: /functions/api/[[path]].js
//
// Cloudflare Pages 把 /api/* 路由到这里,我们再分发到 ../api/* 模块。

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const p = url.pathname; // 例如 /api/auth/phone-password

  const match = routeOf(p);
  if (!match) {
    return json({ ok: false, error: 'not found' }, 404);
  }

  try {
    const mod = await import(match.mod);
    const handler = mod.default || mod.handler;
    if (!handler) return json({ ok: false, error: 'no handler' }, 500);

    const res = await run(handler, context.request, match.params);
    return res;
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500);
  }
}

// 把 api/* 模块包装成 Pages Response
async function run(handler, request, params) {
  const url = new URL(request.url);
  const method = request.method;

  let body = {};
  const ct = request.headers.get('content-type') || '';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      if (ct.includes('json')) body = await request.json();
      else body = await request.text().then((t) => Object.fromEntries(new URLSearchParams(t)));
    } catch { body = {}; }
  }

  const req = {
    method,
    headers: Object.fromEntries(request.headers),
    body,
    query: Object.fromEntries(url.searchParams),
    params,
  };

  let statusCode = 200;
  const headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  let payload = '';
  let sent = false;

  const res = {
    status(c) { statusCode = c; return res; },
    setHeader(k, v) { headers.set(k, v); return res; },
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

  await handler(req, res);

  if (!sent) return new Response('', { status: statusCode, headers });
  return new Response(payload || '', { status: statusCode, headers });
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// 路由表:返回要 import 的相对路径
function routeOf(pathname) {
  // health
  if (pathname === '/api/health') return { mod: '../api/health.js', params: {} };

  // auth/*
  if (pathname === '/api/auth/phone-password') return { mod: '../api/auth/phone-password.js', params: {} };
  if (pathname === '/api/auth/me') return { mod: '../api/auth/me.js', params: {} };
  if (pathname === '/api/auth/logout') return { mod: '../api/auth/logout.js', params: {} };
  if (pathname === '/api/auth/become-author') return { mod: '../api/auth/become-author.js', params: {} };

  // books
  if (pathname === '/api/books' || pathname === '/api/books/') return { mod: '../api/books/index.js', params: {} };
  let m = pathname.match(/^\/api\/books\/([^/]+?)\/?$/);
  if (m) return { mod: '../api/books/[id].js', params: { id: m[1] } };
  m = pathname.match(/^\/api\/books\/([^/]+)\/chapters\/?$/);
  if (m) return { mod: '../api/books/[id]/chapters.js', params: { id: m[1] } };
  m = pathname.match(/^\/api\/books\/([^/]+)\/cover\/?$/);
  if (m) return { mod: '../api/books/[id]/cover.js', params: { id: m[1] } };

  // chapters
  m = pathname.match(/^\/api\/chapters\/([^/]+?)\/?$/);
  if (m) return { mod: '../api/chapters/[id].js', params: { id: m[1] } };

  // history / shelf
  if (pathname === '/api/history' || pathname === '/api/history/') return { mod: '../api/history.js', params: {} };
  if (pathname === '/api/shelf' || pathname === '/api/shelf/') return { mod: '../api/shelf.js', params: {} };

  // banners
  if (pathname === '/api/banners' || pathname === '/api/banners/') return { mod: '../api/banners.js', params: {} };

  // ratings
  if (pathname === '/api/ratings' || pathname === '/api/ratings/') return { mod: '../api/ratings.js', params: {} };
  m = pathname.match(/^\/api\/ratings\/me\/([^/]+?)\/?$/);
  if (m) return { mod: '../api/ratings/me/[bookId].js', params: { bookId: m[1] } };

  return null;
}
