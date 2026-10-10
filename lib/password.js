// 密码 hash(纯 Node,不放依赖也行)
import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashPassword(pw) {
  return bcrypt.hash(pw, ROUNDS);
}

export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

// 简单手机号校验(中国 11 位,不强求真实,但格式像样)
const PHONE_RE = /^1[3-9]\d{9}$/;
export function isValidPhone(s) {
  return typeof s === 'string' && PHONE_RE.test(s);
}

export function isValidPassword(pw) {
  return typeof pw === 'string' && pw.length >= 6 && pw.length <= 32;
}
