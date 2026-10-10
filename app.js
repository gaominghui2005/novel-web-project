/* ============================================================
   听书 · 小说阅读站 —— 主应用
   角色：reader（读者）/ author（作者）/ editor（编辑）
   ============================================================ */

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const APP_BODY = () => $('#app-body');
const TAB_BAR  = () => $('#tab-bar');

function toast(msg, ms = 1500) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), ms);
}

/* === 书架 === */
function isInShelf(id) { return CURRENT_USER.shelf.includes(id); }
function toggleShelf(id) {
  const i = CURRENT_USER.shelf.indexOf(id);
  if (i >= 0) CURRENT_USER.shelf.splice(i, 1);
  else CURRENT_USER.shelf.push(id);
  saveUser();
  return i < 0;
}
/* === 访问历史：打开书详情时记一次，去重、限制 50 条 === */
function pushVisit(bid) {
  if (!CURRENT_USER.visit) CURRENT_USER.visit = [];
  const i = CURRENT_USER.visit.indexOf(bid);
  if (i >= 0) CURRENT_USER.visit.splice(i, 1);
  CURRENT_USER.visit.unshift(bid);
  if (CURRENT_USER.visit.length > 50) CURRENT_USER.visit.length = 50;
  saveUser();
}

window.isInShelf = isInShelf;
window.toggleShelf = toggleShelf;
window.pushVisit = pushVisit;

/* === 全局设置：字号 / 夜间模式 === */
const PREFS = {
  fontSize:   parseInt(localStorage.getItem('novel_fs') || '16'),
  nightMode:  localStorage.getItem('novel_night') === '1',
};
function applyPrefs() {
  document.documentElement.style.setProperty('--reader-font-size', PREFS.fontSize + 'px');
  document.body.classList.toggle('night', PREFS.nightMode);
}
function setFontSize(n) {
  PREFS.fontSize = Math.max(13, Math.min(24, n));
  localStorage.setItem('novel_fs', String(PREFS.fontSize));
  applyPrefs();
}
function toggleNight() {
  PREFS.nightMode = !PREFS.nightMode;
  localStorage.setItem('novel_night', PREFS.nightMode ? '1' : '0');
  applyPrefs();
}
window.setFontSize = setFontSize;
window.toggleNight = toggleNight;
applyPrefs();

/* === 登录页：顶部角色高选 + 中间账号 === */
const ROLE_META = {
  reader: { icon: '📖', name: '读者', desc: '看书 / 入书架 / 收藏', hint: '账号 reader / 123456', tone: '#7C9EFF' },
  author: { icon: '✍',  name: '作者', desc: '写书 / 管理章节 / 划状态', hint: '账号 author / 123456', tone: '#A78BFA' },
  editor: { icon: '🛠', name: '编辑', desc: '审核 / Banner / 反馈', hint: '账号 editor / 123456', tone: '#34D399' },
};
window._loginRole = 'reader';
function pageLogin() {
  const meta = ROLE_META[window._loginRole] || ROLE_META.reader;
  return `
    <div class="login-page">
      <div class="logo">听书</div>
      <h1>选择一个身份开始</h1>
      <p class="sub">不同身份看到不同的世界</p>

      <div class="role-tabs">
        ${['reader','author','editor'].map(r => {
          const m = ROLE_META[r];
          const active = window._loginRole === r;
          return `
            <button class="role-tab ${active ? 'active' : ''}" onclick="pickRole('${r}')">
              <span class="ic">${m.icon}</span>
              <span class="nm">${m.name}</span>
              <span class="dc">${m.desc}</span>
            </button>`;
        }).join('')}
      </div>

      <div class="login-form" style="margin-top:18px;">
        <input type="text"     id="login-user" placeholder="账号" value="${window._loginRole}" autocomplete="username">
        <input type="password" id="login-pass" placeholder="密码" value="123456" autocomplete="current-password">
      </div>
      <div class="login-hint">提示：${meta.hint}</div>
      <button class="login-btn" onclick="doLogin()">以${meta.name}身份进入</button>
    </div>
  `;
}
window.pickRole = function (role) {
  window._loginRole = role;
  // 选角色后自动填充示例账号（便于测试）
  const inp = $('#login-user');
  const pwd = $('#login-pass');
  if (inp) inp.value = role;
  if (pwd) pwd.value = '123456';
  goLogin();
};
window.goLogin = function () {
  render(pageLogin(), { hideTab: true });
};
window.doLogin = function () {
  const u = $('#login-user').value.trim();
  const p = $('#login-pass').value;
  const acc = ACCOUNTS.find(a => a.username === u && a.password === p);
  if (!acc) { toast('账号或密码错误'); return; }
  // 警告：如果选的角色跟账号不一致
  if (acc.role !== window._loginRole) {
    const m = ROLE_META[window._loginRole];
    toast(`该账号是 ${ROLE_META[acc.role].name}身份，与你选择的不同。仍可登录。`, 2000);
  }
  CURRENT_USER.role = acc.role;
  CURRENT_USER.name = acc.name;
  if (acc.authorId) CURRENT_USER.authorId = acc.authorId;
  saveUser();
  toast(`欢迎回来，${acc.name}`);
  if (acc.role === 'author') {
    location.href = 'author.html';
  } else if (acc.role === 'editor') {
    location.href = 'editor.html';
  } else {
    setTab('home');
  }
};
window.logout = function () {
  CURRENT_USER.role = 'reader';
  CURRENT_USER.name = '游客';
  CURRENT_USER.authorId = null;
  CURRENT_USER.shelf = [];
  CURRENT_USER.visit = [];
  saveUser();
  goLogin();
};

