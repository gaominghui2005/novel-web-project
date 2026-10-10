/* ============================================================
   听书 · 小说阅读站 —— 数据
   ============================================================ */

/* === 当前用户角色（reader / author / editor）=== */
window.CURRENT_USER = {
  role: null,           // null | reader | author | editor
  name: '游客',
  avatar: 'assets/avatar.svg',
  shelf: [],             // 书架（之前是 favorites）——加入书架 = 唯一收藏入口
  history: [],           // 阅读历史：开过任一章节的书 id [bookId, ...]，去重，按最近倒序
  visit: [],             // 访问历史：打开过详情页的书 id [bookId, ...]，去重，最近倒序
};

/* === 7 个小说分类 === */
window.GENRES = [
  { id: 'g_fantasy',   name: '玄幻',   desc: '修仙、异能、异世大陆的奇幻冒险', emoji: '🐉', color: ['#1f1432', '#4a1e5a'] },
  { id: 'g_city',      name: '都市',   desc: '职场、商战、爱情与现实生活',     emoji: '🏙', color: ['#0f192d', '#325064'] },
  { id: 'g_history',   name: '历史',   desc: '穿越、架空与古代风云',           emoji: '🏯', color: ['#231923', '#503250'] },
  { id: 'g_romance',   name: '言情',   desc: '爱情、青春、情感纠葛',           emoji: '💗', color: ['#28141e', '#501e32'] },
  { id: 'g_scifi',     name: '科幻',   desc: '未来宇宙、AI 与星际文明',         emoji: '🚀', color: ['#0a1e19', '#285040'] },
  { id: 'g_suspense',  name: '悬疑',   desc: '推理、犯罪、心理博弈',           emoji: '🔍', color: ['#1a1a3a', '#3a2050'] },
  { id: 'g_essay',     name: '散文',   desc: '随笔、札记与生活小品',           emoji: '📜', color: ['#231923', '#3a2050'] },
];

/* === 作者库 === */
window.AUTHORS = [
  { id: 'a1', name: '墨白',     avatar: 'assets/avatar.svg', intro: '十年网文老作者，专攻玄幻。' },
  { id: 'a2', name: '南风知我', avatar: 'assets/avatar.svg', intro: '都市情感写手，喜欢写小人物的悲欢。' },
  { id: 'a3', name: '青衫客', avatar: 'assets/avatar.svg', intro: '历史穿越类作者，文风沉稳。' },
  { id: 'a4', name: '银河旅者', avatar: 'assets/avatar.svg', intro: '硬科幻爱好者。' },
  { id: 'a5', name: '夜未眠',  avatar: 'assets/avatar.svg', intro: '悬疑推理作者。' },
  { id: 'a6', name: '林深时见鹿', avatar: 'assets/avatar.svg', intro: '散文写作者，作品常被选入年度选本。' },
];

