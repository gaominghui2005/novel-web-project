// 用 data.js 里的 15 本书灌进本地 SQLite
// 用法:
//   1. npm i better-sqlite3
//   2. 不需要 .env.local;本脚本直接创建 novel.db
import Database from 'better-sqlite3';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(here, '..', 'novel.db');
const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

// 直接复制 lib/db.js 的建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '读者',
    password_hash TEXT NOT NULL,
    is_author INTEGER NOT NULL DEFAULT 0,
    is_editor INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT,
    genre TEXT, cover_url TEXT, hot INTEGER DEFAULT 0, intro TEXT,
    author_phone TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY, book_id TEXT NOT NULL,
    title TEXT NOT NULL, body TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS shelves (
    user_phone TEXT NOT NULL, book_id TEXT NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_phone, book_id)
  );
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_phone TEXT NOT NULL,
    book_id TEXT, chapter_id TEXT,
    at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY, text TEXT NOT NULL,
    active INTEGER DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ratings (
    user_phone TEXT NOT NULL, book_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_phone, book_id)
  );
`);

const dataJsPath = path.join(here, '..', 'data.js');
const src = await readFile(dataJsPath, 'utf8');
// 兼容 const books / window.BOOKS
let m = src.match(/const\s+books\s*=\s*(\[[\s\S]*?\]);/);
if (!m) m = src.match(/window\.BOOKS\s*=\s*(\[[\s\S]*?\];)/);
if (!m) { console.error('data.js 没找到 books 数组'); process.exit(1); }
let booksExpr = m[1].replace(/;$/, '');
const books = eval(booksExpr);

const insertBook = db.prepare(`
  INSERT OR IGNORE INTO books (id, title, author, genre, cover_url, hot, intro)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertBanner = db.prepare(`
  INSERT OR IGNORE INTO banners (id, text, active) VALUES (?, ?, 1)
`);

let bk = 0, ch = 0;
// authorId -> AUTHORS lookup (data.js 内)
let authorsById = {};
const aMatch = src.match(/window\.AUTHORS\s*=\s*(\[[\s\S]*?\];)/);
if (aMatch) {
  let expr = aMatch[1].replace(/;$/, '');
  const arr = eval(expr);
  for (const a of arr) authorsById[a.id] = a.name;
}

for (const b of books) {
  const authorName = authorsById[b.authorId] || '佚名';
  const r = insertBook.run(
    b.id,
    b.title,
    authorName,
    null,
    b.cover || null,
    Number(b.hot) || 0,
    b.intro || '',
  );
  if (r.changes) bk++;

  // 3 章样章
  const titles = ['第一章', '第二章', '第三章'];
  const subs = ['初逢', '波澜', '归途'];
  for (let i = 0; i < 3; i++) {
    const chId = `${b.id}_c${i + 1}`;
    const body = `【${b.title} · ${titles[i]}】

${b.intro || b.desc || ''}

这是一段示例正文。本作品采用纯文本展示,不涉及实际的小说内容,仅作为占位文本用于演示阅读界面的排版与功能。

段落之间留有适当间距,便于阅读。可以根据设备字号与屏幕宽度自适应换行。读者可以点击右下角的按钮调整字号,或加入书架方便下次继续阅读。

—— 样章结束。`;
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO chapters (id, book_id, title, body, order_index, status)
      VALUES (?, ?, ?, ?, ?, 'approved')
    `);
    const r2 = stmt.run(chId, b.id, `${titles[i]} · ${subs[i]}`, body, i + 1);
    if (r2.changes) ch++;
  }
}

// 默认公告
insertBanner.run('bn1', '欢迎来到听书 · 海量小说免费读');
insertBanner.run('bn2', '本地模式:novel.db 是本项目的数据库');

console.log(`完成。新增书 ${bk} 本,章节 ${ch} 章。`);
console.log(`数据库: ${dbFile}`);
