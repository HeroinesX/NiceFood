const express = require('express');
const cors = require('cors');
const apiRouter = require('./api');
const communityRouter = require('./community');
const adminRouter = require('./admin');
const path = require('path');

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// 托管静态图片 — 放在 API 同端口，避免跨端口加载问题
app.use('/images', express.static(path.join(__dirname, '..', '..', 'public', 'images')));

// API 路由
app.use('/api', apiRouter);
app.use('/api/community', communityRouter);
app.use('/api/admin', adminRouter);

// 托管前端静态文件（检测 build/ 目录是否存在即可，不依赖 NODE_ENV）
const buildDir = path.join(__dirname, '..', '..', 'build');
const fs = require('fs');
if (fs.existsSync(path.join(buildDir, 'index.html'))) {
  app.use(express.static(buildDir));
  // Express 5 的 catch-all 路由
  app.use((req, res) => {
    if (req.method === 'GET') {
      res.sendFile(path.join(buildDir, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
  console.log(`  📦 前端已构建，托管静态文件`);
}

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🚀 优餐 API Server`);
  console.log(`  ─────────────────`);
  console.log(`  📡 地址: http://localhost:${PORT}/api`);
  console.log(`  🗄️  数据库: 本地 JSON 文件 (.data/)`);
  console.log(`  ⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}\n`);
});