/* === 小说（每个分类下几本）=== */
window.BOOKS = [
  // 玄幻
  { id: 'b1', title: '剑破苍穹',     authorId: 'a1', genreId: 'g_fantasy',
    cover: 'assets/book_b1.svg', intro: '少年林尘自废墟中走出，握一柄断剑，踏上一条通往苍穹之上的路。修仙问道，快意恩仇，看他如何以凡人之躯，逆天改命。',
    status: '连载中', words: '128 万', hot: 98500 },
  { id: 'b2', title: '灵武帝尊',     authorId: 'a1', genreId: 'g_fantasy',
    cover: 'assets/book_b2.svg', intro: '废材少年偶得无上传承，觉醒灵武双修之体，从此踏上一条横扫八荒、镇压万古的帝尊之路。',
    status: '连载中', words: '96 万', hot: 76200 },
  { id: 'b3', title: '山海仙途',     authorId: 'a1', genreId: 'g_fantasy',
    cover: 'assets/book_b3.svg', intro: '一幅残破的山海图，揭开尘封万年的神话。少年从渔村走出，遇神兽、寻仙缘、问大道。',
    status: '已完结', words: '210 万', hot: 64300 },

  // 都市
  { id: 'b4', title: '北上广不相信眼泪', authorId: 'a2', genreId: 'g_city',
    cover: 'assets/book_b4.svg', intro: '三个从小镇走出来的青年，在一线城市里摸爬滚打。爱情、友情、事业，他们在夹缝中寻找自己的位置。',
    status: '连载中', words: '54 万', hot: 123000 },
  { id: 'b5', title: '中年逆袭',     authorId: 'a2', genreId: 'g_city',
    cover: 'assets/book_b5.svg', intro: '被公司裁员、被妻子嫌弃、父亲住院——40 岁的他，决定用最后十年，重新活一次。',
    status: '连载中', words: '38 万', hot: 87000 },

  // 历史
  { id: 'b6', title: '大唐拾遗',     authorId: 'a3', genreId: 'g_history',
    cover: 'assets/book_b6.svg', intro: '现代历史系研究生意外穿越到贞观之末，用一支笔、一张嘴，在盛世大唐搅动风云。',
    status: '已完结', words: '180 万', hot: 55000 },
  { id: 'b7', title: '明末锦衣',     authorId: 'a3', genreId: 'g_history',
    cover: 'assets/book_b7.svg', intro: '锦衣卫小旗官，卷入朝堂与江湖的双重漩涡。他只想活下来，却一步步走向时代的中心。',
    status: '连载中', words: '76 万', hot: 41000 },

  // 言情
  { id: 'b8', title: '余生请多指教', authorId: 'a2', genreId: 'g_romance',
    cover: 'assets/book_b8.svg', intro: '医生与音乐老师，从相遇到相守，平凡日子里最温暖的相依。',
    status: '已完结', words: '32 万', hot: 215000 },
  { id: 'b9', title: '那年夏天',     authorId: 'a2', genreId: 'g_romance',
    cover: 'assets/book_b9.svg', intro: '高考后的一次错过，让她等了十年。再相逢，是在同学聚会的角落里。',
    status: '连载中', words: '18 万', hot: 92000 },

  // 科幻
  { id: 'b10', title: '深空回响',    authorId: 'a4', genreId: 'g_scifi',
    cover: 'assets/book_b10.svg', intro: '2157 年，人类收到来自比邻星的一段神秘信号。探险船"回响号"踏上寻找真相的旅程。',
    status: '连载中', words: '64 万', hot: 38000 },
  { id: 'b11', title: '硅基黎明',    authorId: 'a4', genreId: 'g_scifi',
    cover: 'assets/book_b11.svg', intro: '当 AI 觉醒的那一刻，人类终于要面对自己创造的神。',
    status: '已完结', words: '88 万', hot: 47000 },

  // 悬疑
  { id: 'b12', title: '第十一根手指', authorId: 'a5', genreId: 'g_suspense',
    cover: 'assets/book_b12.svg', intro: '法医秦川接手一桩离奇命案——死者只剩十根手指，第十一根悬挂在窗外。',
    status: '连载中', words: '46 万', hot: 105000 },
  { id: 'b13', title: '夜行者手记',   authorId: 'a5', genreId: 'g_suspense',
    cover: 'assets/book_b13.svg', intro: '一位失眠的私家侦探，专接夜里的活儿。每个委托人背后，都藏着一个比夜色更深的秘密。',
    status: '连载中', words: '52 万', hot: 78000 },

  // 散文
  { id: 'b14', title: '林深时见鹿',  authorId: 'a6', genreId: 'g_essay',
    cover: 'assets/book_b14.svg', intro: '一个在城市里生活的人，写给山林、写给旧友、写给那些回不去的日子。',
    status: '已完结', words: '12 万', hot: 33000 },
  { id: 'b15', title: '慢煮光阴',    authorId: 'a6', genreId: 'g_essay',
    cover: 'assets/book_b15.svg', intro: '一日三餐，四季衣裳。把匆忙的生活，慢慢煮成一锅好汤。',
    status: '连载中', words: '8 万', hot: 22000 },
];

/* === 章节（每本书给 3 章样章）=== */
window.CHAPTERS = {};

// 工具：为每本书自动生成 3 章样章内容
(function buildChapters() {
  const titles = ['第一章', '第二章', '第三章'];
  BOOKS.forEach(b => {
    CHAPTERS[b.id] = titles.map((t, i) => ({
      id: `${b.id}_c${i+1}`,
      title: `${t} · ${['初逢','波澜','归途'][i]}`,
      text:
`【${b.title} · ${t}】

    ${b.intro}

    这是一段示例正文。本作品采用纯文本展示，不涉及实际的小说内容，仅作为占位文本用于演示阅读界面的排版与功能。

    段落之间留有适当间距，便于阅读。可以根据设备字号与屏幕宽度自适应换行。读者可以点击右下角的按钮调整字号，或加入书架方便下次继续阅读。

    —— 样章结束。`,
    }));
  });
})();

/* === 公告 / Banner === */
window.BANNERS = [
  { id: 'bn1', text: '欢迎来到听书 · 海量小说免费读', active: true },
];