/* === 首页（书架 + 推荐）=== */
function pageHome() {
  const banners = loadBanners().filter(b => b.active);
  const shelf = CURRENT_USER.shelf.map(findBook).filter(Boolean);
  const visit = (CURRENT_USER.visit || []).map(findBook).filter(Boolean).slice(0, 6);
  const recommend = getAllBooks().slice().sort((a,b) => b.hot - a.hot).slice(0, 6);
  return `
    <div class="home-page">
      <div class="home-header">
        <div class="home-top">
          <span class="brand">📖 听书</span>
          <span class="search-btn" onclick="openSearch()">🔍</span>
        </div>
        ${banners.length ? `
          <div class="banner">
            <span>📢</span>
            <span>${banners[0].text}</span>
          </div>
        ` : ''}
        <div class="home-greet">
          <h1>你好，${CURRENT_USER.name}</h1>
          <p class="sub">今天读点什么呢？</p>
        </div>
      </div>

      ${shelf.length ? `
        <div class="section">
          <div class="section-head">
            <h2>我的书架 (${shelf.length})</h2>
            <span class="more" onclick="openShelf()">管理</span>
          </div>
          <div class="shelf-grid">
            ${shelf.slice(0,4).map(b => `
              <div class="shelf-book" onclick="openBook('${b.id}')">
                <img src="${b.cover}" alt="${b.title}">
                <div class="name">${b.title}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${visit.length ? `
        <div class="section">
          <div class="section-head">
            <h2>最近看过</h2>
            <span class="more" onclick="openVisitHistory()">全部</span>
          </div>
          <div class="album-grid" style="padding:0;">
            ${visit.map(b => bookCard(b)).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-head">
          <h2>热门推荐</h2>
          <span class="more" onclick="setTab('cat')">书库</span>
        </div>
        <div class="album-grid" style="padding:0;">
          ${recommend.map(b => bookCard(b)).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h2>评分榜</h2>
          <span class="more" onclick="openRank()">全部</span>
        </div>
        <div style="padding:0;">
          ${(recommend.slice().sort((a,b)=> (b.rating_bayes||0)-(a.rating_bayes||0)).slice(0,3)).map((b,i)=>`
            <div class="rank-list-item" onclick="openBook('${b.id}')">
              <div class="rk rk-${i+1}">${i+1}</div>
              <img class="cv" src="${b.cover||''}" alt="">
              <div class="info">
                <div class="t">${b.title}</div>
                <div class="m">${b.author}</div>
                <div class="s">${b.rating_n ? `<span class="rs-full">★</span> <span class="rs-num">${(b.rating_avg||0).toFixed(1)}  (${b.rating_n}人)</span>` : `<span class="rs-empty">★</span><span class="rs-num">未评分</span>`}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
function bookCard(b) {
  const g = findGenre(b.genreId);
  const starsHtml = b.rating_n
    ? `<span class="rs-full">★</span> <span class="rs-num">${(b.rating_avg || 0).toFixed(1)}</span>`
    : `<span class="rs-empty" style="font-size:10px">★ ★ ★ ★ ★</span> <span class="rs-num">未评分</span>`;
  return `
    <div class="album-card" onclick="openBook('${b.id}')">
      <img src="${b.cover}" alt="${b.title}">
      <div class="name">${b.title}</div>
      <div class="meta">
        <span class="status-badge s_${b.status}" style="font-size:10px;padding:1px 5px;">${b.status}</span>
        ${g ? g.name : ''} · ${b.words || ''}
        <span style="margin-left:4px;font-size:11px;">${starsHtml}</span>
      </div>
    </div>
  `;
}
window.bookCard = bookCard;

/* === 书库（分类 Tab）=== */
function pageCategory() {
  const all = getAllBooks();
  return `
    <div class="home-page" style="padding-top:14px;">
      <div class="section">
        <div class="section-head">
          <h2>分类</h2>
          <span class="more" onclick="openSearch()">🔍 搜索</span>
        </div>
        <div class="cat-grid" style="padding:0;">
          ${GENRES.map(g => `
            <div class="cat-card" onclick="openCatList('${g.id}')">
              <div class="emoji">${g.emoji}</div>
              <div class="name">${g.name}</div>
              <div class="cnt">${booksByGenre(g.id).length} 本</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="section">
        <div class="section-head"><h2>全部书籍 (${all.length})</h2></div>
        <div class="album-grid" style="padding:0;">
          ${all.map(b => bookCard(b)).join('')}
        </div>
      </div>
    </div>
  `;
}
window.setTab = function (tab) {
  window._prevTab = window._currentTab;
  window._currentTab = tab;
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  if (tab === 'home') render(pageHome());
  else if (tab === 'cat') render(pageCategory());
  else if (tab === 'me')  render(pageMe());
};

/* === 分类列表 === */
window.openCatList = function (gid) {
  const g = findGenre(gid);
  const list = booksByGenre(gid);
  render(`
    <div class="course-detail">
      <div class="nav-bar">
        <span class="back" onclick="goBack()">‹</span>
        <span class="title">${g.name}</span>
        <span class="right" onclick="openSearch()">🔍</span>
      </div>
      <div class="cd-cover" style="background: linear-gradient(135deg, ${g.color[0]}, ${g.color[1]});">
        <div style="position:relative;z-index:1;">${g.emoji}</div>
      </div>
      <div class="cd-info">
        <h1>${g.name}</h1>
        <div class="desc">${g.desc}</div>
        <div class="meta">${list.length} 本</div>
      </div>
      <div class="cd-section">
        <h3>书籍列表</h3>
        <div class="album-grid" style="padding:0;">
          ${list.map(b => bookCard(b)).join('')}
        </div>
      </div>
    </div>
  `, { hideTab: true });
};

/* === 小说详情 === */
window.openBook = function (bid) {
  const b = findBook(bid);
  if (!b) return;
  pushVisit(bid);
  const a = findAuthor(b.authorId);
  const g = findGenre(b.genreId);
  const chs = getAllChapters()[bid] || [];
  const shelf = isInShelf(bid);
  const starsHtml = b.rating_n
    ? `<span class="rs-full">★</span> <span class="rs-num">${(b.rating_avg||0).toFixed(1)} (${b.rating_n} 人)</span>`
    : `<span class="rs-empty">★</span><span class="rs-num">还没有评分</span>`;
  render(`
    <div class="course-detail">
      <div class="nav-bar">
        <span class="back" onclick="goBack()">‹</span>
        <span class="title"></span>
        <span class="right" onclick="shareBook('${bid}')">⤴</span>
      </div>
      <div class="cd-cover" style="background: linear-gradient(135deg, ${g ? g.color[0] : '#1a1a3a'}, ${g ? g.color[1] : '#3a2050'});">
        <img src="${b.cover}" style="width:180px;height:240px;border-radius:14px;object-fit:cover;position:relative;z-index:1;">
      </div>
      <div class="cd-info">
        <h1>${b.title}</h1>
        <div class="desc">${b.intro}</div>
        <div class="meta">
          作者:${a ? a.name : '佚名'} ·
          ${g ? g.name : ''} ·
          <span class="status-badge s_${b.status}">${b.status}</span> ·
          ${b.words || ''} · ${(b.hot||0).toLocaleString()} 热度
        </div>
      </div>

      <div class="cd-section">
        <h3>读者评分</h3>
        <div id="book-rating-box" style="padding:0 16px;">
          <div style="margin-bottom:8px;">${starsHtml}</div>
          <div id="rate-host"></div>
        </div>
      </div>

      <div class="cd-section">
        <h3>目录 (${chs.length} 章)</h3>
        <div class="cd-outline">
          ${chs.map((c,i) => `
            <div class="item" onclick="openChapter('${bid}','${c.id}')">
              <span class="t">${escapeHtml(c.title).split(' · ')[0]}</span>
              <span class="n">${escapeHtml(c.title).split(' · ')[1] || ''}</span>
              <span class="ic">▶</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="height:90px;"></div>
      <div class="cd-bottom-bar">
        <button class="cd-icon-btn" onclick="toggleShelfBook('${bid}')">
          <span style="color:${shelf ? 'var(--green)' : ''}">${shelf ? '✓' : '+'}</span>
          <span>${shelf ? '在书架' : '加入书架'}</span>
        </button>
        <button class="cd-read-btn" onclick="openChapter('${bid}','${chs[0] ? chs[0].id : ''}')">开始阅读</button>
      </div>
    </div>
  `, { hideTab: true });

  // 异步插入打分 widget
  (async () => {
    try {
      const mod = await import('./rating-ui.js');
      const host = document.getElementById('rate-host');
      if (!host) return;
      const widget = await mod.renderRateWidget(bid, async () => {
        // 重新拉该书的评分
        try {
          const r = await window.__novelFetch(`/api/books/${bid}`);
          const nb = r.book;
          b.rating_n = nb.rating_n; b.rating_avg = nb.rating_avg; b.rating_bayes = nb.rating_bayes;
          const top = document.querySelector('#book-rating-box > div:first-child');
          if (top) top.innerHTML = nb.rating_n
            ? `<span class="rs-full">★</span> <span class="rs-num">${(nb.rating_avg||0).toFixed(1)} (${nb.rating_n} 人)</span>`
            : `<span class="rs-empty">★</span><span class="rs-num">还没有评分</span>`;
        } catch {}
      });
      host.appendChild(widget);
    } catch (e) { console.warn('rating widget failed', e); }
  })();
};


window.toggleShelfBook = function (bid) {
  const p = toggleShelf(bid);
  if (p && typeof p.then === 'function') {
    p.then((on) => { toast(on ? '已加入书架' : '已移出书架'); openBook(bid); });
  } else {
    toast(p ? '已加入书架' : '已移出书架');
    openBook(bid);
  }
};
window.shareBook = function (bid) {
  toast('已复制分享链接');
};

/* === 阅读页 === */
window.openChapter = function (bid, cid) {
  const b = findBook(bid);
  const chs = getAllChapters()[bid] || [];
  const idx = chs.findIndex(c => c.id === cid);
  const c = chs[idx];
  if (!c) { toast('章节不存在'); return; }
  // 记录历史
  CURRENT_USER.history = CURRENT_USER.history.filter(h => h.bookId !== bid);
  CURRENT_USER.history.unshift({ bookId: bid, chapterId: cid, at: Date.now() });
  if (CURRENT_USER.history.length > 30) CURRENT_USER.history.length = 30;
  saveUser();
  // 自动加入书架
  if (!isInShelf(bid)) CURRENT_USER.shelf.push(bid), saveUser();

  render(`
    <div class="reader-page">
      <div class="reader-nav">
        <span onclick="openBook('${bid}')">‹</span>
        <span class="t">${b.title}</span>
        <span onclick="openReaderMenu('${bid}','${cid}')">A</span>
      </div>
      <div class="reader-meta">
        <span>${c.title}</span>
      </div>
      <div class="reader-content">${c.text.split('\n').map(p => `<p>${p}</p>`).join('')}</div>
      <div class="reader-foot">
        ${idx > 0 ? `<button class="prev" onclick="openChapter('${bid}','${chs[idx-1].id}')">上一章</button>` : '<span></span>'}
        <span class="progress">${idx+1} / ${chs.length}</span>
        ${idx < chs.length-1 ? `<button class="next" onclick="openChapter('${bid}','${chs[idx+1].id}')">下一章</button>` : '<span>已完结</span>'}
      </div>
    </div>
  `, { hideTab: true });
};
window.openReaderMenu = function (bid, cid) {
  // 简易面板：字号 + 夜间 + 目录
  render(`
    <div class="reader-menu">
      <div class="nav-bar">
        <span class="back" onclick="openChapter('${bid}','${cid}')">‹</span>
        <span class="title">阅读设置</span>
        <span class="right"></span>
      </div>
      <div class="rm-section">
        <h3>字号</h3>
        <div class="rm-row">
          <button onclick="setFontSize(${PREFS.fontSize-1});openReaderMenu('${bid}','${cid}')">A-</button>
          <span class="fs-val">${PREFS.fontSize}px</span>
          <button onclick="setFontSize(${PREFS.fontSize+1});openReaderMenu('${bid}','${cid}')">A+</button>
        </div>
      </div>
      <div class="rm-section">
        <h3>主题</h3>
        <div class="rm-row">
          <button onclick="toggleNight();openReaderMenu('${bid}','${cid}')">
            ${PREFS.nightMode ? '☀ 日间模式' : '🌙 夜间模式'}
          </button>
        </div>
      </div>
      <div class="rm-section">
        <h3>目录</h3>
        ${(getAllChapters()[bid] || []).map(c => `
          <div class="item" onclick="openChapter('${bid}','${c.id}')">
            <span class="t">${c.title.split(' · ')[0]}</span>
            <span class="n">${c.title.split(' · ')[1] || ''}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `, { hideTab: true });
};

/* === 搜索 === */
window.openSearch = function () {
  render(`
    <div class="search-page">
      <div class="nav-bar" style="padding:0 0 14px;">
        <span class="back" onclick="goBack()">‹</span>
        <span class="title">搜索</span>
        <span class="right"></span>
      </div>
      <div class="search-bar">
        <input type="text" placeholder="搜索书名、作者..." id="search-input" onkeydown="if(event.key==='Enter')doSearch()">
        <span class="cancel" onclick="doSearch()">搜索</span>
      </div>
      <div class="search-section">
        <div class="head"><span>热门搜索</span></div>
        <div class="tag-list">
          <span class="tag" onclick="doSearch('玄幻')">玄幻</span>
          <span class="tag" onclick="doSearch('都市')">都市</span>
          <span class="tag" onclick="doSearch('悬疑')">悬疑</span>
          <span class="tag" onclick="doSearch('言情')">言情</span>
          <span class="tag" onclick="doSearch('科幻')">科幻</span>
          <span class="tag" onclick="doSearch('散文')">散文</span>
        </div>
      </div>
    </div>
  `, { hideTab: true });
};
window._searchKw = '';
window.doSearch = function (kw) {
  if (kw) window._searchKw = kw;
  else window._searchKw = $('#search-input').value.trim();
  if (!window._searchKw) { toast('请输入搜索词'); return; }
  const kwLower = window._searchKw.toLowerCase();
  const all = getAllBooks();
  const results = all.filter(b =>
    b.title.toLowerCase().includes(kwLower) ||
    (findAuthor(b.authorId)?.name || '').toLowerCase().includes(kwLower)
  );
  render(`
    <div class="search-page">
      <div class="nav-bar" style="padding:0 0 14px;">
        <span class="back" onclick="openSearch()">‹</span>
        <span class="title">"${window._searchKw}"</span>
        <span class="right" onclick="openSearch()">取消</span>
      </div>
      <div class="result-list">
        ${results.length === 0
          ? '<div style="text-align:center;padding:60px 0;color:var(--text-3);">未找到相关书籍</div>'
          : results.map(b => {
              const a = findAuthor(b.authorId);
              return `
                <div class="item" onclick="openBook('${b.id}')">
                  <img src="${b.cover}" alt="${b.title}">
                  <div class="info">
                    <div class="name">${b.title}</div>
                    <div class="meta">${a ? a.name : ''} · ${findGenre(b.genreId)?.name || ''} · ${b.words}</div>
                  </div>
                </div>
              `;
            }).join('')
        }
      </div>
    </div>
  `, { hideTab: true });
};

/* === 我的 === */
function pageMe() {
  const role = CURRENT_USER.role;
  const isStaff = role === 'author' || role === 'editor';
  return `
    <div class="me-page">
      <div class="me-header">
        <img src="${CURRENT_USER.avatar}" alt="">
        <div>
          <div class="name">${CURRENT_USER.name}</div>
          <div class="level">${roleLabel(role)}</div>
        </div>
        <span class="me-icon" onclick="openSettings()" style="margin-left:auto;font-size:22px;color:var(--text-3);">⚙</span>
      </div>

      <div class="me-cards">
        <div class="item"><div class="num">${CURRENT_USER.shelf.length}</div><div class="label">书架</div></div>
        <div class="item"><div class="num">${(CURRENT_USER.visit || []).length}</div><div class="label">最近看过</div></div>
        <div class="item"><div class="num">${CURRENT_USER.history.length}</div><div class="label">足迹</div></div>
        <div class="item"><div class="num">${getAllBooks().length}</div><div class="label">书库</div></div>
      </div>

      ${isStaff ? `
        <div class="staff-entry" onclick="${role === 'author' ? 'goAuthor()' : 'goEditor()'}">
          <div class="ic">${role === 'author' ? '✍' : '🛠'}</div>
          <div class="info">
            <div class="title">${role === 'author' ? '作者工作台' : '编辑后台'}</div>
            <div class="desc">${role === 'author' ? '查看作品 · 管理章节' : '审核 · 上架 · 内容维护'}</div>
          </div>
          <span class="go">›</span>
        </div>
      ` : ''}

      <div class="me-list">
        <div class="item" onclick="openShelf()"><div class="ic">📚</div><div class="label">我的书架</div><span class="arrow">›</span></div>
        <div class="item" onclick="openVisitHistory()"><div class="ic">🕘</div><div class="label">最近看过</div><span class="arrow">›</span></div>
        <div class="item" onclick="openHistory()"><div class="ic">📖</div><div class="label">阅读历史</div><span class="arrow">›</span></div>
        <div class="item" onclick="toggleNight()"><div class="ic">${PREFS.nightMode ? '☀' : '🌙'}</div><div class="label">${PREFS.nightMode ? '日间模式' : '夜间模式'}</div><span class="arrow">›</span></div>
        <div class="item" onclick="openAbout()"><div class="ic">ℹ</div><div class="label">关于听书</div><span class="arrow">›</span></div>
        <div class="item" onclick="logout()"><div class="ic" style="background:rgba(248,113,113,.15);color:#F87171;">⏻</div><div class="label" style="color:#F87171;">退出登录</div><span class="arrow">›</span></div>
      </div>
    </div>
  `;
}
function roleLabel(r) {
  return ({reader:'读者', author:'作者', editor:'编辑'})[r] || '游客';
}
window.roleLabel = roleLabel;

/* === 书架页 === */
window.openShelf = function () {
  const list = CURRENT_USER.shelf.map(findBook).filter(Boolean);
  render(`
    <div class="course-detail">
      <div class="nav-bar">
        <span class="back" onclick="goBack()">‹</span>
        <span class="title">我的书架 (${list.length})</span>
        <span class="right"></span>
      </div>
      ${list.length === 0 ? `
        <div style="text-align:center;padding:80px 20px;color:var(--text-3);">
          <div style="font-size:50px;opacity:.4;">📚</div>
          <div style="margin-top:14px;">书架空空如也</div>
          <div style="margin-top:6px;font-size:12px;">打开任意一本书会自动加入</div>
        </div>
      ` : `
        <div class="album-grid" style="padding:14px 16px;">
          ${list.map(b => bookCard(b)).join('')}
        </div>
      `}
    </div>
  `, { hideTab: true });
};

/* === 最近看过（按访问时间排序）=== */
window.openVisitHistory = function () {
  const list = (CURRENT_USER.visit || []).map(findBook).filter(Boolean);
  render(`
    <div class="course-detail">
      <div class="nav-bar">
        <span class="back" onclick="goBack()">‹</span>
        <span class="title">最近看过 (${list.length})</span>
        <span class="right" onclick="clearVisit()">清空</span>
      </div>
      ${list.length === 0 ? `
        <div style="text-align:center;padding:80px 20px;color:var(--text-3);">
          <div style="font-size:50px;opacity:.4;">🕘</div>
          <div style="margin-top:14px;">还没有浏览过任何书</div>
        </div>
      ` : `
        <div class="album-grid" style="padding:14px 16px;">
          ${list.map(b => bookCard(b)).join('')}
        </div>
      `}
    </div>
  `, { hideTab: true });
};
window.clearVisit = function () {
  CURRENT_USER.visit = [];
  saveUser();
  openVisitHistory();
  toast('已清空');
};

/* === 阅读历史 === */
window.openHistory = function () {
  const list = CURRENT_USER.history.map(h => {
    const b = findBook(h.bookId);
    return b ? { book: b, at: h.at } : null;
  }).filter(Boolean);
  render(`
    <div class="course-detail">
      <div class="nav-bar">
        <span class="back" onclick="goBack()">‹</span>
        <span class="title">阅读历史</span>
        <span class="right"></span>
      </div>
      ${list.length === 0 ? `
        <div style="text-align:center;padding:80px 20px;color:var(--text-3);">还没有阅读记录</div>
      ` : `
        <div class="sound-list" style="padding:0;">
          ${list.map(({book, at}) => `
            <div class="item" onclick="openBook('${book.id}')">
              <img src="${book.cover}" alt="${book.title}">
              <div class="info">
                <div class="name">${book.title}</div>
                <div class="meta">${findAuthor(book.authorId)?.name || ''} · ${new Date(at).toLocaleString('zh-CN')}</div>
              </div>
              <span class="play">▶</span>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `, { hideTab: true });
};

/* === 设置 === */
window.openSettings = function () {
  render(`
    <div class="set-page">
      <div class="nav-bar">
        <span class="back" onclick="goBack()">‹</span>
        <span class="title">设置</span>
        <span class="right"></span>
      </div>
      <div class="set-user">
        <img src="${CURRENT_USER.avatar}">
        <div style="flex:1;">
          <div class="name">${CURRENT_USER.name}</div>
          <div class="phone">${roleLabel(CURRENT_USER.role)}</div>
        </div>
      </div>
      <div class="set-list">
        <div class="item" onclick="toggleNight();openSettings()">
          <div class="ic">${PREFS.nightMode ? '☀' : '🌙'}</div>
          <div class="label">${PREFS.nightMode ? '日间模式' : '夜间模式'}</div>
          <span class="val">${PREFS.nightMode ? '开' : '关'}</span>
          <span class="arrow">›</span>
        </div>
        <div class="item" onclick="setFontSize(${PREFS.fontSize-1});openSettings()"><div class="ic">A</div><div class="label">字号减小</div><span class="val">${PREFS.fontSize}px</span><span class="arrow">›</span></div>
        <div class="item" onclick="setFontSize(${PREFS.fontSize+1});openSettings()"><div class="ic">A</div><div class="label">字号增大</div><span class="val">${PREFS.fontSize}px</span><span class="arrow">›</span></div>
        <div class="item" onclick="openAbout()"><div class="ic">ℹ</div><div class="label">关于</div><span class="arrow">›</span></div>
        <div class="item" onclick="logout()"><div class="ic" style="background:rgba(248,113,113,.15);color:#F87171;">⏻</div><div class="label" style="color:#F87171;">退出登录</div><span class="arrow">›</span></div>
      </div>
    </div>
  `, { hideTab: true });
};
window.openAbout = function () {
  toast('听书 · v1.0  ·  静态演示版');
};

/* === 渲染核心 === */
function render(html, opts = {}) {
  APP_BODY().innerHTML = html;
  APP_BODY().scrollTop = 0;
  if (opts.hideTab) {
    TAB_BAR().style.display = 'none';
    APP_BODY().style.paddingBottom = '0';
  } else {
    TAB_BAR().style.display = 'flex';
    TAB_BAR().style.bottom = '0';
    APP_BODY().style.paddingBottom = '70px';
  }
}
window.goBack = function () {
  if (window._prevTab) setTab(window._prevTab);
  else setTab('home');
};

window.openRank = async function () {
  render(`
    <div class="course-detail">
      <div class="nav-bar">
        <span class="back" onclick="goBack()">‹</span>
        <span class="title">评分榜</span>
        <span class="right"></span>
      </div>
      <div style="padding: 14px 16px;">
        <div class="tip" style="background:rgba(247,201,72,.1);color:#cba43d;border-radius:8px;padding:8px 12px;font-size:12px;">
          贝叶斯平均(避免冷启动偏差)。评分榜独立于“热门推荐·hot”。
        </div>
        <div id="rank-list">正在加载…</div>
      </div>
    </div>
  `, { hideTab: true });
  try {
    const data = await window.__novelFetch('/api/ratings?limit=20');
    const list = (data.books || []);
    const el = document.getElementById('rank-list');
    if (list.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3);">还没有评分</div>';
      return;
    }
    el.innerHTML = list.map((b, i) => {
      const rk = i + 1;
      const stars = `
        <span class="rs-full">★</span>
        <span class="rs-num">${(b.rating_avg || 0).toFixed(1)}  <span style="opacity:.5">(${b.rating_n} 人)</span></span>
      `;
      return `
        <div class="rank-list-item" onclick="openBook('${b.id}');">
          <div class="rk rk-${rk}">${rk}</div>
          <img class="cv" src="${b.cover_url || ''}" alt="">
          <div class="info">
            <div class="t">${escapeHtml(b.title)}</div>
            <div class="m">${escapeHtml(b.author)} · ${escapeHtml(b.genre || '')}</div>
            <div class="s">${stars}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    document.getElementById('rank-list').innerHTML = `<div style="text-align:center;color:#ff7676;">加载失败:${escapeHtml(e.message)}</div>`;
  }
};

function escapeHtml(s) { return String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }


window.goAuthor = function () {
  location.href = 'author.html';
};
window.goEditor = function () {
  location.href = 'editor.html';
};

/* === 启动 === */
async function __startup() {
  $$('.tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
  // 预览模式:从编辑器跳过来打开指定书
  const previewId = sessionStorage.getItem('preview_book');
  if (previewId) {
    sessionStorage.removeItem('preview_book');
    setTab('home');
    setTimeout(() => openBook(previewId), 50);
    return;
  }
  // 等 bootstrap.js 准备好 CURRENT_USER
  if (!window.__BOOTED__) {
    await new Promise(r => document.addEventListener('novel:booted', r, { once: true }));
  }
  if (!CURRENT_USER || CURRENT_USER.role === 'guest' || !CURRENT_USER.role) {
    // 没登录 -> bootstrap.js 已经跳走了;这里再兜一次
    location.replace('./auth.html');
  } else {
    setTab('home');
  }
}
document.addEventListener('DOMContentLoaded', __startup);