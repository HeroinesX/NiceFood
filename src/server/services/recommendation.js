/**
 * 智能菜谱推荐引擎
 *
 * 基于 JSON 数据库的多维度评分排序
 */

const RecipeModel = require('../models/Recipe');

// ── 核心推荐函数 ──
async function recommend(req = {}) {
  const {
    peopleCount = 2,
    ingredients = '',
    flavors = [],
    cookingTime = 30,
    limit = 10
  } = req;

  const ingredientList = parseIngredients(ingredients);
  const flavorList = normalizeFlavors(flavors);

  // 1️⃣ 从数据库查找候选菜谱
  let candidates = await fetchCandidates({ ingredientList, flavorList, cookingTime });

  // 2️⃣ 多维度评分排序
  const scored = candidates.map(recipe => ({
    recipe,
    score: calculateScore(recipe, {
      ingredientList,
      flavorList,
      cookingTime,
      peopleCount
    })
  }));

  scored.sort((a, b) => b.score - a.score);

  // 3️⃣ 按用餐人数调整食材用量
  const results = scored.slice(0, limit).map(item => ({
    ...item.recipe,
    matchScore: item.score,
    adjustedIngredients: adjustPortions(item.recipe.ingredients, peopleCount, item.recipe.servings || 2),
    recommendationReason: generateReason(item.score, item.recipe, ingredientList, flavorList)
  }));

  return results;
}

// ── 食材解析 ──
function parseIngredients(raw) {
  if (!raw) return [];
  return raw
    .split(/[,，、\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeFlavors(flavors) {
  if (!flavors || !Array.isArray(flavors)) return [];
  const map = {
    '家常': ['家常', '下饭', '快手'],
    '微辣': ['辣味', '微辣', '麻辣'],
    '酸甜': ['酸甜', '糖醋', '甜'],
    '清淡': ['清淡', '养生', '凉菜'],
    '浓郁': ['浓郁', '咸甜', '红烧'],
  };
  return flavors.flatMap(f => map[f] || [f]);
}

// ── 候选菜谱获取 ──
async function fetchCandidates({ ingredientList, flavorList, cookingTime }) {
  const allRecipes = await RecipeModel.Recipe.find({ status: { $ne: 'rejected' } });

  if (ingredientList.length === 0 && flavorList.length === 0) {
    // 没有条件 => 返回热门菜谱
    allRecipes.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return allRecipes.slice(0, 20);
  }

  // 食材匹配
  let candidates = allRecipes.filter(recipe => {
    const recipeIngNames = (recipe.ingredients || []).map(i => i.name);
    return ingredientList.some(ing =>
      recipeIngNames.some(ri => ri.includes(ing) || ing.includes(ri))
    );
  });

  // 如果食材匹配太少，放宽条件
  if (candidates.length < 5 && ingredientList.length > 0) {
    const firstIng = ingredientList[0];
    candidates = allRecipes.filter(recipe =>
      (recipe.ingredients || []).some(i => i.name.includes(firstIng) || firstIng.includes(i.name))
    );
  }

  // 如果还不够，返回热门菜谱
  if (candidates.length < 3) {
    allRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return allRecipes.slice(0, 20);
  }

  return candidates;
}

// ── 多维度评分 ──
function calculateScore(recipe, { ingredientList, flavorList, cookingTime, peopleCount }) {
  let score = 0;

  // 食材匹配度 (权重 40%)
  const recipeIngNames = (recipe.ingredients || []).map(i => i.name);
  const matchCount = ingredientList.filter(ing =>
    recipeIngNames.some(ri => ri.includes(ing) || ing.includes(ri))
  ).length;
  if (ingredientList.length > 0) {
    score += (matchCount / ingredientList.length) * 40;
  }

  // 口味匹配度 (权重 25%)
  if (flavorList.length > 0 && recipe.tags) {
    const tagMatch = recipe.tags.filter(t => flavorList.includes(t)).length;
    score += Math.min(tagMatch / flavorList.length, 1) * 25;
  }

  // 时间匹配度 (权重 20%)
  const recipeTime = parseInt(recipe.time) || 30;
  if (recipeTime <= cookingTime * 1.5) {
    score += 20;
  } else if (recipeTime <= cookingTime * 2) {
    score += 10;
  } else {
    score += Math.max(0, 20 - (recipeTime - cookingTime * 1.5) / 5);
  }

  // 菜谱热度/评分 (权重 15%)
  score += (recipe.rating || 4.0) / 5 * 15;

  return Math.round(score * 10) / 10;
}

// ── 份量调整 ──
function adjustPortions(ingredients, targetPeople, baseServings) {
  if (!ingredients) return [];
  if (targetPeople === baseServings) return ingredients;
  const ratio = targetPeople / baseServings;

  return ingredients.map(ing => {
    const adjusted = { ...ing };
    const match = ing.amount.match(/^([\d.]+)\s*(.+)$/);
    if (match) {
      const num = parseFloat(match[1]) * ratio;
      adjusted.amount = `${roundIngredient(num)}${match[2]}`;
      adjusted.originalAmount = ing.amount;
    }
    return adjusted;
  });
}

function roundIngredient(num) {
  if (num < 0.5) {
    const fractions = {
      0.125: '1/8', 0.25: '1/4', 0.33: '1/3', 0.5: '1/2'
    };
    return fractions[Math.round(num * 8) / 8] || num.toFixed(1);
  }
  if (num < 1) return num.toFixed(1);
  return Math.round(num * 2) / 2;
}

// ── 推荐理由 ──
function generateReason(score, recipe, ingredientList, flavorList) {
  const parts = [];
  if (score >= 80) parts.push('🌟 高度匹配');
  else if (score >= 60) parts.push('👍 良好匹配');

  if (ingredientList.length > 0) {
    const matched = (recipe.ingredients || []).filter(i =>
      ingredientList.some(ing => i.name.includes(ing) || ing.includes(i.name))
    );
    if (matched.length > 0) {
      parts.push(`已匹配食材: ${matched.map(i => i.name).join('、')}`);
    }
  }

  if (recipe.tags && flavorList.length > 0) {
    const matchedTags = recipe.tags.filter(t => flavorList.includes(t));
    if (matchedTags.length > 0) {
      parts.push(`口味: ${matchedTags.join('、')}`);
    }
  }

  return parts.join(' | ');
}

module.exports = { recommend };
