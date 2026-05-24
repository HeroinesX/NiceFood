import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './RecipeListScreen.css';
import BottomNav from './BottomNav';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const RecipeListScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFromRecommend = searchParams.get('from') === 'recommend';
  const tagFilter = searchParams.get('tag');

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendInfo, setRecommendInfo] = useState(null);

  const loadAllRecipes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/recipes?limit=30`);
      const data = await res.json();
      if (data.recipes) {
        setRecipes(data.recipes.map(r => ({
          id: r._id,
          name: r.name,
          image: r.image,
          time: r.time,
          tags: r.tags || []
        })));
      }
    } catch (err) {
      console.error('加载菜谱失败:', err);
      setRecipes([
        { id: 1, name: '凉拌皮蛋', image: 'https://img2.baidu.com/it/u=1814268193,1814322292&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500', time: '15分钟', tags: ['凉菜', '快手'] },
        { id: 2, name: '可乐年糕排骨', image: 'https://img1.baidu.com/it/u=3040233098,4000585781&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500', time: '45分钟', tags: ['下饭菜', '咸甜'] },
        { id: 3, name: '香辣鸡腿', image: 'https://img0.baidu.com/it/u=2666218362,3957478275&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500', time: '30分钟', tags: ['辣味', '下酒'] },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecommendations = useCallback(() => {
    const cached = sessionStorage.getItem('lastRecommendations');
    if (cached) {
      const data = JSON.parse(cached);
      setRecipes(data.recommendations.map(r => ({
        id: r._id,
        name: r.name,
        image: r.image,
        time: r.time,
        tags: r.tags || [],
        matchScore: r.matchScore,
        reason: r.recommendationReason
      })));
      setRecommendInfo(data.params);
    } else {
      loadAllRecipes();
    }
    setLoading(false);
  }, [loadAllRecipes]);

  const loadByTag = useCallback(async (tag) => {
    try {
      const res = await fetch(`${API_BASE}/recipes?tag=${encodeURIComponent(tag)}&limit=20`);
      const data = await res.json();
      if (data.recipes) {
        setRecipes(data.recipes.map(r => ({
          id: r._id,
          name: r.name,
          image: r.image,
          time: r.time,
          tags: r.tags || []
        })));
      }
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFromRecommend) {
      loadRecommendations();
    } else if (tagFilter) {
      loadByTag(tagFilter);
    } else {
      loadAllRecipes();
    }
  }, [isFromRecommend, tagFilter, loadRecommendations, loadByTag, loadAllRecipes]);

  const toggleFavorite = async (id, e) => {
    e.stopPropagation();
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;

    const token = localStorage.getItem('token');
    try {
      if (recipe.isFavorite) {
        await fetch(`${API_BASE}/favorites/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await fetch(`${API_BASE}/favorites/${id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setRecipes(recipes.map(r => 
        r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
      ));
    } catch {
      // 非登录状态：本地切换
      setRecipes(recipes.map(r => 
        r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
      ));
    }
  };

  return (
    <div className="recipe-list-container">
      {/* 顶部导航栏 */}
      <div className="recipe-list-header">
        <button onClick={() => navigate(-1)}>&lt; 返回</button>
        <h2>{isFromRecommend ? '为你推荐' : tagFilter ? `${tagFilter} · 菜谱` : '全部菜谱'}</h2>
        <div>
          <button>筛选</button>
          <button>排序</button>
        </div>
      </div>

      {/* 推荐参数提示 */}
      {recommendInfo && (
        <div className="recommend-banner">
          <p>根据 {recommendInfo.peopleCount} 人份 · 食材: {recommendInfo.ingredients} · 口味: {recommendInfo.flavors?.join(',') || '不限'} · {recommendInfo.cookingTime}分钟内 为你推荐</p>
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="loading">正在加载菜谱...</div>
      ) : (
        <div className="recipe-list">
          {recipes.length === 0 && (
            <div className="empty-state">
              <p>😅 暂时没有找到菜谱</p>
              <button onClick={() => navigate('/')}>回首页试试推荐</button>
            </div>
          )}
          {recipes.map(recipe => (
            <div 
              key={recipe.id} 
              className="recipe-card"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              <img src={recipe.image} alt={recipe.name} loading="lazy" onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=🍳'; }} />
              <div className="recipe-info">
                <h3>{recipe.name}</h3>
                <p>预计{recipe.time} | {recipe.tags.join(' | ')}</p>
                {recipe.reason && <p className="match-reason">{recipe.reason}</p>}
                {recipe.matchScore && (
                  <div className="match-score">
                    <span className="score-bar" style={{ width: `${recipe.matchScore}%` }}></span>
                    <span>匹配度 {recipe.matchScore}%</span>
                  </div>
                )}
              </div>
              <button 
                className={`favorite-btn ${recipe.isFavorite ? 'active' : ''}`}
                onClick={(e) => toggleFavorite(recipe.id, e)}
              >
                {recipe.isFavorite ? '♥' : '♡'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 底部导航栏 */}      <BottomNav />
</div>
  );
};

export default RecipeListScreen;
