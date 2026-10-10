-- 计划 v2:账号密码登录版
-- 不需要短信、不需要 AI 生图
-- 在 Supabase 控制台 → SQL Editor 整段粘贴执行

create extension if not exists pgcrypto;

-- 用户表(账号密码合一)
create table if not exists users (
  phone text primary key,                 -- 手机号即唯一标识
  name text not null default '读者',      -- 默认昵称
  password_hash text not null,            -- bcrypt 哈希
  is_author boolean not null default false,  -- 用户自行申请
  is_editor boolean not null default false,  -- 只有 ADMIN_PHONE 为 true
  created_at timestamp with time zone default now()
);

-- 书
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  genre text,
  cover_url text,                         -- 直接 URL(可外链或上传)
  hot int default 0,
  intro text,
  author_phone text references users(phone), -- 创建者手机号
  created_at timestamp with time zone default now()
);

-- 评分（同一读者同一本书一条,可覆盖）
create table if not exists ratings (
  user_phone text references users(phone) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (user_phone, book_id)
);

-- 章节
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete cascade,
  title text not null,
  body text not null,
  order_index int not null,
  status text not null default 'draft',   -- draft / approved
  created_at timestamp with time zone default now()
);

-- 书架(收藏)
create table if not exists shelves (
  user_phone text references users(phone) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  added_at timestamp with time zone default now(),
  primary key (user_phone, book_id)
);

-- 阅读历史
create table if not exists history (
  id bigserial primary key,
  user_phone text references users(phone) on delete cascade,
  book_id uuid references books(id),
  chapter_id uuid references chapters(id),
  at timestamp with time zone default now()
);

-- Banner / 公告(编辑改)
create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create index if not exists idx_books_created on books(created_at desc);
create index if not exists idx_chapters_book on chapters(book_id, order_index);
create index if not exists idx_history_user on history(user_phone, at desc);
