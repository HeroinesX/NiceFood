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

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) req.userId = jwt.verify(token, JWT_SECRET).userId;
  } catch {}
  next();
};

// ── 社区帖子列表 ──
router.get('/posts', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, recipeId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await UserModel.User.find({ banned: { $ne: true } });

    let posts = [];
    users.forEach(user => {
      (user.shares || []).forEach(share => {
        if (recipeId && String(share.recipeId) !== recipeId) return;
        posts.push({
          _id: share._id || `${user._id}-${share.recipeId}`,
          userId: user._id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.avatar || '',
          level: user.level || '新手厨师',
          type: share.type || 'share',
          recipeId: share.recipeId,
          recipeName: share.recipeName,
          image: share.image,
          text: share.text,
          rating: share.rating,
          createdAt: share.createdAt
        });
      });
    });

    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = posts.length;
    const paged = posts.slice(skip, skip + parseInt(limit));

    res.json({ total, page: parseInt(page), posts: paged, hasMore: skip + parseInt(limit) < total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 发帖/交作业 ──
router.post('/posts', auth, async (req, res) => {
  try {
    const { recipeId, recipeName, image, text, rating } = req.body;

    // recipeId 可选 — 不填就是自由发帖
    let recipe = null;
    if (recipeId) {
      recipe = await RecipeModel.findById(recipeId);
      // 不强迫校验菜谱存在，允许引用已删除的
    }

    const shareData = {
      type: recipeId ? 'share' : 'post',
      image: image || '',
      text: text || '',
      rating: rating || 0,
      createdAt: new Date()
    };

    if (recipeId) shareData.recipeId = recipeId;
    if (recipeName || recipe?.name) shareData.recipeName = recipeName || recipe.name;

    await UserModel.updateOne(
      { _id: req.userId },
      { $push: { shares: shareData } }
    );

    res.json({ message: '发布成功 🎉' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 边发帖边创建新菜谱 ──
router.post('/posts/with-recipe', auth, async (req, res) => {
  try {
    const { text, image, recipe } = req.body;
    if (!recipe || !recipe.name) {
      return res.status(400).json({ error: '菜名不能为空' });
    }

    // 创建新菜谱
    const newRecipe = await RecipeModel.Recipe.insert({
      name: recipe.name,
      image: recipe.image || '',
      time: recipe.time || '30分钟',
      tags: recipe.tags || [],
      servings: recipe.servings || 2,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      difficulty: recipe.difficulty || '中等',
      status: 'approved',
      createdAt: new Date()
    });

    // 创建帖子
    await UserModel.updateOne(
      { _id: req.userId },
      {
        $push: {
          shares: {
            type: 'share',
            recipeId: newRecipe._id,
            recipeName: recipe.name,
            image: image || recipe.image || '',
            text: text || '',
            rating: 0,
            createdAt: new Date()
          }
        }
      }
    );

    res.json({ message: '菜谱和帖子已发布 🎉', recipeId: newRecipe._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── 帖子管理 ──
router.delete('/posts/:postId', auth, async (req, res) => {
  try {
    await UserModel.updateOne(
      { _id: req.userId },
      { $pull: { shares: { _id: req.params.postId } } }
    );
    res.json({ message: '删除成功' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/posts/:postId', auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    const share = (user.shares || []).find(s => String(s._id) === req.params.postId);
    if (!share) return res.status(404).json({ error: '帖子不存在' });

    await UserModel.updateOne(
      { _id: req.userId },
      {
        $push: {
          pendingEdits: {
            postId: req.params.postId,
            newText: req.body.text || share.text,
            newRating: req.body.rating || share.rating,
            submittedAt: new Date()
          }
        }
      }
    );
    res.json({ message: '修改已提交，等待管理员审核' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── 用户中心 ──
router.get('/user/posts', auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    const posts = (user.shares || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ username: user.username, displayName: user.displayName || user.username, avatar: user.avatar, level: user.level, posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/cooked', auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    const recipeIds = [...new Set((user.shares || []).map(s => String(s.recipeId)))];
    const allRecipes = await RecipeModel.Recipe.find({});
    const recipes = allRecipes.filter(r => recipeIds.includes(String(r._id)));
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/user/profile', auth, async (req, res) => {
  try {
    const { bio, location, avatar, displayName } = req.body;
    const update = {};
    if (bio !== undefined) update.bio = bio;
    if (location !== undefined) update.location = location;
    if (avatar !== undefined) update.avatar = avatar;
    if (displayName !== undefined) update.displayName = displayName;
    await UserModel.findByIdAndUpdate(req.userId, update);
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
