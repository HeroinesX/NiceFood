import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomeScreen.css';
import { FiClock, FiStar } from 'react-icons/fi';
import { GiMeal, GiFastNoodles, GiChickenOven } from 'react-icons/gi';
import debounce from 'lodash.debounce';
import BottomNav from './BottomNav';
import Footer from './Footer';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const HomeScreen = () => {
  const navigate = useNavigate();
  const [peopleCount, setPeopleCount] = useState(2);
  const [ingredients, setIngredients] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [cookingTime, setCookingTime] = useState(30);
  const [isRecommending, setIsRecommending] = useState(false);
  const [weeklyTrending, setWeeklyTrending] = useState([]);
  const ingredientsRef = useRef(null);

  const commonIngredients = [
    '鸡蛋', '番茄', '土豆', '牛肉', '鸡肉',
    '猪肉', '鱼', '虾', '米饭', '面条',
    '青菜', '胡萝卜', '洋葱', '大蒜', '姜',
    '酱油', '盐', '糖', '醋', '油'
  ];

  const flavors = ['家常', '微辣', '酸甜', '清淡', '浓郁'];

  // ── 加载本周流行 ──
  useEffect(() => {
    fetch(`${API_BASE}/recipes?limit=6`)
      .then(res => res.json())
      .then(data => {
        if (data.recipes?.length > 0) setWeeklyTrending(data.recipes);
      })
      .catch(() => {});
  }, []);

  // ── 点击外部关闭建议 ──
  useEffect(() => {
    const handler = (e) => {
      if (ingredientsRef.current && !ingredientsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── 智能推荐 ──
  const handleRecommend = async () => {
    if (!ingredients.trim()) {
      alert('请先输入你有哪些食材哦~');
      return;
    }
    setIsRecommending(true);
    try {
      const params = new URLSearchParams({
        peopleCount, ingredients, cookingTime, limit: 10,
        flavors: selectedFlavors.join(',')
      });
      const res = await fetch(`${API_BASE}/recommendations?${params}`);
      if (!res.ok) throw new Error('推荐服务暂时不可用');
      const data = await res.json();
      if (data.recommendations.length === 0) {
        alert('没有找到匹配的菜谱，试试换些食材？');
        return;
      }
      sessionStorage.setItem('lastRecommendations', JSON.stringify({
        recommendations: data.recommendations,
        params: { peopleCount, ingredients, flavors: selectedFlavors, cookingTime }
      }));
      navigate('/recipes?from=recommend');
    } catch (err) {
      console.error('推荐失败:', err);
      alert('获取推荐失败：' + err.message);
    } finally {
      setIsRecommending(false);
    }
  };

  // ── 食材自动补全 ──
  const getSuggestions = debounce((value) => {
    if (!value) { setSuggestions([]); return; }
    setSuggestions(commonIngredients.filter(i =>
      i.toLowerCase().includes(value.toLowerCase())
    ));
  }, 300);

  const handleIngredientChange = (e) => {
    setIngredients(e.target.value);
    getSuggestions(e.target.value);
  };

  const selectSuggestion = (item) => {
    setIngredients(item);
    setShowSuggestions(false);
  };

  const handleFlavorClick = (flavor) => {
    setSelectedFlavors(prev =>
      prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]
    );
  };

  return (
    <div className="home-container">
      <header className="app-header">
        <h1>优餐</h1>
        <p>今天想吃点什么？</p>
      </header>

      <div className="input-section">
        <div className="input-group">
          <label>几人用餐？</label>
          <div className="stepper">
            <button onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}>−</button>
            <span>{peopleCount}</span>
            <button onClick={() => setPeopleCount(peopleCount + 1)}>+</button>
          </div>
        </div>

        <div className="input-group">
          <label>我有哪些食材？</label>
          <div className="autocomplete-container" ref={ingredientsRef}>
            <input
              type="text"
              placeholder="输入食材，如：鸡蛋, 番茄..."
              value={ingredients}
              onChange={handleIngredientChange}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((item, i) => (
                  <li key={i} onClick={() => selectSuggestion(item)}>{item}</li>
                ))}
              </ul>
            )}
          </div>
          <button className="add-ingredient-btn">+ 添加食材</button>
        </div>

        <div className="input-group">
          <label>想吃什么口味？</label>
          <div className="flavor-tags">
            {flavors.map(flavor => (
              <button
                key={flavor}
                className={`flavor-tag ${selectedFlavors.includes(flavor) ? 'selected' : ''}`}
                onClick={() => handleFlavorClick(flavor)}
              >{flavor}</button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>期望烹饪时长？</label>
          <div className="slider-container">
            <input type="range" min="10" max="120" step="10"
              value={cookingTime}
              onChange={(e) => setCookingTime(e.target.value)}
            />
            <span>{cookingTime}分钟</span>
          </div>
        </div>

        <button className="cta-button" onClick={handleRecommend} disabled={isRecommending}>
          {isRecommending ? '⏳ 正在分析中...' : '帮我推荐！'}
        </button>
      </div>

      <div className="content-section">
        <h3>本周流行</h3>
        <div className="recipe-scroll">
          {weeklyTrending.length === 0 ? (
            <p className="loading-hint">加载中...</p>
          ) : (
            weeklyTrending.map(recipe => (
              <div key={recipe._id || recipe.id} className="recipe-card"
                   onClick={() => navigate(`/recipes/${recipe._id || recipe.id}`)}>
                <img src={recipe.image} alt={recipe.name} loading="lazy"
                     className="recipe-image"
                     onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150"><rect fill="%23FFF3ED" width="200" height="150"/><text x="100" y="80" text-anchor="middle" fill="%23FF6B35" font-size="40">🍳</text></svg>'; }}
                />
                <div className="recipe-info">
                  <h4>{recipe.name}</h4>
                  <div className="recipe-meta">
                    <span><FiStar /> {recipe.rating || '4.5'}</span>
                    <span><FiClock /> {recipe.time || '30分钟'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <h3>主题分类</h3>
        <div className="category-grid">
          <div className="category-card" onClick={() => navigate('/recipes?tag=快手')}>
            <GiFastNoodles className="category-icon" />
            <h4>快手简餐</h4>
            <p>15分钟搞定</p>
          </div>
          <div className="category-card" onClick={() => navigate('/recipes?tag=养生')}>
            <GiMeal className="category-icon" />
            <h4>减脂优餐</h4>
            <p>营养健康</p>
          </div>
          <div className="category-card" onClick={() => navigate('/recipes?tag=下饭')}>
            <GiChickenOven className="category-icon" />
            <h4>下饭神器</h4>
            <p>米饭杀手</p>
          </div>
        </div>

        <h3>美食圈子</h3>
        <div className="circle-grid">
          <div className="circle-card spring" onClick={() => navigate('/recipes?tag=清淡')}>
            <span className="circle-emoji">🌸</span>
            <h4>时令推荐</h4>
            <p>当季新鲜食材</p>
          </div>
          <div className="circle-card beginner" onClick={() => navigate('/recipes?search=新手')}>
            <span className="circle-emoji">🌟</span>
            <h4>新手友好</h4>
            <p>零失败入门菜</p>
          </div>
          <div className="circle-card party" onClick={() => navigate('/recipes?tag=浓郁')}>
            <span className="circle-emoji">🎉</span>
            <h4>聚会大餐</h4>
            <p>露一手的时刻</p>
          </div>
          <div className="circle-card lazy" onClick={() => navigate('/recipes?tag=凉菜')}>
            <span className="circle-emoji">😴</span>
            <h4>懒人一拌</h4>
            <p>不开火也好吃</p>
          </div>
        </div>
      </div>            <Footer />
      <BottomNav />
</div>
  );
};

export default HomeScreen;
