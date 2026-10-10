// 数据库工厂:
// - 如果有 SUPABASE_URL + SERVICE_ROLE_KEY/SECRET_KEY -> Supabase
// - 否则 -> 本地 SQLite(better-sqlite3)
//
// 暴露的接口:db.from('table') 返回 query builder
//   .select('cols?').eq(col,val).order(col).limit(n).maybeSingle() / .single()
//   .insert(row).select().single()
//   .update(patch).eq(col,val).select().single()
//   .delete().eq(col,val)

import { createClient } from '@supabase/supabase-js';

export async function getDB() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (url && key) return new SupabaseAdapter(url, key);

  const Database = (await import('better-sqlite3')).default;
  const path = (await import('node:path')).default;
  const dbFile = path.join(process.cwd(), 'novel.db');
  const db = new Database(dbFile);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      phone TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '读者',
      password_hash TEXT NOT NULL,
      is_author INTEGER NOT NULL DEFAULT 0,
      is_editor INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY, title TEXT NOT NULL,
      genre TEXT, cover_url TEXT, hot INTEGER DEFAULT 0, intro TEXT,
      author_phone TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY, book_id TEXT NOT NULL,
      title TEXT NOT NULL, body TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shelves (
      user_phone TEXT NOT NULL, book_id TEXT NOT NULL,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_phone, book_id)
    );
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_phone TEXT NOT NULL,
      book_id TEXT, chapter_id TEXT,
      at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY, text TEXT NOT NULL,
      active INTEGER DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ratings (
      user_phone TEXT NOT NULL, book_id TEXT NOT NULL,
      score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_phone, book_id)
    );
  `);
  return new SqliteAdapter(db);
}

// ============= Supabase Adapter =============
class SupabaseAdapter {
  constructor(url, key) {
    this.client = createClient(url, key, { auth: { persistSession: false } });
  }
  from(t) { return new SbQuery(this.client.from(t)); }
}
class SbQuery {
  constructor(q) { this.q = q; }
  select(c='*') { this._op='select'; this._cols=c; return this; }
  insert(r) { this._op='insert'; this._row=r; return this; }
  update(p) { this._op='update'; this._patch=p; return this; }
  delete() { this._op='delete'; return this; }
  eq(c,v) { (this._f=this._f||[]).push({c,v}); return this; }
  order(c,o={}) { this._order={c,o}; return this; }
  limit(n) { this._limit=n; return this; }
  maybeSingle() { this._single=true; this._multi=false; return this; }
  single() { this._single=true; this._multi=false; return this; }
  async _run() {
    let q=this.q;
    if (this._op==='select') q=q.select(this._cols);
    else if (this._op==='insert') q=q.insert(this._row);
    else if (this._op==='update') q=q.update(this._patch);
    else if (this._op==='delete') q=q.delete();
    if (this._f) for (const f of this._f) q=q.eq(f.c, f.v);
    if (this._order) q=q.order(this._order.c, this._order.o);
    if (this._limit != null) q=q.limit(this._limit);
    if (this._op === 'insert' || this._op === 'update') q = q.select();
    const { data, error } = await q;
    if (this._single) return { data: Array.isArray(data) ? data[0] || null : data, error };
    return { data: data || [], error };
  }
  async then(r, j) {
    try { r(await this._run()); } catch (e) { if (j) j(e); else r({ data: null, error: e }); }
  }
}

// ============= SQLite Adapter =============
class SqliteAdapter {
  constructor(db) { this.db = db; }
  from(t) { return new SqQuery(this.db, t); }
}
class SqQuery {
  constructor(db, t) {
    this.db=db; this.t=t;
    this._op=null; this._f=[]; this._order=null; this._limit=null;
    this._cols='*';
  }
  select(c='*') { this._op='select'; this._cols=c; return this; }
  insert(r) { this._op='insert'; this._row=r; return this; }
  update(p) { this._op='update'; this._patch=p; return this; }
  delete() { this._op='delete'; return this; }
  eq(c,v) { this._f.push({c,v}); return this; }
  order(c,o={}) { this._order={c,asc:o.ascending!==false}; return this; }
  limit(n) { this._limit=n; return this; }
  maybeSingle() { this._single=true; return this; }
  single() { this._single=true; return this; }

  _bind(v) {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === undefined) return null;
    return v;
  }

  async _run() {
    const db=this.db, t=this.t;
    if (this._op==='select') {
      let sql = `SELECT ${this._cols} FROM ${t}`;
      const p=[];
      if (this._f.length) {
        sql += ' WHERE ' + this._f.map(f=>{ p.push(this._bind(f.v)); return f.c+' = ?'; }).join(' AND ');
      }
      if (this._order) sql += ' ORDER BY '+this._order.c+(this._order.asc?' ASC':' DESC');
      if (this._limit!=null) sql += ' LIMIT '+this._limit;
      let rows = db.prepare(sql).all(...p);
      if (this._single) rows = rows[0] || null;
      return { data: rows, error: null };
    }
    if (this._op==='insert') {
      const rows = Array.isArray(this._row) ? this._row : [this._row];
      const inserted=[];
      for (const r of rows) {
        const cols = Object.keys(r);
        const phs = cols.map(()=>'?').join(',');
        const vals = cols.map(c=>this._bind(r[c]));
        const sql = `INSERT INTO ${t} (${cols.join(',')}) VALUES (${phs})`;
        try { db.prepare(sql).run(...vals); inserted.push(r); }
        catch (e) {
          if (String(e.message).includes('UNIQUE') && rows.length===1) {
            // 已存在 -> 返回 null
            return { data: this._single ? null : [], error: null };
          }
          return { data: null, error: { message: e.message } };
        }
      }
      if (this._single) {
        // 返回最新一条
        const last = inserted[inserted.length - 1];
        const cols = Object.keys(last);
        const wh = cols.map(c=>c+'=?').join(' AND ');
        const vals = cols.map(c=>this._bind(last[c]));
        const row = db.prepare(`SELECT * FROM ${t} WHERE ${wh} LIMIT 1`).get(...vals);
        return { data: row, error: null };
      }
      return { data: inserted, error: null };
    }
    if (this._op==='update') {
      const cols = Object.keys(this._patch);
      const p = cols.map(c=>this._bind(this._patch[c]));
      let sql = `UPDATE ${t} SET ` + cols.map(c=>c+' = ?').join(', ');
      if (this._f.length) {
        sql += ' WHERE ' + this._f.map(f=>{ p.push(this._bind(f.v)); return f.c+' = ?'; }).join(' AND ');
      }
      try { db.prepare(sql).run(...p); }
      catch (e) { return { data: null, error: { message: e.message } }; }
      // 返回更新后第一行(如果要求 single)
      if (this._single) {
        // 用刚才同样的 patch where 重查
        const cols2=Object.keys(this._patch);
        const p2=cols2.map(c=>this._bind(this._patch[c]));
        const wh = cols2.map(c=>c+'=?').join(' AND ');
        const row = db.prepare(`SELECT * FROM ${t} WHERE ${wh} LIMIT 1`).get(...p2);
        return { data: row, error: null };
      }
      return { data: [], error: null };
    }
    if (this._op==='delete') {
      const p=[];
      let sql = `DELETE FROM ${t}`;
      if (this._f.length) {
        sql += ' WHERE ' + this._f.map(f=>{ p.push(this._bind(f.v)); return f.c+' = ?'; }).join(' AND ');
      }
      try { db.prepare(sql).run(...p); } catch (e) { return { data: null, error: { message: e.message } }; }
      return { data: [], error: null };
    }
    return { data: null, error: null };
  }

  async then(r, j) {
    try { r(await this._run()); } catch (e) { if (j) j(e); else r({ data: null, error: e }); }
  }
}
