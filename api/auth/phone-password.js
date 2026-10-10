import { getDB } from '../../lib/db.js';
import { hashPassword, verifyPassword, isValidPhone, isValidPassword } from '../../lib/password.js';
import { signToken, setTokenCookie } from '../../lib/auth.js';
import { ok, bad, allowMethods, readJson } from '../../lib/http.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  const body = await readJson(req);
  const { phone, password } = body;

  if (!isValidPhone(phone)) return bad(res, '手机号格式不对');
  if (!isValidPassword(password)) return bad(res, '密码需 6~32 位');

  const db = await getDB();

  // 查现有
  const { data: existing } = await db
    .from('users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  // 存在 -> 登录
  if (existing) {
    const okPw = await verifyPassword(password, existing.password_hash);
    if (!okPw) return bad(res, '密码不对', 401);
    const token = signToken(existing.phone);
    setTokenCookie(res, token);
    return ok(res, { user: publicUser(existing), created: false });
  }

  // 不存在 -> 自动注册
  const hash = await hashPassword(password);
  const isEditor = phone === (process.env.ADMIN_PHONE || '');
  const { data: created, error } = await db
    .from('users')
    .insert({ phone, password_hash: hash, is_editor: !!isEditor })
    .select()
    .single();
  if (error) return bad(res, error.message, 500);

  const token = signToken(created.phone);
  setTokenCookie(res, token);
  return ok(res, { user: publicUser(created), created: true });
}

function publicUser(u) {
  return {
    phone: u.phone,
    name: u.name,
    isAuthor: !!(u.is_author || u.isAuthor),
    isEditor: !!(u.is_editor || u.isEditor),
  };
}
