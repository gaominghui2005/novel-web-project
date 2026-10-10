// 把前端 data.js 里写死的 15 本书灌进 Supabase
// 用法:
//   node scripts/seed.mjs
// 需要已经在 .env.local 或环境变量里设置:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// 解析 data.js,抽 books 数组
const here = path.dirname(fileURLToPath(import.meta.url));
const dataJsPath = path.join(here, '..', 'data.js');
const src = await readFile(dataJsPath, 'utf8');

// 找 const books = [ ... ];
const m = src.match(/const\s+books\s*=\s*(\[[\s\S]*?\]);/);
if (!m) {
  console.error('在 data.js 里没找到 const books = [...]');
  process.exit(1);
}
const books = eval(m[1]);

let inserted = 0;
let skipped = 0;
for (const b of books) {
  const { data: exist } = await db
    .from('books')
    .select('id')
    .eq('title', b.title)
    .eq('author', b.author)
    .maybeSingle();
  if (exist) {
    skipped++;
    continue;
  }

  const { error: bookErr } = await db.from('books').insert({
    title: b.title,
    author: b.author,
    genre: b.tags?.[0] || '未分类',
    cover_url: b.cover || null,
    hot: Number(b.hot) || 0,
    intro: b.desc || '',
    author_phone: null,
  });
  if (bookErr) {
    console.error('书失败', b.title, bookErr.message);
    continue;
  }
  inserted++;
}

console.log(`完成。新增 ${inserted} 本,跳过(已存在)${skipped} 本`);
