import { clearTokenCookie } from 'file:///C:/Users/PC/Desktop/小说网页项目/lib/auth.js';
import { ok, allowMethods } from 'file:///C:/Users/PC/Desktop/小说网页项目/lib/http.js';

export default function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  clearTokenCookie(res);
  return ok(res);
}
