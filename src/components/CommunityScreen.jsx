import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CommunityScreen.css';
import BottomNav from './BottomNav';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const CommunityScreen = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // 发帖状态
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState('');
  const [postUploading, setPostUploading] = useState(false);
  const [postRecipeId, setPostRecipeId] = useState('');
  const [postRecipeName, setPostRecipeName] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeResults, setRecipeResults] = useState([]);
  const [showRecipeSearch, setShowRecipeSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadPosts(1, true); }, []);

  const loadPosts = async (p, reset) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/community/posts?page=${p}&limit=15`);
      const data = await res.json();
      if (reset) setPosts(data.posts);
      else setPosts(prev => [...prev, ...data.posts]);
      setHasMore(data.hasMore);
      setPage(p);
    } catch {} finally { setLoading(false); }
  };

  const loadMore = () => { if (hasMore && !loading) loadPosts(page + 1, false); };

  const formatDate = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<span key={i} className={i <= rating ? 'star filled' : 'star'}>★</span>);
    }
    return stars;
  };

  // ── 图片上传 ──
  const handleImageUpload = async (file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('图片不能超过20MB'); return; }
    setPostUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { alert('请先登录'); setPostUploading(false); return; }
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ image: reader.result, type: 'post' })
        });
        if (!res.ok) { const t = await res.text(); try { alert(JSON.parse(t).error); } catch { alert(t); } return; }
        setPostImage((await res.json()).url);
      } catch (err) { alert(err.message); }
      finally { setPostUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  // ── 菜谱搜索 ──
  const searchRecipes = async (q) => {
    if (!q.trim()) { setRecipeResults([]); return; }
    try {
      const res = await fetch(`${API_BASE}/recipes?search=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setRecipeResults(data.recipes || []);
    } catch {}
  };

  // ── 提交帖子 ──
  const handleSubmit = async () => {
    if (!postText.trim() && !postImage) { alert('写点什么或者传张图吧'); return; }
    const token = localStorage.getItem('token');
    if (!token) { alert('请先登录'); return; }
    setSubmitting(true);
    try {
      const body = {
        text: postText,
        image: postImage,
        recipeId: postRecipeId || undefined,
        recipeName: postRecipeName || undefined
      };
      const res = await fetch(`${API_BASE}/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('发布失败');
      // 重置状态 & 刷新帖子
      setPostText(''); setPostImage(''); setPostRecipeId(''); setPostRecipeName('');
      setShowPostEditor(false); setShowRecipeSearch(false);
      loadPosts(1, true);
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const handlePostClick = async (post) => {
    if (post.recipeId && post.type !== 'post') {
      // 先检查菜谱是否存在
      try {
        const res = await fetch(`${API_BASE}/recipes/${post.recipeId}`);
        if (res.ok) {
          navigate(`/recipes/${post.recipeId}`);
          return;
        }
      } catch {}
      // 菜谱已不存在 → 不跳转
      alert('该食谱已更新或删除，无法打开');
    }
  };

  const token = localStorage.getItem('token');

  return (
    <div className="community-container">
      <div className="community-header">
        <h2>📱 美食社区</h2>
        {token && (
          <button className="new-post-btn" onClick={() => setShowPostEditor(!showPostEditor)}>
            ✏️ {showPostEditor ? '取消' : '发帖'}
          </button>
        )}
      </div>

      {/* ──── 发帖编辑器 ──── */}
      {showPostEditor && (
        <div className="post-editor-card">
          <textarea
            placeholder="分享你的美食心得..."
            value={postText}
            onChange={e => setPostText(e.target.value)}
            rows={4}
          />

          {/* 图片上传 */}
          <div className="post-editor-actions">
            <label className="upload-btn">
              <input type="file" accept="image/*" style={{display:'none'}}
                onChange={e => handleImageUpload(e.target.files?.[0])} />
              📷 配图
            </label>

            {/* 关联菜谱 */}
            <button className="upload-btn" onClick={() => setShowRecipeSearch(!showRecipeSearch)}>
              📖 {postRecipeName ? `已关联: ${postRecipeName}` : '关联菜谱'}
            </button>

            {postImage && <span className="upload-status">✅ 已传图</span>}
            {postUploading && <span className="upload-status">⏳ 上传中...</span>}
          </div>

          {/* 菜谱搜索 */}
          {showRecipeSearch && (
            <div className="recipe-search-box">
              <input
                type="text"
                placeholder="搜索菜谱名称..."
                value={recipeSearch}
                onChange={e => { setRecipeSearch(e.target.value); searchRecipes(e.target.value); }}
              />
              {postRecipeName && (
                <div className="selected-recipe-tag">
                  📖 {postRecipeName}
                  <button onClick={() => { setPostRecipeId(''); setPostRecipeName(''); }}>✕</button>
                </div>
              )}
              <div className="recipe-search-results">
                {recipeResults.slice(0, 5).map(r => (
                  <div key={r._id} className="recipe-search-item"
                       onClick={() => { setPostRecipeId(r._id); setPostRecipeName(r.name); setShowRecipeSearch(false); setRecipeSearch(''); }}>
                    <img src={r.image} alt="" onError={e => e.currentTarget.style.display='none'} />
                    <span>{r.name}</span>
                  </div>
                ))}
                {recipeSearch && recipeResults.length === 0 && (
                  <p className="no-result">没有找到匹配菜谱</p>
                )}
              </div>
            </div>
          )}

          <button className="post-submit-btn" onClick={handleSubmit} disabled={submitting || postUploading}>
            {submitting ? '发布中...' : '🚀 发布'}
          </button>
        </div>
      )}

      {/* ──── Tab ──── */}
      <div className="community-tabs">
        {[
          { key: 'all', label: '全部' },
          { key: 'rated', label: '高分' },
        ].map(t => (
          <button key={t.key} className={activeTab === t.key ? 'active' : ''}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ──── 帖子列表 ──── */}
      <div className="posts-list">
        {posts.length === 0 && !loading && (
          <div className="empty-state">
            <p>🍳 还没有人分享作品</p>
            <p className="hint">快来找个菜谱做做，来交作业吧！</p>
            <button onClick={() => navigate('/')}>去首页推荐</button>
          </div>
        )}

        {posts
          .filter(p => activeTab === 'all' || (activeTab === 'rated' && p.rating >= 4))
          .map(post => (
            <div key={post._id} className="post-card"
                 onClick={() => handlePostClick(post)}
                 style={{ cursor: (post.recipeId && post.type !== 'post') ? 'pointer' : 'default' }}>
              <div className="post-header">
                <div className="post-user">
                  <div className="post-avatar">
                    {post.avatar?.startsWith('/images/') ? (
                      <img src={post.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
                    ) : (
                      (post.displayName || post.username)?.[0]?.toUpperCase() || '👤'
                    )}
                  </div>
                  <div>
                    <div className="post-username">
                      {post.displayName || post.username}
                      <span className="user-level">{post.level || '新手厨师'}</span>
                    </div>
                    <div className="post-time">{formatDate(post.createdAt)}</div>
                  </div>
                </div>
                {post.rating > 0 && (
                  <div className="post-rating">{renderStars(post.rating)}</div>
                )}
              </div>

              <div className="post-body">
                {post.text && <p className="post-text">{post.text}</p>}
                {post.image && (
                  <img src={post.image} alt="" className="post-image"
                       loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                )}
              </div>

              {/* 关联菜谱标签 - 仅当有recipeId时显示 */}
              {post.recipeName && (
                <div className="post-recipe-badge">
                  📖 食谱: {post.recipeName}
                </div>
              )}
              {!post.recipeName && post.type === 'post' && (
                <div className="post-recipe-badge" style={{background:'#F0FFF0',color:'#388E3C'}}>
                  💬 自由讨论
                </div>
              )}
            </div>
          ))}

        {hasMore && (
          <button className="load-more-btn" onClick={loadMore} disabled={loading}>
            {loading ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>      <BottomNav />
</div>
  );
};

export default CommunityScreen;
