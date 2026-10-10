// 本地开发服务(ESM 版本)
// Vercel 自动挂 api/*;这里把它们也挂到 express,
// 让 node server.js 同时跑接口,免装 vercel CLI。

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载 .env.local / .env
(function loadDotenv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/i);
      if (!m) continue;
      const k = m[1];
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
})();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (/\.(svg|png|jpg|jpeg|webp|wav|css|html)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
  },
}));

const apiDir = path.join(__dirname, 'api');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

function routeFromPath(file) {
  // api/auth/phone-password.js     -> /api/auth/phone-password
  // api/books/[id].js              -> /api/books/:id
  // api/books/index.js             -> /api/books  (index 路径别名)
  // api/books/[id]/chapters.js     -> /api/books/:id/chapters
  let rel = path.relative(apiDir, file).replace(/\\/g, '/');
  rel = rel.replace(/\.js$/, '');
  let route = '/api/' + rel;
  // index 不是动态参数,反而是默认路径
  route = route.replace(/\[([^\]]+)\]/g, ':$1');
  // .../index  -> ...
  if (route.endsWith('/index')) route = route.slice(0, -('/index'.length));
  return route;
}

function pathToFileUrl(p) {
  let abs = path.resolve(p).replace(/\\/g, '/');
  if (!abs.startsWith('/')) abs = '/' + abs;
  return 'file://' + abs;
}

(async () => {
  const files = walk(apiDir);
  for (const f of files) {
    const route = routeFromPath(f);
    try {
      const mod = await import(pathToFileUrl(f));
      const handler = mod.default || mod.handler || mod;
      if (typeof handler !== 'function') {
        console.warn(`[api] skip ${f}: 没找到 export default`);
        continue;
      }
      const wrap = async (req, res) => {
        try { await handler(req, res); }
        catch (e) {
          console.error(`[api] ${route} crashed`, e);
          if (!res.headersSent) res.status(500).json({ ok: false, error: String((e && e.message) || e) });
        }
      };
      app.all(route, wrap);
      // index 文件额外挂一个尾巴 / 别名,让 /api/books 也能调
      const aliases = [];
      if (route.endsWith('/index')) aliases.push(route.slice(0, -'/index'.length));
      for (const a of aliases) {
        app.all(a, wrap);
      }
      console.log(`[api] mount ${route}${aliases.length ? ' + ' + aliases.join(',') : ''}  <- ${path.relative(apiDir, f)}`);
    } catch (e) {
      console.warn(`[api] 加载失败 ${f}: ${e.message}`);
    }
  }

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString(), uptime: process.uptime() });
  });

  app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  听书 · 本地开发服务');
    console.log(`  访问:  http://localhost:${PORT}/`);
    console.log(`  健康:  http://localhost:${PORT}/api/health`);
    console.log('========================================');
    console.log('');
  });
})();
