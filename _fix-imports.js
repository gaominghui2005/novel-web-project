// 修复所有 api/* 文件:把相对 lib 路径按深度统一改写
const fs = require('fs');
const path = require('path');

function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.js')) out.push(p);
  }
  return out;
}

const root = process.cwd();
const apiDir = path.join(root, 'api');

for (const f of walk(apiDir)) {
  const rel = path.relative(apiDir, f).split(path.sep).join('/');
  // rel 例如 'books/[id]/chapters.js', 'books/index.js', 'banners.js'
  const depth = rel.split('/').length - 1;
  const prefix = '../'.repeat(depth + 1);

  const orig = fs.readFileSync(f, 'utf8');
  let t = orig;

  // 把 'lib/db.js' / 'lib/auth.js' / 'lib/http.js' 前缀补足
  // 通用做法:把任何 'xxx/yyy.js' 换成 基于 prefix 的 'xxx/yyy.js'
  t = t.replace(/from '([^']*)'/g, (m, p) => {
    if (p.startsWith('.')) {
      // 计算绝对路径
      let abs = path.resolve(path.dirname(f), p);
      // 再换成基于 root 的相对
      let relToRoot = path.relative(root, abs).split(path.sep).join('/');
      return "from './" + relToRoot + "'";
    }
    return m;
  });

  if (t !== orig) {
    fs.writeFileSync(f, t);
    console.log('rewrote', rel);
  }
}
