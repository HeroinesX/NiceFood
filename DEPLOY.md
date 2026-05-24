# 🚀 优餐 - 部署指南 (GitHub + Render)

## 第一步：上传到 GitHub

### 1. 注册/登录 GitHub
打开 https://github.com 注册账号

### 2. 创建仓库
```
点右上角 + → New repository
Repository name: youcan-app
勾选 Public
点 Create repository
```

### 3. 打开终端 (CMD/PowerShell)
```
cd 你电脑上的项目路径 (例如 D:\从0开始的软件开发\my-food-app)
```

### 4. 初始化 Git 并上传
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/你的用户名/youcan-app.git
git push -u origin main
```

---

## 第二步：部署到 Render

### 1. 注册 Render
打开 https://render.com → 点 "Get Started"
用 GitHub 账号登录

### 2. 新建 Web Service
```
Dashboard → New + → Web Service
Connect your GitHub account → 选择 youcan-app 仓库
```

### 3. 填写配置

| 选项 | 填写 |
|------|------|
| Name | `youcan-app` |
| Region | `Singapore` (亚洲最快) |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `npm install && npm run build` |
| Start Command | `node src/server/index.js` |
| Plan | `Free` |

### 4. 点 "Create Web Service"

等 3-5 分钟构建完成，Render 会给一个网址：
```
https://youcan-app.onrender.com
```

---

## 注意事项

### 数据库
当前用的是本地 JSON 文件，部署后数据会丢失（Render 重启就清空）。
**如需长期使用**，建议改成 MongoDB Atlas 免费版：

1. 注册 https://www.mongodb.com/atlas
2. 创建免费集群 (512MB)
3. 获取连接字符串
4. 在 Render 设置 Environment Variables:
   - `MONGODB_URI` = 你的连接字符串
   - 然后我帮你改代码支持 MongoDB

### 图片上传
上传的头像和帖子图片存在服务器本地，部署后也会丢失。
建议改用云存储（阿里云OSS/腾讯云COS/七牛云）。

### 更新代码
```bash
# 本地改完代码后
git add .
git commit -m "改了啥"
git push
# Render 会自动重新部署
```
