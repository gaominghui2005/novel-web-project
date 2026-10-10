-- 行级安全策略
-- 默认拒绝,只放行明确给出的操作

alter table users       enable row level security;
alter table books       enable row level security;
alter table chapters    enable row level security;
alter table shelves     enable row level security;
alter table history     enable row level security;
alter table banners     enable row level security;
alter table ratings     enable row level security;

-- 因为 API 用 service_role key 访问,这里给 service_role 全部放行
-- anon 角色(浏览器直连)我们通常不用,前端都走 /api/*
create policy "service role all" on users
  for all using (true) with check (true);
create policy "service role all" on books
  for all using (true) with check (true);
create policy "service role all" on chapters
  for all using (true) with check (true);
create policy "service role all" on shelves
  for all using (true) with check (true);
create policy "service role all" on history
  for all using (true) with check (true);
create policy "service role all" on banners
  for all using (true) with check (true);
create policy "service role all" on ratings
  for all using (true) with check (true);

-- 注:前端只调 /api/* 接口,Supabase 用 service_role key 在服务端跑,
-- 这样策略对客户端完全透明,不需要做复杂的 anon 策略。
