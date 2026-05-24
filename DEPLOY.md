# 部署指南

## 1. 上传图片到 Git（重要！）
```bash
git add public/images/ -f
```

## 2. 提交所有代码
```bash
git add .
git commit -m "full app with images"
git push
```

## 3. Render 配置

进入 Render Dashboard → 你的服务 → 修改以下配置：

### Build Command
```
npm install && npm run build
```

### Start Command
```
node src/server/seed.js && node src/server/index.js
```

### Environment Variables (关键！)
点 "Environment" → "Add Environment Variable":
| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `/api` |

## 4. 重新部署
点 "Manual Deploy" → "Deploy latest commit"
等 3-5 分钟

## 搞定
访问 `https://youcan-app.onrender.com`
管理员: admin / admin123
