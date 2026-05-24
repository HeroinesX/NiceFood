import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchScreen.css';
import BottomNav from './BottomNav';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SearchScreen = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popularSearches, setPopularSearches] = useState([]);
  const [ingredientCategories, setIngredientCategories] = useState([]);

  // 加载历史搜索 (localStorage)
  const [historySearches, setHistorySearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('searchHistory') || '[]'); }
    catch { return []; }
  });

  // 初始加载热门词和分类
  useEffect(() => {
    fetch(`${API_BASE}/popular-searches`)
      .then(r => r.json()).then(setPopularSearches).catch(() => {});
    fetch(`${API_BASE}/ingredient-categories`)
      .then(r => r.json()).then(setIngredientCategories).catch(() => {});
  }, []);

  const saveToHistory = (term) => {
    const updated = [term, ...historySearches.filter(s => s !== term)].slice(0, 8);
    setHistorySearches(updated);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
  };

  const doSearch = async (term) => {
    if (!term.trim()) return;
    setSearchText(term);
    saveToHistory(term);
    setSearched(true);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recipes?search=${encodeURIComponent(term)}&limit=30`);
      const data = await res.json();
      setResults(data.recipes || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 回车触发搜索，见 onKeyDown
  const clearHistory = () => {
    setHistorySearches([]);
    localStorage.removeItem('searchHistory');
  };

  return (
    <div className="search-container">
      {/* 搜索栏 */}
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="输入菜名或食材..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch(searchText)}
          />
          {searchText && (
            <button className="clear-btn" onClick={() => { setSearchText(''); setSearched(false); }}>×</button>
          )}
        </div>
        <button className="cancel-btn" onClick={() => navigate(-1)}>取消</button>
      </div>

      <div className="search-content">
        {/* 搜索结果 */}
        {searched ? (
          <>
            <div className="search-section">
              <h3>"{searchText}" 的搜索结果 ({results.length})</h3>
            </div>
            {loading ? (
              <div className="loading">搜索中...</div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <p>😅 没有找到相关菜谱</p>
                <p className="hint">试试其他关键词，比如食材名或菜名</p>
              </div>
            ) : (
              <div className="recipe-list">
                {results.map(recipe => (
                  <div key={recipe._id} className="recipe-card"
                       onClick={() => navigate(`/recipes/${recipe._id}`)}>
                    <img src={recipe.image} alt={recipe.name}
                         onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23FFF3ED" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="%23FF6B35" font-size="50">🍳</text></svg>'; }} />
                    <div className="recipe-info">
                      <h3>{recipe.name}</h3>
                      <p>{recipe.time} | {(recipe.tags || []).join(' | ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* 历史搜索 */}
            {historySearches.length > 0 && (
              <div className="search-section">
                <div className="section-header">
                  <h3>历史搜索</h3>
                  <button className="clear-history-btn" onClick={clearHistory}>清空</button>
                </div>
                <div className="tags-container">
                  {historySearches.map((item, i) => (
                    <span key={i} className="search-tag" onClick={() => doSearch(item)}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 热门搜索 */}
            <div className="search-section">
              <h3>热门搜索</h3>
              <div className="tags-container">
                {(popularSearches.length > 0 ? popularSearches : ['下饭菜', '减脂餐', '家常菜', '快手菜']).map((item, i) => (
                  <span key={i} className="search-tag" onClick={() => doSearch(item)}>{item}</span>
                ))}
              </div>
            </div>

            {/* 食材分类 */}
            <div className="search-section">
              <h3>按食材分类</h3>
              <div className="category-container">
                {(ingredientCategories.length > 0 ? ingredientCategories : [
                  { name: '肉类', icon: '🥩' },
                  { name: '蔬菜', icon: '🥬' },
                  { name: '水产', icon: '🐟' },
                  { name: '蛋奶', icon: '🥚' },
                  { name: '豆制品', icon: '🫘' }
                ]).map((item, i) => (
                  <div key={i} className="category-item"
                       onClick={() => navigate(`/recipes?tag=${item.name}`)}>
                    <div className="category-icon">{item.icon}</div>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>      <BottomNav />
</div>
  );
};

export default SearchScreen;
