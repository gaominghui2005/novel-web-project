-- 预置 banner
insert into banners (text, active) values
  ('欢迎来到听书 · 小说阅读站', true),
  ('第一章试运营:账号即手机号,密码自定', true)
on conflict do nothing;
