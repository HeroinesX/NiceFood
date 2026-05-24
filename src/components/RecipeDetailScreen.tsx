import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './RecipeDetailScreen.css';
import BottomNav from './BottomNav';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Ingredient {
  name: string;
  amount: string;
  adjustedAmount?: string;
}

interface Nutrition {
  calories: string; protein: string; carbs: string; fat: string;
}

interface Recipe {
  _id: string; name: string; image: string; time: string;
  tags: string[]; servings: number; rating: number; ratingCount: number;
  ingredients: Ingredient[]; steps: string[];
  nutrition: Nutrition; equipment: string[]; difficulty: string;
  tips?: { beginner?: string; seasoning?: string; substitute?: string; storage?: string };
}

const difficultyEmoji: Record<string, string> = { '简单': '😊', '中等': '💪', '困难': '🔥' };
const equipIcons: Record<string, string> = {
  '炒锅': '🍳', '平底锅': '🍳', '汤锅': '🍲', '炖锅': '🫕',
  '蒸锅': '🧆', '油炸锅': '🫕', '砂锅': '🍯', '拌碗': '🥣',
  '烤箱': '🔥', '电饭煲': '🍚'
};

const RecipeDetailScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps' | 'nutrition'>('ingredients');
  const [isFavorite, setIsFavorite] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [related, setRelated] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [peopleCount, setPeopleCount] = useState(2);
  const [showShare, setShowShare] = useState(false);
  const [shareText, setShareText] = useState('');
  const [shareRating, setShareRating] = useState(0);
  const [shareImage, setShareImage] = useState('');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shares, setShares] = useState<any[]>([]);

  const fetchRecipe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/recipes/${id}`);
      if (!res.ok) throw new Error('菜谱不存在');
      setRecipe(await res.json());
    } catch (err) { console.error('加载失败:', err); }
    finally { setLoading(false); }
  }, [id]);

  const fetchRelated = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/recipes/${id}/related`);
      if (res.ok) setRelated(await res.json());
    } catch {}
  }, [id]);

  const checkFavorite = useCallback(async () => {
    const token = localStorage.getItem('token'); if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/favorites/${id}/check`,
        { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setIsFavorite((await res.json()).isFavorited);
    } catch {}
  }, [id]);

  const fetchShares = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/shares/${id}`);
      if (res.ok) setShares(await res.json());
    } catch {}
  }, [id]);

  useEffect(() => {
    fetchRecipe(); fetchRelated(); checkFavorite(); fetchShares();
    setActiveTab('ingredients'); setPeopleCount(2);
  }, [fetchRecipe, fetchRelated, checkFavorite, fetchShares]);

  const toggleFavorite = async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_BASE}/favorites/${id}`, {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setIsFavorite(!isFavorite);
    } catch { setIsFavorite(!isFavorite); }
  };

  const handleShare = async () => {
    const token = localStorage.getItem('token');
    if (!token) { alert('请先登录再分享'); navigate('/auth'); return; }
    setShareSubmitting(true);
    try {
      await fetch(`${API_BASE}/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ recipeId: id, recipeName: recipe?.name || '', image: shareImage, text: shareText, rating: shareRating })
      });
      setShareText(''); setShareRating(0); setShareImage(''); setShowShare(false);
      fetchShares();
    } catch { alert('分享失败'); }
    finally { setShareSubmitting(false); }
  };

  const getAdjustedIngredients = (): Ingredient[] => {
    if (!recipe?.ingredients) return [];
    const base = recipe.servings || 2;
    if (peopleCount === base) return recipe.ingredients;
    return recipe.ingredients.map(ing => {
      const m = ing.amount?.match(/^([\d.]+)\s*(.*)$/);
      if (!m) return ing;
      const num = parseFloat(m[1]) * peopleCount / base;
      return { ...ing, adjustedAmount: `${num < 1 ? num.toFixed(1) : Math.round(num * 2) / 2}${m[2]}` };
    });
  };

  if (loading) return <div className="recipe-detail-container"><div className="loading">加载中...</div></div>;
  if (!recipe) return <div className="recipe-detail-container"><div className="empty-state"><p>😅 菜谱找不到了</p><button onClick={() => navigate('/')}>返回首页</button></div></div>;

  return (
    <div className="recipe-detail-container">
      {/* 顶部 */}
      <div className="recipe-header">
        <button onClick={() => navigate(-1)}>&lt; 返回</button>
        <h2>{recipe.name}</h2>
        <div style={{display:'flex',gap:4}}>
          <button onClick={toggleFavorite} className={`favorite-btn ${isFavorite ? 'active' : ''}`}>
            {isFavorite ? '♥' : '♡'}
          </button>
          <button onClick={() => setShowShare(!showShare)}>📷</button>
        </div>
      </div>

      {/* 主图 */}
      <div className="recipe-image-container">
        <img src={recipe.image} alt={recipe.name} loading="lazy"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = 'https://placehold.co/400x300/FFF3ED/FF6B35?text=🍳'+encodeURIComponent(recipe.name); }} />
      </div>

      {/* 概览栏 */}
      <div className="recipe-overview">
        <div className="overview-item"><span>⏱️</span><span>{recipe.time}</span></div>
        <div className="overview-item"><span>{difficultyEmoji[recipe.difficulty] || '👨‍🍳'}</span><span>{recipe.difficulty || '中等'}</span></div>
        <div className="overview-item">
          <span>⭐</span>
          <span className="rating-display">{recipe.rating || '-'} {recipe.ratingCount > 0 && <small>({recipe.ratingCount}评)</small>}</span>
        </div>
        <div className="overview-item people-adjust">
          <span>🍽️</span>
          <div className="people-stepper">
            <button onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}>−</button>
            <span>{peopleCount}人份</span>
            <button onClick={() => setPeopleCount(peopleCount + 1)}>+</button>
          </div>
        </div>
      </div>

      {/* 厨具标签 */}
      {recipe.equipment?.length > 0 && (
        <div className="recipe-tags equipment-tags">
          <span className="tag-label">🔧 厨具:</span>
          {recipe.equipment.map(eq => (
            <span key={eq} className="tag eq-tag">{equipIcons[eq] || '🔧'} {eq}</span>
          ))}
        </div>
      )}

      {/* 口味标签 */}
      <div className="recipe-tags">
        {recipe.tags?.map(tag => (
          <span key={tag} className="tag" onClick={() => navigate(`/recipes?tag=${tag}`)}>{tag}</span>
        ))}
      </div>

      {/* 分享浮层 */}
      {showShare && (
        <div className="share-panel">
          <h4>📷 交作业</h4>

          {/* 上传成品图 */}
          <div style={{marginBottom:'var(--space-sm)'}}>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'var(--color-primary)',fontWeight:600}}>
              <input type="file" accept="image/jpeg,image/png,image/gif" style={{display:'none'}}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 20*1024*1024) { alert('图片不能超过20MB'); return; }
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      const token = localStorage.getItem('token');
                      if (!token) { alert('请先登录'); return; }
                      const res = await fetch(API_BASE+'/upload', {
                        method:'POST',
                        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
                        body:JSON.stringify({image:reader.result,type:'post'})
                      });
                      if (!res.ok) { const t=await res.text(); try{alert(JSON.parse(t).error)}catch{alert(t||"上传失败")} return }
                      const data = await res.json();
                      setShareImage(data.url);
                    } catch { alert("上传失败"); }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              📷 添加成品照片
            </label>
            {shareImage && (
              <div style={{position:'relative',display:'inline-block',marginTop:8}}>
                <img src={shareImage} alt="" style={{height:120,borderRadius:8,objectFit:'cover'}} />
                <button onClick={()=>setShareImage('')} style={{position:'absolute',top:4,right:4,width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.5)',color:'white',border:'none',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>
            )}
          </div>

          <div className="rating-widget">
            <span>评分: </span>
            {[1,2,3,4,5].map(n => (
              <span key={n} className={n <= shareRating ? 'star filled' : 'star'}
                    onClick={() => setShareRating(n)}>★</span>
            ))}
          </div>
          <textarea placeholder="分享你的烹饪心得..." value={shareText}
            onChange={e => setShareText(e.target.value)} rows={3} />
          <div className="share-actions">
            <button className="share-cancel" onClick={() => setShowShare(false)}>取消</button>
            <button className="share-submit" onClick={handleShare} disabled={shareSubmitting}>
              {shareSubmitting ? '发布中...' : '发布'}
            </button>
          </div>
          {shares.length > 0 && (
            <div className="shares-list">
              <h5>其他用户的分享 ({shares.length})</h5>
              {shares.slice(0, 5).map((s, i) => (
                <div key={i} className="share-item">
                  <strong>{s.username}</strong>: {s.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 切换 */}
      <div className="tab-switcher">
        {(['ingredients', 'steps', 'nutrition'] as const).map(tab => (
          <button key={tab} className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}>
            {{ ingredients: '食材', steps: '步骤', nutrition: '营养' }[tab]}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="tab-content">
        {activeTab === 'ingredients' && (
          <div className="ingredients-list">
            {getAdjustedIngredients().map((item: any, i: number) => (
              <div key={i} className="ingredient-item">
                <span>{item.name}</span>
                <span className={item.adjustedAmount ? 'adjusted' : ''}>
                  {item.adjustedAmount || item.amount}
                  {item.adjustedAmount && <small> (原{item.amount})</small>}
                </span>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'steps' && (
          <div className="steps-list">
            {recipe.steps?.map((step: string, i: number) => (
              <div key={i} className="step-item">
                <span className="step-number">{i + 1}</span>
                <span className="step-text">{step}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'nutrition' && (
          <div className="nutrition-info">
            {[['热量', recipe.nutrition?.calories], ['蛋白质', recipe.nutrition?.protein],
              ['碳水', recipe.nutrition?.carbs], ['脂肪', recipe.nutrition?.fat]].map(([k, v]) => (
              <div key={k} className="nutrition-item"><span>{k}</span><span>{v || '-'}</span></div>
            ))}
          </div>
        )}
      </div>

      {/* 烹饪技巧 */}
      {recipe.tips && (recipe.tips.beginner || recipe.tips.seasoning || recipe.tips.substitute || recipe.tips.storage) && (
        <div className="tips-section">
          <h3>💡 烹饪技巧</h3>
          <div className="tips-grid">
            {recipe.tips.beginner && <div className="tip-card"><span className="tip-icon">👶</span><div className="tip-content"><strong>新手注意</strong><p>{recipe.tips.beginner}</p></div></div>}
            {recipe.tips.seasoning && <div className="tip-card"><span className="tip-icon">🧂</span><div className="tip-content"><strong>调味技巧</strong><p>{recipe.tips.seasoning}</p></div></div>}
            {recipe.tips.substitute && <div className="tip-card"><span className="tip-icon">🔄</span><div className="tip-content"><strong>替换建议</strong><p>{recipe.tips.substitute}</p></div></div>}
            {recipe.tips.storage && <div className="tip-card"><span className="tip-icon">📦</span><div className="tip-content"><strong>保存方法</strong><p>{recipe.tips.storage}</p></div></div>}
          </div>
        </div>
      )}

      {/* 关联菜谱 */}
      {related.length > 0 && (
        <div className="related-section">
          <h3>🔗 用相同食材还可以做</h3>
          <div className="related-scroll">
            {related.map(r => (
              <div key={r._id} className="related-card" onClick={() => navigate(`/recipes/${r._id}`)}>
                <img src={r.image} alt={r.name} loading="lazy" onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = 'https://placehold.co/200x150/FFF3ED/FF6B35?text=🍳'; }} />
                <div className="related-info">
                  <h4>{r.name}</h4>
                  <p>{r.time} · {r.difficulty || '中等'}</p>
                  <p className="shared-tags">共用: {(r as any).sharedIngredients?.join('、') || ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 底部导航 */}      <BottomNav />
</div>
  );
};

export default RecipeDetailScreen;
