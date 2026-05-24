import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecipeListScreen.css';
import BottomNav from './BottomNav';
import Footer from './Footer';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const FavoritesScreen = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (err) {
      console.error('加载收藏失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id, e) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_BASE}/favorites/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFavorites(prev => prev.filter(r => r._id !== id));
    } catch {}
  };

  const isLoggedIn = !!localStorage.getItem('token');

  if (!isLoggedIn) {
    return (
      <div className="recipe-list-container">
        <div className="recipe-list-header">
          <button onClick={() => navigate(-1)}>&lt; 返回</button>
          <h2>我的收藏</h2>
          <div></div>
        </div>
        <div className="empty-state">
          <p>🔒 请先登录才能查看收藏</p>
          <button onClick={() => navigate('/auth')}>去登录</button>
        </div>            <Footer />
      <BottomNav />
</div>
    );
  }

  return (
    <div className="recipe-list-container">
      <div className="recipe-list-header">
        <button onClick={() => navigate(-1)}>&lt; 返回</button>
        <h2>我的收藏 ({favorites.length})</h2>
        <div></div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : favorites.length === 0 ? (
        <div className="empty-state">
          <p>❤️ 还没有收藏菜谱</p>
          <button onClick={() => navigate('/')}>去首页发现美食</button>
        </div>
      ) : (
        <div className="recipe-list">
          {favorites.map(recipe => (
            <div key={recipe._id} className="recipe-card"
                 onClick={() => navigate(`/recipes/${recipe._id}`)}>
              <img src={recipe.image} alt={recipe.name} loading="lazy"
                   onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23FFF3ED" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="%23FF6B35" font-size="50">🍳</text></svg>'; }} />
              <div className="recipe-info">
                <h3>{recipe.name}</h3>
                <p>{recipe.time} | {(recipe.tags || []).join(' | ')}</p>
              </div>
              <button className="favorite-btn active"
                      onClick={(e) => removeFavorite(recipe._id, e)}>♥</button>
            </div>
          ))}
        </div>
      )}            <Footer />
      <BottomNav />
</div>
  );
};

export default FavoritesScreen;
