# 部署到 Vercel + 公网可访问

> 这份文档**一步一步**教会你在浏览器/命令行操作,把项目部署到公网。
>
> ⚠️ 注意:本项目目前是 **本地 SQLite 模式**(`node server.js` 起本地服务)。**部署到 Vercel 上,因为 Vercel 不能用 SQLite(它是 serverless,文件系统不可写),需要切换回 Supabase**。
>
> 所以部署路线 = Vercel + Supabase。也就是说**你之前注册过的 Supabase 项目(URL:vnhdzqmkbqettudjtffp)**会被用上。

---

## 第一步:在 Supabase 建表

如果**还没建过**,打开 https://supabase.com/dashboard → SQL Editor,粘贴并依次运行:

1. `C:\Users\PC\Desktop\小说网页项目\supabase\schema.sql` 全文
2. `C:\Users\PC\Desktop\小说网页项目\supabase\rls.sql` 全文
3. `C:\Users\PC\Desktop\小说网页项目\supabase\seed_banners.sql` 全文

---

## 第二步:把代码推上 GitHub

### 2.1 装 git

- 打开 https://git-scm.com/download/win → 下载安装
- 或 Windows 自带(较新版本):`winget install GitHub.Git`

### 2.2 在桌面上登录 GitHub

如果你**已经注册过 GitHub**(很多大学同学都有),跳过;没有就 https://github.com/signup 注册一个(免费)。

### 2.3 在浏览器里建一个空仓库

- 访问 https://github.com/new
- Repository name: 填 `ting-shu`(或 `novel-web-project`)
- 选择 **Public**(公开,Vercel 部署不需要 Private)
- **不要勾** Initialize with README(我们要自己 push)
- 点 **Create repository**

### 2.4 在 cmd 里 push 代码

打开 cmd(WIN+R → cmd),一行一行粘贴:

```
cd C:\Users\PC\Desktop\小说网页项目
git init
git add .
git commit -m "init: 第一版小说阅读站"
git remote add origin https://github.com/<你的 GitHub 用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

第一次 push **会让你登录 GitHub**。可能弹出浏览器。如果要求 token:
- 浏览器打开 https://github.com/settings/tokens
- Generate new token → 选 **repo + workflow** 权限
- 复制 token,粘到 cmd 里(它不会显示)

---

## 第三步:把项目部署到 Vercel

### 3.1 注册并登录 Vercel

打开 https://vercel.com → **Sign Up with GitHub**(推荐) → 授权 Vercel 读取你的 repo

### 3.2 Import 项目

- 登录后点 **Add New... → Project**
- 找到你的仓库(刚才 push 的) → 点 **Import**

### 3.3 配置环境变量

在 "Configure Project" 页面 → **Environment Variables**:

| 名字 | 值 |
|---|---|
| `SUPABASE_URL` | `https://vnhdzqmkbqettudjtffp.supabase.co` |
| `SUPABASE_SECRET_KEY` | `<你在 Supabase 控制台拿到的 secret key>` |
| `SUPABASE_SERVICE_ROLE_KEY` | 同上 |
| `JWT_SECRET` | 自己编一段长随机字符串,例如 `novel-2026-real-deploy-secret-xyz123456` |
| `ADMIN_PHONE` | `16662970981` |

环境变量填好,**点 Deploy**

### 3.4 等待部署

Vercel 会构建 1~3 分钟。完成后页面会显示你的域名:`https://ting-shu.vercel.app`(大概这形式)

---

## 第四步:验证

1. 浏览器打开 `https://ting-shu.vercel.app`
2. 应该看到登录页
3. 输 `16662970981` + 任意 ≥ 6 位密码 → 进站(自动注册)
4. "我的" → 进编辑后台 → 发一条公告 → 刷新看是否生效

---

## 部署后 24 小时能做什么?

你把链接发给**任何人**(微信/邮件/群里),他们打开就能用。所有数据落到 Supabase,你登录用的手机号是管理员,别人申请作者也要走那个流程(你也可手动 SQL 升 author)。

---

## 如果遇到问题

| 问题 | 怎么修 |
|---|---|
| `git push` 报 authentication failed | 你 GitHub 账号没登录,或者 token 过期,重新生成 token |
| Vercel 部署失败 red | 看你 logs,一般是 env 没填 |
| 部署后打开 500 | 大概率是 Supabase 网络不通——但** Vercel 自己**,不走你电脑 DNS,**通常 OK** |
| 数据库是空的(没有 15 本书) | 需要跑 `node scripts/seed.mjs` 灌数据,这个我**没接入**自动跑——你手动操作:在 Supabase SQL Editor 跑一段 INSERT。或者告诉我,我帮你写 |

---

## 给你一句傻瓜总结

```
1. Supabase 跑 3 个 SQL(我现在在 supabase schema 里)
2. 装 git,项目根 git init && add && commit && push 到你 GitHub
3. Vercel 网站 import,填 5 个 env,deploy
4. 拿到 *.vercel.app 链接

总共大约 30 分钟(包括等部署)。
```

做吧。有问题随时停下来问我。
