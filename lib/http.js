// 简单统一响应辅助
export function ok(res, data = {}) {
  res.status(200).json({ ok: true, ...data });
}
export function bad(res, msg, code = 400) {
  res.status(code).json({ ok: false, error: msg });
}

// 方法白名单
export function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    return false;
  }
  return true;
}

// 读取 JSON body
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
