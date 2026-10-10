// bootstrap.js —— 应用启动前统一登录状态 + 服务端数据
// 在 index.html / author.html / editor.html 里 data.js 之后、app.js 之前引入
//
// 行为:
//   1. /api/auth/me 未登录 -> 跳 auth.html
//   2. 已登录:
//        - 用服务端数据初始化 CURRENT_USER(保留原字段名)
//        - 把服务端 books 注入 BOOKS_EXTRA
//        - 把服务端 banners 注入 BANNERS_REMOTE
//        - 把服务端 shelf/history 注入 CURRENT_USER.shelf / .visit
//        - 修复 logout / goAuthor / goEditor,走真鉴权
//        - 修 pushVisit 同时打服务端
//
// 同时把 localStorage 那套弱化掉——永远让 CURRENT_USER 与服务端为准。

(async function bootstrap() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const MAX_WAIT = 5000; // 5s 超时
  let me = null;
  const t0 = Date.now();
  while (Date.now() - t0 < MAX_WAIT) {
    try {
      me = await window.__novelFetch('/api/auth/me');
      break;
    } catch (e) {
      if (/401/.test(String(e.message))) {
        location.replace('./auth.html');
        return;
      }
      // 网络等其它错误,等一会再试
      await sleep(300);
    }
  }
  if (!me) {
    location.replace('./auth.html');
    return;
  }
  const user = me.user;
  window.__CURRENT_USER_REMOTE = user;

  // ---- 并行取数据 ----
  const [booksRes, bannersRes, shelfRes, historyRes] = await Promise.all([
    window.__novelFetch('/api/books').catch(() => ({ books: [] })),
    window.__novelFetch('/api/banners').catch(() => ({ banners: [] })),
    window.__novelFetch('/api/shelf').catch(() => ({ shelf: [] })),
    window.__novelFetch('/api/history').catch(() => ({ history: [] })),
  ]);

  // 每本书的章节并行拉
  let serverChaptersByBook = {};
  try {
    const bookIds = (booksRes.books || []).map((b) => b.id);
    const arr = await Promise.all(bookIds.map((id) =>
      window.__novelFetch(`/api/books/${id}/chapters`).then((r) => [id, r.chapters || []]).catch(() => [id, []])
    ));
    serverChaptersByBook = Object.fromEntries(arr);
  } catch {}
  window.__SERVER_CHAPTERS__ = serverChaptersByBook;

  // ---- 注入 book(并入内置 BOOKS,再用 server 的覆盖)----
  window.BOOKS_REMOTE = booksRes.books || [];
  window.BANNERS_REMOTE = bannersRes.banners || [];
  window.SHELF_REMOTE = (shelfRes.shelf || []).map((b) => b.id);
  window.VISIT_REMOTE = (historyRes.history || []).map((b) => b.book_id);

  // 用 server 书的 genre 字段映射回 genreId,保兼容 app.js
  const genreToId = {
    '玄幻': 'g_fantasy', '都市': 'g_city', '历史': 'g_history',
    '言情': 'g_romance', '科幻': 'g_scifi', '悬疑': 'g_suspense', '散文': 'g_essay',
  };
  const booksForApp = window.BOOKS_REMOTE.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    authorId: null,
    genreId: genreToId[b.genre] || 'g_essay',
    cover: b.cover_url || '',
    intro: b.intro || '',
    status: '连载中',
    words: '',
    hot: b.hot || 0,
    rating_n: b.rating_n || 0,
    rating_avg: b.rating_avg || 0,
    rating_bayes: b.rating_bayes || 0,
    _remote: true,
  }));

  // 写一个合并视图,覆盖 getAllBooks 的实现
  const origGetAllBooks = window.getAllBooks;
  window.getAllBooks = function () {
    // server 的优先(用真实书)
    return booksForApp.slice();
  };
  window.findBook = function (id) {
    return booksForApp.find((b) => b.id === id) || null;
  };
  window.booksByGenre = function (gid) {
    return booksForApp.filter((b) => b.genreId === gid);
  };

  // 章节:服务端优先,然后透传本地生成
  const origAllChapters = window.getAllChapters;
  window.getAllChapters = function () {
    // 本地生成那 3 章样章对于服务端书依然存在(CHAPTERS[b.id])
    // 我们把服务端章节覆盖其上
    const localChapters = typeof origAllChapters === 'function' ? origAllChapters() : (window.CHAPTERS || {});
    const out = {};
    const server = window.__SERVER_CHAPTERS__ || {};
    // 本地先填 (作为 fallback,例如老读者)
    for (const k in localChapters) {
      const remote = server[k] || [];
      // 服务端章节补在前面(已审核),保留任何本地生成但 server 有的
      const merged = remote.slice();
      for (const c of localChapters[k]) {
        if (!merged.find((x) => x.id === c.id || x.title === c.title)) merged.push(c);
      }
      out[k] = merged;
    }
    // server-only 书加入 (本地 CHAPTERS 里没有)
    for (const k in server) {
      if (!out[k]) out[k] = server[k];
    }
    return out;
  };

  // ---- 当前用户注入 ----
  window.CURRENT_USER = window.CURRENT_USER || {};
  const role = user.isEditor ? 'editor' : user.isAuthor ? 'author' : 'reader';
  Object.assign(window.CURRENT_USER, {
    role,
    name: user.name || (role === 'editor' ? '总编' : role === 'author' ? '作者' : '读者'),
    phone: user.phone,
    isAuthor: user.isAuthor,
    isEditor: user.isEditor,
    avatar: 'assets/avatar.svg',
    // 书架 / 访问历史 = 服务端
    shelf: window.SHELF_REMOTE.slice(),
    visit: window.VISIT_REMOTE.slice(),
    history: window.VISIT_REMOTE.slice(),
  });

  // ---- 公告:优先远程 ----
  const origLoadBanners = window.loadBanners;
  window.loadBanners = function () {
    if (window.BANNERS_REMOTE.length) return window.BANNERS_REMOTE.slice();
    return origLoadBanners ? origLoadBanners() : [];
  };

  // ---- 收藏操作:本地走 + 同步服务端 ----
  window.toggleShelf = async function (id) {
    const arr = window.CURRENT_USER.shelf;
    const idx = arr.indexOf(id);
    const added = idx < 0;
    if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
    try {
      if (added) await window.__novelFetch('/api/shelf', { method: 'POST', body: { book_id: id } });
      else await window.__novelFetch('/api/shelf', { method: 'DELETE', body: { book_id: id } });
    } catch (e) { console.warn('shelf sync failed', e); }
    return added;
  };

  // ---- 访问历史:点击书时打服务端一条 ----
  const origPush = window.pushVisit;
  window.pushVisit = function (id) {
    try { window.__novelFetch('/api/history', { method: 'POST', body: { book_id: id } }); } catch {}
    const arr = window.CURRENT_USER.visit || (window.CURRENT_USER.visit = []);
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1);
    arr.unshift(id);
    if (arr.length > 50) arr.length = 50;
  };

  // ---- 替换 logout ----
  window.logout = async function () {
    try { await window.__novelFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    location.replace('./auth.html');
  };

  // ---- 拦截 goAuthor / goEditor:权限不足回主页 ----
  window.goAuthor = function () {
    if (user.isAuthor) location.href = './author.html';
    else alert('请先在"我的"页申请成为作者');
  };
  window.goEditor = function () {
    if (user.isEditor) location.href = './editor.html';
    else alert('没有编辑权限');
  };

  // ---- 直接抹掉 pageLogin 的入口:已登录不会再用 ----
  window.goLogin = function () {
    location.replace('./me.html');
  };

  // 让后续脚本能确认 boot 完成
  window.__BOOTED__ = true;
  document.dispatchEvent(new Event('novel:booted'));
})();
