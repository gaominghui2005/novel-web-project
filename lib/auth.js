// JWT 工具 + cookie 读 / 写
import jwt from 'jsonwebtoken';

const COOKIE = 'novel_token';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 天

export function signToken(phone) {
  return jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// 从 request 拿到当前手机号
export function getPhone(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!m) return null;
  const t = decodeURIComponent(m[1]);
  const payload = verifyToken(t);
  return payload?.phone || null;
}

export function setTokenCookie(res, token) {
  const cookie =
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax` +
    (process.env.NODE_ENV === 'production' ? '; Secure' : '');
  res.setHeader('Set-Cookie', cookie);
}

export function clearTokenCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

export function requireAuth(req, res) {
  const phone = getPhone(req);
  if (!phone) {
    res.status(401).json({ error: '未登录' });
    return null;
  }
  return phone;
}
