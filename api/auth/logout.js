import { clearTokenCookie } from '../../lib/auth.js';
import { ok, allowMethods } from '../../lib/http.js';

export default function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  clearTokenCookie(res);
  return ok(res);
}
