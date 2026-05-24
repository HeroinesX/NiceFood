import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfileScreen.css';
import BottomNav from './BottomNav';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ── 工具: 从 localStorage 获取登录状态 ──
const getToken = () => localStorage.getItem('token');
const getUsername = () => localStorage.getItem('username');

const ProfileScreen = () => {
  const navigate = useNavigate();
  const token = getToken();

  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [myPosts, setMyPosts] = useState([]);
  const [cooked, setCooked] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── 加载个人资料 ──
  useEffect(() => {
    if (token) loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('会话过期');
      const data = await res.json();
      setProfile(data);
      setFavoritesCount(data.favoritesCount || 0);
    } catch {
      handleLogout();
    }
    // 同时静默加载帖子和做过的菜的数量
    loadMyPosts(true);
    loadCooked(true);
  };

  const loadMyPosts = async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/community/user/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMyPosts((await res.json()).posts || []);
    } catch {} finally { if (!silent) setLoading(false); }
  };

  const loadCooked = async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/community/user/cooked`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCooked(await res.json());
    } catch {} finally { if (!silent) setLoading(false); }
  };

  const handleTab = (t) => {
    setTab(t);
    if (t === 'posts') loadMyPosts();
    if (t === 'cooked') loadCooked();
  };

  // 不再需要 — 编辑资料已拆分到独立页面 /profile/edit

  // ── 帖子操作 ──
  const deleteMyPost = async (postId, e) => {
    e.stopPropagation();
    if (!window.confirm('确定删除这条帖子？')) return;
    try {
      const res = await fetch(`${API_BASE}/community/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMyPosts(prev => prev.filter(p => p._id !== postId));
    } catch { alert('删除失败'); }
  };

  const editMyPost = (post, e) => {
    e.stopPropagation();
    const text = prompt('修改帖子内容:', post.text);
    if (text === null) return;
    fetch(`${API_BASE}/community/posts/${post._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ text, rating: post.rating })
    }).then(() => alert('修改已提交，等待管理员审核')).catch(() => alert('提交失败'));
  };

  // ── 退出登录 ──
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setProfile(null);
    navigate('/');
  };

  // ── 自动跳转登录 ──
  const goToAuth = () => navigate('/auth');

  // ==================== 未登录视图 ====================
  if (!token) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-placeholder">👤</div>
          <h2>未登录</h2>
          <p className="profile-bio">登录后可收藏菜谱、交作业、管理个人资料</p>
        </div>
        <div className="profile-actions">
          <div className="auth-buttons">
            <button className="login-btn" onClick={goToAuth}>登录</button>
            <button className="register-btn" onClick={goToAuth}>注册</button>
          </div>
        </div>      <BottomNav />
</div>
    );
  }

  // ==================== 已登录视图 ====================
  return (
    <div className="profile-container">
      {/* 用户信息头部 */}
      <div className="profile-header">
        <div className="profile-avatar-placeholder">
          {profile?.avatar?.startsWith('/images/') || profile?.avatar?.startsWith('http') ? (
            <img src={profile.avatar} alt="头像" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
          ) : (
            profile?.avatar || getUsername()?.[0]?.toUpperCase() || '👤'
          )}
        </div>
        <h2>{profile?.displayName || profile?.name || getUsername() || '用户'}</h2>
        <span className="profile-level">{profile?.level || '新手厨师'}</span>
        {profile?.location && <p className="profile-location">📍 {profile.location}</p>}
        {profile?.bio && <p className="profile-bio">{profile.bio}</p>}
      </div>

      {/* Tab 切换 */}
      <div className="profile-tabs">
        {[
          { key: 'profile', label: '我的' },
          { key: 'posts', label: `帖子 (${myPosts.length || 0})` },
          { key: 'cooked', label: `做过 (${cooked.length || 0})` },
        ].map(t => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => handleTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="profile-tab-content">
        {/* ─── Tab: 我的 ─── */}
        {tab === 'profile' && (
          <div className="profile-edit">
            {/* 功能菜单 */}
            <div className="profile-menu">
              <div className="menu-item" onClick={() => navigate('/favorites')}>
                <span>❤️ 收藏的菜谱</span>
                <span><span className="menu-badge">{favoritesCount}</span> ›</span>
              </div>
              <div className="menu-item" onClick={() => { handleTab('posts'); }}>
                <span>📝 我的发帖</span>
                <span><span className="menu-badge">{myPosts.length || 0}</span> ›</span>
              </div>
              <div className="menu-item" onClick={() => { handleTab('cooked'); }}>
                <span>🍳 我做过的菜</span>
                <span><span className="menu-badge">{cooked.length || 0}</span> ›</span>
              </div>
              <div className="menu-item" onClick={() => navigate('/submit')}>
                <span>📝 投稿菜谱</span>
                <span>›</span>
              </div>
              {profile?.role === 'admin' && (
                <div className="menu-item" onClick={() => navigate('/admin')}>
                  <span>⚙️ 管理后台</span>
                  <span>›</span>
                </div>
              )}
            </div>

            {/* 编辑资料入口 */}
            <div className="profile-menu">
              <div className="menu-item" onClick={() => navigate('/profile/edit')}>
                <span>✏️ 编辑资料</span>
                <span>›</span>
              </div>
            </div>

            {/* 退出登录 */}
            <button className="logout-btn" onClick={handleLogout}>
              退出登录
            </button>
          </div>
        )}

        {/* ─── Tab: 帖子 ─── */}
        {tab === 'posts' && (
          <div className="posts-list">
            {loading ? (
              <div className="loading">加载中...</div>
            ) : myPosts.length === 0 ? (
              <div className="empty-state">
                <p>📝 还没有发过帖子</p>
                <p className="hint">去菜谱详情页点 📷 交作业，分享你的烹饪成果</p>
                <button onClick={() => navigate('/')}>去首页看看菜谱</button>
              </div>
            ) : (
              myPosts.map(p => (
                <div key={p._id} className="post-card-mini" onClick={() => navigate(`/recipes/${p.recipeId}`)}>
                  <div className="post-meta">
                    <span className="post-recipe">📖 {p.recipeName || '未知菜谱'}</span>
                    {p.rating > 0 && <span className="post-stars">{'★'.repeat(p.rating)}{'☆'.repeat(5 - p.rating)}</span>}
                  </div>
                  {p.text && <p className="post-text">{p.text}</p>}
                  <div className="post-meta" style={{marginBottom:0}}>
                    <span className="post-date">{new Date(p.createdAt).toLocaleDateString('zh-CN')}</span>
                    <div style={{display:'flex',gap:6}}>
                      <button className="post-action-btn" title="编辑" onClick={(e) => editMyPost(p, e)}>✏️</button>
                      <button className="post-action-btn delete" title="删除" onClick={(e) => deleteMyPost(p._id, e)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Tab: 做过的菜 ─── */}
        {tab === 'cooked' && (
          <div className="cooked-list">
            {loading ? (
              <div className="loading">加载中...</div>
            ) : cooked.length === 0 ? (
              <div className="empty-state">
                <p>🍳 还没有做过的菜</p>
                <p className="hint">交作业后会自动出现在这里</p>
                <button onClick={() => navigate('/')}>去看看有什么菜</button>
              </div>
            ) : (
              cooked.map(r => (
                <div key={r._id} className="cooked-card" onClick={() => navigate(`/recipes/${r._id}`)}>
                  <img
                    src={r.image}
                    alt={r.name}
                    loading="lazy"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="cooked-info">
                    <h4>{r.name}</h4>
                    <p>{r.time} · {r.difficulty || '中等'} · ⭐{r.rating || '4.0'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 底部导航 */}      <BottomNav />
</div>
  );
};

export default ProfileScreen;
