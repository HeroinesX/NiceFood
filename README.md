# 🍳 优餐 - 智能美食菜谱

> **Power By HeroinesX** · [GitHub](https://github.com/HeroinesX)

一站式美食菜谱平台。输入你现有的食材，AI 智能推荐能做什么菜。支持菜谱收藏、社区分享、自由发帖、菜谱投稿。

## ✨ 功能

- 🔍 **智能推荐** — 输入食材、人数、口味、时间，自动匹配最合适的菜谱
- 📖 **47 道家常菜谱** — 番茄炒蛋、红烧肉、宫保鸡丁… 每道菜都有详细步骤、食材清单、营养信息
- 🖼️ **高清菜品图** — 每道菜配有真实美食实拍图片
- ❤️ **收藏菜谱** — 喜欢的菜一键收藏，随时查看
- 💬 **美食社区** — 自由发帖、交作业、分享烹饪成果，支持图片上传
- 📝 **菜谱投稿** — 创建自己的菜谱，审核后展示给所有人
- 👤 **个人中心** — 自定义头像、昵称、简介，管理自己的帖子和收藏
- 📱 **PWA 支持** — 手机浏览器添加到主屏幕，像原生 App 一样使用
- 🔗 **按食材分类** — 肉类、蔬菜、水产、蛋奶、豆制品，快速筛选

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 导入种子数据
npm run seed

# 启动开发模式
npm start              # 前端 (localhost:3000)
npm run server         # 后端 (localhost:3001)

# 或一键启动（手机可访问）
start-prod.bat         # Windows 双击
```

访问 http://localhost:3001

## 🔐 管理员

- 用户名: `admin`
- 密码: `admin123`

## 🛠️ 技术栈

| 前端 | 后端 | 数据库 |
|------|------|--------|
| React 18 | Node.js | JSON 文件 |
| React Router | Express 5 | (零依赖) |
| TypeScript | JWT 认证 | |
| PWA | crypto 密码哈希 | |

## 📦 部署

支持一键部署到 Render：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

详见 [DEPLOY.md](DEPLOY.md)

---

**Power By HeroinesX**
