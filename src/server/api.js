const express = require('express');
const router = express.Router();
const RecipeModel = require('./models/Recipe');
const UserModel = require('./models/User');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ── 纯 JS 密码哈希（替代 bcrypt，零原生依赖）──
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const HASH_ALGO = 'sha512';
const HASH_ITERATIONS = 100000;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, KEY_LENGTH, HASH_ALGO).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, KEY_LENGTH, HASH_ALGO).toString('hex');
  return hash === verify;
}
const { recommend } = require('./services/recommendation');

const JWT_SECRET = process.env.JWT_SECRET || 'food-app-secret-key-2024';

// ── 认证中间件 ──
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '请先登录' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
};

// ── 用户认证 ──
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || username.length < 2) {
      return res.status(400).json({ error: '用户名至少需要2个字符' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashedPassword = await hashPassword(password);
    const user = await UserModel.User.insert({
      username,
      displayName: displayName || username,
      password: hashedPassword,
      avatar: '',
      preferences: [],
      favorites: [],
      shares: [],
      pendingEdits: [],
      bio: '',
      location: '',
      level: '新手厨师',
      role: 'user',
      banned: false,
      createdAt: new Date()
    });
    res.status(201).json({ message: '注册成功 🎉' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ username });

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (user.banned) {
      return res.status(403).json({ error: '账号已被封禁' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 智能菜谱推荐 ──
router.get('/recommendations', async (req, res) => {
  try {
    const {
      peopleCount = 2,
      ingredients = '',
      flavors = '',
      cookingTime = 30,
      limit = 10
    } = req.query;

    const flavorList = flavors ? flavors.split(',').map(f => f.trim()) : [];

    const results = await recommend({
      peopleCount: parseInt(peopleCount),
      ingredients,
      flavors: flavorList,
      cookingTime: parseInt(cookingTime),
      limit: parseInt(limit)
    });

    res.json({
      total: results.length,
      recommendations: results
    });
  } catch (error) {
    console.error('推荐失败:', error);
    res.status(500).json({ error: '推荐服务暂时不可用' });
  }
});

// ── 菜谱 CRUD ──
router.get('/recipes', async (req, res) => {
  try {
    const { search, tag, page = 1, limit = 20 } = req.query;
    const { recipes, total } = await RecipeModel.find({ search, tag, page, limit });
    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      recipes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个菜谱详情
router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await RecipeModel.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: '菜谱不存在' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 关联菜谱 ──
router.get('/recipes/:id/related', async (req, res) => {
  try {
    const recipe = await RecipeModel.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: '菜谱不存在' });

    const ingredientNames = (recipe.ingredients || []).map(i => i.name);
    const allRecipes = await RecipeModel.Recipe.find({});
    const related = allRecipes.filter(r =>
      r._id !== recipe._id &&
      (r.ingredients || []).some(i => ingredientNames.some(n => i.name.includes(n) || n.includes(i.name)))
    );

    // 按食材重叠数排序
    const scored = related.map(r => ({
      ...r,
      sharedIngredients: (r.ingredients || [])
        .filter(i => ingredientNames.some(n => i.name.includes(n) || n.includes(i.name)))
        .map(i => i.name)
    }));
    scored.sort((a, b) => b.sharedIngredients.length - a.sharedIngredients.length);

    res.json(scored.slice(0, 6));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 分享/交作业 ──
router.get('/shares/:recipeId', async (req, res) => {
  try {
    const users = await UserModel.User.find({});
    const shares = [];
    users.forEach(u => {
      (u.shares || []).filter(s => String(s.recipeId) === req.params.recipeId)
        .forEach(s => shares.push({ ...s, username: u.username }));
    });
    res.json(shares);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shares', auth, async (req, res) => {
  try {
    const { recipeId, image, text } = req.body;
    await UserModel.updateOne(
      { _id: req.userId },
      { $push: { shares: { recipeId, image, text, createdAt: new Date() } } }
    );
    res.json({ message: '分享成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 收藏管理 ──
router.get('/favorites', auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const populated = await UserModel.populateFavorites(user);
    res.json(populated.favorites || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/favorites/:id', auth, async (req, res) => {
  try {
    const recipe = await RecipeModel.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: '菜谱不存在' });

    const user = await UserModel.findById(req.userId);
    if ((user.favorites || []).some(id => String(id) === req.params.id)) {
      return res.json({ message: '已经收藏过了' });
    }

    await UserModel.updateOne(
      { _id: req.userId },
      { $push: { favorites: req.params.id } }
    );
    res.json({ message: '收藏成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/favorites/:id', auth, async (req, res) => {
  try {
    await UserModel.updateOne(
      { _id: req.userId },
      { $pull: { favorites: req.params.id } }
    );
    res.json({ message: '已取消收藏' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 检查是否已收藏
router.get('/favorites/:id/check', auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    const isFavorited = (user.favorites || []).some(id => String(id) === req.params.id);
    res.json({ isFavorited });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 个人中心 ──
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const populated = await UserModel.populateFavorites(user);

    res.json({
      name: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || '',
      preferences: user.preferences || [],
      favoritesCount: (populated.favorites || []).length,
      role: user.role || 'user',
      level: user.level || '新手厨师',
      bio: user.bio || '',
      location: user.location || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 热门搜索词 ──
router.get('/popular-searches', async (req, res) => {
  const allRecipes = await RecipeModel.Recipe.find({});
  const tagCount = {};
  allRecipes.forEach(r => {
    (r.tags || []).forEach(t => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    });
  });
  const popular = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  const defaults = ['下饭菜', '减脂餐', '早餐', '快手菜'];
  const merged = [...new Set([...popular, ...defaults])].slice(0, 10);
  res.json(merged);
});

// ── 食材分类列表 ──
router.get('/ingredient-categories', (req, res) => {
  res.json([
    { name: '肉类', icon: '🥩', keywords: ['猪肉', '牛肉', '羊肉', '鸡肉', '鸭肉'] },
    { name: '蔬菜', icon: '🥬', keywords: ['白菜', '青菜', '番茄', '土豆', '茄子'] },
    { name: '豆制品', icon: '🫘', keywords: ['豆腐', '豆芽', '豆角', '豆豉'] },
    { name: '水产', icon: '🐟', keywords: ['鱼', '虾', '蟹', '贝'] },
    { name: '蛋奶', icon: '🥚', keywords: ['鸡蛋', '牛奶', '奶酪', '奶油'] }
  ]);
});


// -- Image serving via API --
const imgPath = require('path');
const imgFs = require('fs');

// ── 图片上传 ──
router.post('/upload', auth, async (req, res) => {
  try {
    const { image, type } = req.body; // type: 'avatar' | 'post'
    if (!image) return res.status(400).json({ error: '缺少图片数据' });

    // 解析 base64
    const matches = image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: '图片格式不支持' });

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = Buffer.from(matches[2], 'base64');

    // 限制大小 (5MB)
    if (data.length > 20 * 1024 * 1024) {
      return res.status(400).json({ error: '图片不能超过20MB' });
    }

    const folder = type === 'avatar' ? 'avatars' : 'uploads';
    const dir = imgPath.join(__dirname, '..', '..', 'public', 'images', folder);
    if (!imgFs.existsSync(dir)) imgFs.mkdirSync(dir, { recursive: true });

    const filename = `${req.userId}_${Date.now()}.${ext}`;
    imgFs.writeFileSync(imgPath.join(dir, filename), data);

    const url = `/images/${folder}/${filename}`;
    res.json({ url, message: '上传成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/images/:folder/:file', (req, res) => {
  const filePath = imgPath.join(__dirname, '..', '..', 'public', 'images', req.params.folder, req.params.file);
  if (imgFs.existsSync(filePath)) {
    const ext = imgPath.extname(filePath).toLowerCase();
    const mimes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    res.type(mimes[ext] || 'image/jpeg');
    imgFs.createReadStream(filePath).pipe(res);
  } else {
    res.type('image/svg+xml');
    res.send('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400"><rect fill="#FFF3ED" width="500" height="400"/><text x="250" y="210" text-anchor="middle" fill="#FF6B35" font-size="50" font-family="sans-serif">\\xF0\\x9F\\x8D\\xB3</text><text x="250" y="260" text-anchor="middle" fill="#E55A2B" font-size="14" font-family="sans-serif">' + req.params.file + '</text></svg>');
  }
});

module.exports = router;
