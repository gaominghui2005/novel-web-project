# 听书 · 小说阅读站(v2 · 账号密码版)

任何人打开网站,输入手机号 + 密码即自动注册 / 登录。
作者权限在个人页一键申请;**编辑权限仅你(16662970981)一人**。
其他人想当编辑,私下找你,你在 Supabase SQL 里手功一句话升任。

---

## 部署步骤(Vercel + Supabase)

### 1. Supabase
1. https://supabase.com 注册 → New Project
2. 左栏 SQL Editor → 依次执行:
   - `supabase/schema.sql`
   - `supabase/rls.sql`
   - `supabase/seed_banners.sql`
3. Project Settings → API:
   - 复制 `Project URL` → `SUPABASE_URL`
   - 复制 `service_role` (不是 anon!) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. 本地依赖
```bash
cd "C:\Users\PC\Desktop\小说网页项目"
npm install
```
> 注意:之前 `package.json` 只有 express。新的已加上 `@supabase/supabase-js`、`bcryptjs`、`jsonwebtoken`。

### 3. 本地跑
```bash
# 在 .env.local 里填好上面四个值
npm i -g vercel          # 一次性,装 Vercel CLI
vercel dev               # 模拟 Vercel 环境
```

### 4. 部署
```bash
vercel login
vercel                   # 第一次会问一堆,接受全部默认
vercel --prod
```

部署后到 Vercel Dashboard → Settings → Environment Variables 配置:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`(随便一长串)
- `ADMIN_PHONE=16662970981`(你本人。用这个手机号注册/登录后自动 `is_editor=true`)

### 5. 把 data.js 里的 15 本书迁移到 Supabase
```bash
SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed.mjs
```

---

## 接口一览

| 路径 | 方法 | 鉴权 | 用途 |
|---|---|---|---|
| `/api/auth/phone-password` | POST | 否 | 手机号+密码,不存在则自动注册 |
| `/api/auth/me` | GET | 是 | 当前用户 |
| `/api/auth/logout` | POST | 否 | 清 cookie |
| `/api/auth/become-author` | POST | 是 | 申请成为作者 |
| `/api/books` | GET | 否 | 书列表 |
| `/api/books` | POST | is_author | 新建书 |
| `/api/books/:id` | GET | 否 | 单本书+章节 |
| `/api/books/:id/cover` | POST | is_author | 改封面 URL |
| `/api/books/:id/chapters` | GET | 否 | 章节列表(只看 approved) |
| `/api/books/:id/chapters` | POST | is_author | 新建章节 |
| `/api/chapters/:id` | GET | 否 | 正文(approved) |
| `/api/chapters/:id` | PUT | is_author | 改章节 |
| `/api/shelf` | GET/POST/DELETE | 是 | 书架 |
| `/api/history` | GET/POST | 是 | 历史 |
| `/api/banners` | GET | 否 | 公告 |
| `/api/banners` | POST/PUT | is_editor | 编辑公告 |
| `/api/ratings` | GET | 否 | 评分榜(贝叶斯平均) |
| `/api/ratings` | POST | 是 | 给书打分(1-5),同人同书一条 |
| `/api/ratings/me/[bookId]` | GET | 是 | 拿当前用户对某书的打分 |

所有受保护接口:HttpOnly cookie + JWT。

---

## 速查表 ⚠️(凭记忆写的,可能过时)

> 我不能联网,以下路径截至我知识截止日。**跟现在控制台不一样,以你看到的为准**。

### Supabase
- 入口: https://supabase.com → Sign In → Dashboard
- 取 URL/Key:Project Settings(左下角齿轮) → API
- SQL Editor:左栏 SQL → New query

### Vercel
- 入口: https://vercel.com → Sign Up(用 GitHub 账号)
- CLI 部署:`vercel login` → 项目根跑 `vercel`

### 不要做的事
- 不要把 SUPABASE_SERVICE_ROLE_KEY 提交到 Git
- 不要在前端用 anon key 调用敏感接口(我们用 service_role 在服务端做)
- JWT_SECRET 不要是 `secret`,生成一段强随机字符串
