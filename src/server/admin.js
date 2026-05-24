const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const RecipeModel = require('./models/Recipe');
const UserModel = require('./models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'food-app-secret-key-2024';

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '请先登录' });
    req.userId = jwt.verify(token, JWT_SECRET).userId;
    next();
  } catch { res.status(401).json({ error: '登录已过期' }); }
};

const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '请先登录' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(decoded.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: '登录已过期' }); }
};

// ══════ 菜谱投稿 ══════
router.post('/recipes/submit', auth, async (req, res) => {
  try {
    const { name, image, time, tags, servings, ingredients, steps, nutrition, equipment, difficulty } = req.body;
    if (!name || !ingredients?.length || !steps?.length) {
      return res.status(400).json({ error: '菜名、食材和步骤为必填' });
    }
    const recipe = await RecipeModel.Recipe.insert({
      name,
      image: image || 'https://placehold.co/400x300/FFF3ED/FF6B35?text=🍳',
      time: time || '30分钟',
      tags: tags || [],
      servings: servings || 2,
      ingredients,
      steps,
      nutrition: nutrition || { calories: '0kcal', protein: '0g', carbs: '0g', fat: '0g' },
      equipment: equipment || [],
      difficulty: difficulty || '中等',
      status: 'pending',
      submittedBy: req.userId,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date()
    });
    res.status(201).json({ message: '投稿已提交，等待审核', recipe });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recipes/my-submissions', auth, async (req, res) => {
  try {
    const allRecipes = await RecipeModel.Recipe.find({ submittedBy: req.userId });
    allRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(allRecipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ══════ 管理端 ══════
router.get('/pending-recipes', adminAuth, async (req, res) => {
  try {
    const allRecipes = await RecipeModel.Recipe.find({ status: 'pending' });
    allRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(allRecipes);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/recipes/:id/approve', adminAuth, async (req, res) => {
  try {
    await RecipeModel.findByIdAndUpdate(req.params.id, { $set: { status: 'approved' } });
    res.json({ message: '已通过审核' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/recipes/:id/reject', adminAuth, async (req, res) => {
  try {
    await RecipeModel.findByIdAndUpdate(req.params.id, { $set: { status: 'rejected' } });
    res.json({ message: '已驳回' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/recipes/:id', adminAuth, async (req, res) => {
  try {
    await RecipeModel.findByIdAndDelete(req.params.id);
    res.json({ message: '菜谱已删除' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/pending-edits', adminAuth, async (req, res) => {
  try {
    const users = await UserModel.User.find({});
    const edits = [];
    users.forEach(u => {
      (u.pendingEdits || []).forEach(e => {
        edits.push({ ...e, userId: u._id, username: u.username });
      });
    });
    res.json(edits);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/posts/:postId/approve-edit', adminAuth, async (req, res) => {
  try {
    const users = await UserModel.User.find({});
    for (const user of users) {
      const share = (user.shares || []).find(s => String(s._id) === req.params.postId);
      if (!share) continue;
      const pending = (user.pendingEdits || []).find(e => e.postId === req.params.postId);
      if (pending) {
        share.text = pending.newText;
        share.rating = pending.newRating;
        user.pendingEdits = (user.pendingEdits || []).filter(e => e.postId !== req.params.postId);
        UserModel.User._saveForce(); // Direct file save
      }
    }
    res.json({ message: '编辑已通过' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/posts/:postId/reject-edit', adminAuth, async (req, res) => {
  try {
    const users = await UserModel.User.find({});
    for (const user of users) {
      const before = (user.pendingEdits || []).length;
      user.pendingEdits = (user.pendingEdits || []).filter(e => e.postId !== req.params.postId);
      if (user.pendingEdits.length !== before) {
        UserModel.User._saveForce();
      }
    }
    res.json({ message: '编辑已驳回' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/posts/:postId', adminAuth, async (req, res) => {
  try {
    const users = await UserModel.User.find({});
    for (const user of users) {
      const before = (user.shares || []).length;
      user.shares = (user.shares || []).filter(s => String(s._id) !== req.params.postId);
      if (user.shares.length !== before) {
        UserModel.User._saveForce();
      }
    }
    res.json({ message: '帖子已删除' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await UserModel.User.find({});
    // 移除密码字段
    const sanitized = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    res.json(sanitized);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    await UserModel.findByIdAndUpdate(req.params.id, { $set: { role: req.body.role } });
    res.json({ message: '角色已更新' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    await UserModel.findByIdAndUpdate(req.params.id, { $set: { banned: true } });
    res.json({ message: '用户已封禁' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/users/:id/unban', adminAuth, async (req, res) => {
  try {
    await UserModel.findByIdAndUpdate(req.params.id, { $set: { banned: false } });
    res.json({ message: '用户已解封' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 在需要时进行直接文件保存
const saveDb = () => {
  // db.js handles auto-save on mutations
  // This is for the admin operations that modify nested arrays
};

module.exports = router;