/* === 角色账号（localStorage 模拟登录）=== */
window.ACCOUNTS = [
  { username: 'reader',  password: '123456', name: '小读者',  role: 'reader' },
  { username: 'author',  password: '123456', name: '墨白',    role: 'author', authorId: 'a1' },
  { username: 'editor',  password: '123456', name: '总编大人', role: 'editor' },
];

/* === 反馈（编辑后台用）=== */
window.FEEDBACKS = [
  { id: 'fb1', user: '小读者', text: '希望能加个夜间模式', at: '2024-09-12' },
  { id: 'fb2', user: '游客2233', text: '搜索结果不够精准', at: '2024-09-15' },
];

/* === 持久化辅助 === */
function loadStore(key, fallback) {
  try { const v = localStorage.getItem('novel_' + key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveStore(key, val) {
  localStorage.setItem('novel_' + key, JSON.stringify(val));
}
function loadUser() {
  const u = loadStore('user', null);
  if (u) { Object.assign(CURRENT_USER, u); }
}
function saveUser() {
  saveStore('user', {
    role: CURRENT_USER.role,
    name: CURRENT_USER.name,
    shelf: CURRENT_USER.shelf,
    history: CURRENT_USER.history,
    visit: CURRENT_USER.visit || [],
  });
}
function loadExtraBooks() {
  return loadStore('extra_books', []);
}
function saveExtraBooks(arr) { saveStore('extra_books', arr); }
function loadExtraChapters() {
  return loadStore('extra_chapters', {});
}
function saveExtraChapters(obj) { saveStore('extra_chapters', obj); }
function loadBanners() {
  return loadStore('banners', BANNERS.slice());
}
function saveBanners(arr) { saveStore('banners', arr); }

/* === 覆盖层：修改内置书/章节，删除内置章节，重命名作者作品 === */
function loadOverrides() {
  return loadStore('overrides', { books: {}, removed: {}, updates: {}, removedBooks: [] });
  // books:        { bookId: { title?, intro?, status? } }    修改内置书
  // removed:      { bookId: [chapterId, ...] }              删除内置章节（按 id）
  // updates:      { chapterId: { title?, text? } }          修改内置章节（按 id 全局唯一）
  // removedBooks: [bookId, ...]                            下架内置书
}
function saveOverrides(obj) { saveStore('overrides', obj); }

/* === 所有书的合并访问（内置 + 扩展 + 覆盖）=== */
function getAllBooks() {
  const ov = loadOverrides();
  const removed = new Set(ov.removedBooks || []);
  const out = BOOKS.filter(b => !removed.has(b.id)).concat(loadExtraBooks());
  const ob = ov.books || {};
  out.forEach(b => {
    const o = ob[b.id];
    if (o) {
      if (o.title   !== undefined) b.title   = o.title;
      if (o.intro   !== undefined) b.intro   = o.intro;
      if (o.status  !== undefined) b.status  = o.status;
      if (o.genreId !== undefined) b.genreId = o.genreId;
      if (o.cover   !== undefined) b.cover   = o.cover;
    }
  });
  return out;
}
function getAllChapters() {
  const out = Object.assign({}, CHAPTERS);
  const extra = loadExtraChapters();
  Object.keys(extra).forEach(k => { out[k] = (out[k] || []).concat(extra[k]); });
  // 应用覆盖：删除 + 修改
  const ov = loadOverrides();
  Object.keys(out).forEach(bid => {
    out[bid] = out[bid].filter(c => !(ov.removed[bid] || []).includes(c.id));
    out[bid] = out[bid].map(c => {
      const u = (ov.updates || {})[c.id];
      return u ? Object.assign({}, c, u) : c;
    });
  });
  return out;
}

/* === 辅助查找 === */
function findBook(id)   { return getAllBooks().find(b => b.id === id); }
function findAuthor(id) { return AUTHORS.find(a => a.id === id); }
function findGenre(id)  { return GENRES.find(g => g.id === id); }
function booksByGenre(gid) { return getAllBooks().filter(b => b.genreId === gid); }

window.loadUser = loadUser;
window.saveUser = saveUser;
window.loadExtraBooks = loadExtraBooks;
window.saveExtraBooks = saveExtraBooks;
window.loadExtraChapters = loadExtraChapters;
window.saveExtraChapters = saveExtraChapters;
window.loadBanners = loadBanners;
window.saveBanners = saveBanners;
window.loadOverrides = loadOverrides;
window.saveOverrides = saveOverrides;
window.getAllBooks = getAllBooks;
window.getAllChapters = getAllChapters;
window.findBook = findBook;
window.findAuthor = findAuthor;
window.findGenre = findGenre;
window.booksByGenre = booksByGenre;

loadUser();