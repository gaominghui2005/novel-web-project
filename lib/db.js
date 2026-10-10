// 数据库工厂(Cloudflare Pages 兼容)
// 走 Supabase REST API (PostgREST) + service_role key
//
// 用法:和原先几乎一致
//   db.from('users').select('*').eq('phone', phone).single()
//   db.from('users').insert({...}).select().single()
//   db.from('users').update({...}).eq('phone', p).select().single()
//   db.from('shelf').delete().eq('user_phone', p).eq('book_id', b)
//
// Supabase 不给 true/false 自动转 0/1,Postgres 自己会处理。
// url/key 都来自环境变量。

export function getDB() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_SECRET_KEY
           || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE/SECRET key');
  return new PgAdapter(url, key);
}

// 一个轻量的 fetch 适配
class PgAdapter {
  constructor(url, key) {
    this.base = url.replace(/\/+$/, '') + '/rest/v1';
    this.key = key;
  }
  from(table) { return new PgQuery(this, table); }

  async _fetch(path, init = {}) {
    init.headers = init.headers || {};
    init.headers['apikey'] = this.key;
    init.headers['Authorization'] = 'Bearer ' + this.key;
    if (init.body && typeof init.body !== 'string') {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(init.body);
    }
    const res = await fetch(this.base + path, init);
    if (res.status === 204) return { data: null, error: null, status: 204 };
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && data.message) ? data.message : (data && data.error) ? data.error : 'HTTP ' + res.status;
      const code = (data && data.code) ? data.code : 'http_' + res.status;
      return { data: null, error: { message: msg, code }, status: res.status };
    }
    return { data, error: null, status: res.status };
  }
}

// 单个查询构造 + 内置 await 支持(await db.from(t).select())
class PgQuery {
  constructor(adapter, table) {
    this.a = adapter;
    this.t = table;
    this._op = null;
    this._cols = '*';
    this._f = [];        // eq filters
    this._order = null;
    this._limit = null;
    this._single = false;
    this._row = null;    // for insert/update
  }
  select(cols = '*') { this._op = 'select'; this._cols = cols; return this; }
  insert(row) { this._op = 'insert'; this._row = row; return this; }
  update(patch) { this._op = 'update'; this._row = patch; return this; }
  delete() { this._op = 'delete'; return this; }
  eq(c, v) { this._f.push({ c, v }); return this; }
  order(c, opt = {}) { this._order = { c, asc: opt.ascending !== false }; return this; }
  limit(n) { this._limit = n; return this; }
  maybeSingle() { this._single = true; return this; }
  single() { this._single = true; return this; }

  _q() {
    const parts = ['select=' + encodeURIComponent(this._cols)];
    for (const f of this._f) {
      parts.push(encodeURIComponent(f.c) + '=eq.' + encodeURIComponent(f.v));
    }
    if (this._order) {
      parts.push('order=' + encodeURIComponent(this._order.c + '.' + (this._order.asc ? 'asc' : 'desc')));
    }
    if (this._limit != null) {
      parts.push('limit=' + this._limit);
    }
    if (this._single) parts.push('limit=1'); // 强制
    return '?' + parts.join('&');
  }

  async _run() {
    const path = '/' + this.t;
    let init = {};
    let url = path;
    if (this._op === 'select') {
      url += this._q();
      init.method = 'GET';
      const r = await this.a._fetch(url, init);
      if (r.error) return r;
      if (this._single) return { data: Array.isArray(r.data) ? (r.data[0] || null) : r.data, error: null };
      return { data: r.data, error: null };
    }
    if (this._op === 'insert') {
      init.method = 'POST';
      init.headers = { Prefer: 'return=representation' };
      init.body = this._row;
      const r = await this.a._fetch(url, init);
      if (r.error) {
        // 23505 unique violation -> 等于"已存在"
        if (r.error.code === '23505') return { data: this._single ? null : [], error: null };
        return r;
      }
      if (this._single) return { data: Array.isArray(r.data) ? (r.data[0] || null) : r.data, error: null };
      return { data: r.data, error: null };
    }
    if (this._updatePath = true) {} // not used
    if (this._op === 'update') {
      init.method = 'PATCH';
      init.headers = { Prefer: 'return=representation' };
      init.body = this._row;
      url += this._q();
      const r = await this.a._fetch(url, init);
      if (r.error) return r;
      if (this._single) return { data: Array.isArray(r.data) ? (r.data[0] || null) : r.data, error: null };
      return { data: r.data, error: null };
    }
    if (this._op === 'delete') {
      init.method = 'DELETE';
      url += this._q();
      const r = await this.a._fetch(url, init);
      if (r.error) return r;
      return { data: [], error: null };
    }
    return { data: null, error: { message: 'unknown op ' + this._op } };
  }

  // 让 await 可用
  then(resolve, reject) {
    this._run().then(resolve, reject);
  }
}
