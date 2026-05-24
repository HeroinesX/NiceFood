# 部署指南
## Render 配置

| 选项 | 值 |
|------|-----|
| Build Command | `npm install && npm run build` |
| Start Command | `node src/server/seed.js && node src/server/index.js` |

## 上传前准备（重要！）

```bash
# 确保图片被提交
git add public/images/ -f
git add src/server/seed-data.json

# 提交并推送
git add .
git commit -m "full app"
git push
```

## 注意
首次部署后，Render 会自动导入47道菜谱和管理员账号 (admin/admin123)
