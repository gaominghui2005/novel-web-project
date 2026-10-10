// 公告(任何人可读 active 的,编辑可写)
import { getDB } from '../lib/db.js';
import { getPhone } from '../lib/auth.js';
import { ok, bad, allowMethods, readJson } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return list(res);
  if (req.method === 'POST') return create(req, res);
  if (req.method === 'PUT') return update(req, res);
  allowMethods(req, res, ['GET', 'POST', 'PUT']);
}

async function list(res) {
  const db = await getDB();
  const { data, error } = await db
    .from('banners')
    .select('id, text, active, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) return bad(res, error.message, 500);
  return ok(res, { banners: data });
}

async function ensureEditor(req, res) {
  const phone = getPhone(req);
  if (!phone) {
    res.status(401).json({ ok: false, error: '未登录' });
    return false;
  }
  const db = await getDB();
  const { data } = await db.from('users').select('is_editor').eq('phone', phone).single();
  if (!data?.is_editor) {
    res.status(403).json({ ok: false, error: '需要编辑权限' });
    return false;
  }
  return true;
}

async function create(req, res) {
  if (!(await ensureEditor(req, res))) return;
  const body = await readJson(req);
  const { text, active } = body;
  if (!text) return bad(res, '需要 text');

  const db = await getDB();
  const { data, error } = await db
    .from('banners')
    .insert({ text, active: active !== false })
    .select()
    .single();
  if (error) return bad(res, error.message, 500);
  return ok(res, { banner: data });
}

async function update(req, res) {
  if (!(await ensureEditor(req, res))) return;
  const body = await readJson(req);
  const { id, text, active } = body;
  if (!id) return bad(res, '需要 id');

  const db = await getDB();
  const patch = {};
  if (text !== undefined) patch.text = text;
  if (active !== undefined) patch.active = active;
  const { data, error } = await db.from('banners').update(patch).eq('id', id).select().single();
  if (error) return bad(res, error.message, 500);
  return ok(res, { banner: data });
}
