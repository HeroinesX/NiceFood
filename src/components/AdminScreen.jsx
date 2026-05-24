import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminScreen.css';
import BottomNav from './BottomNav';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const token = () => localStorage.getItem('token');
const h = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

const AdminScreen = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('recipes');
  const [recipes, setRecipes] = useState([]);
  const [edits, setEdits] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t) => {
    setLoading(true);
    try {
      if (t === 'recipes') {
        const r = await fetch(`${API_BASE}/admin/pending-recipes`, { headers: h() });
        setRecipes(await r.json());
      } else if (t === 'edits') {
        const r = await fetch(`${API_BASE}/admin/pending-edits`, { headers: h() });
        setEdits(await r.json());
      } else if (t === 'users') {
        const r = await fetch(`${API_BASE}/admin/users`, { headers: h() });
        setUsers(await r.json());
      }
    } catch {} finally { setLoading(false); }
  };

  const approveRecipe = async (id) => {
    await fetch(`${API_BASE}/admin/recipes/${id}/approve`, { method: 'PUT', headers: h() });
    setRecipes(prev => prev.filter(r => r._id !== id));
  };
  const rejectRecipe = async (id) => {
    await fetch(`${API_BASE}/admin/recipes/${id}/reject`, { method: 'PUT', headers: h() });
    setRecipes(prev => prev.filter(r => r._id !== id));
  };
  const deleteRecipe = async (id) => {
    if (!window.confirm('确定删除这个菜谱？')) return;
    await fetch(`${API_BASE}/admin/recipes/${id}`, { method: 'DELETE', headers: h() });
    setRecipes(prev => prev.filter(r => r._id !== id));
  };

  const approveEdit = async (postId, userId) => {
    await fetch(`${API_BASE}/admin/posts/${postId}/approve-edit`, { method: 'PUT', headers: h() });
    setEdits(prev => prev.filter(e => e.postId !== postId));
  };
  const rejectEdit = async (postId) => {
    await fetch(`${API_BASE}/admin/posts/${postId}/reject-edit`, { method: 'PUT', headers: h() });
    setEdits(prev => prev.filter(e => e.postId !== postId));
  };
  const deletePost = async (postId) => {
    if (!window.confirm('确定删除这个帖子？')) return;
    await fetch(`${API_BASE}/admin/posts/${postId}`, { method: 'DELETE', headers: h() });
    loadTab('edits');
  };

  const toggleRole = async (userId, newRole) => {
    await fetch(`${API_BASE}/admin/users/${userId}/role`, { method: 'PUT', headers: h(), body: JSON.stringify({ role: newRole }) });
    loadTab('users');
  };
  const toggleBan = async (userId, banned) => {
    const ep = banned ? 'unban' : 'ban';
    await fetch(`${API_BASE}/admin/users/${userId}/${ep}`, { method: 'PUT', headers: h() });
    loadTab('users');
  };

  if (!token()) return <div className="admin-container"><div className="empty-state"><p>🔒 请先登录</p><button onClick={() => navigate('/auth')}>去登录</button></div></div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <button onClick={() => navigate(-1)}>&lt; 返回</button>
        <h2>⚙️ 管理后台</h2>
        <div></div>
      </div>

      <div className="admin-tabs">
        {[
          { key: 'recipes', label: `待审菜谱 (${recipes.length})` },
          { key: 'edits', label: `待审编辑 (${edits.length})` },
          { key: 'users', label: `用户管理 (${users.length})` },
        ].map(t => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {loading && <div className="loading">加载中...</div>}

        {tab === 'recipes' && !loading && (
          <div className="admin-list">
            {recipes.length === 0 ? <div className="empty-state"><p>没有待审核的菜谱</p></div> :
              recipes.map(r => (
                <div key={r._id} className="admin-card">
                  <div className="admin-card-body">
                    <h4>{r.name}</h4>
                    <p>{r.time} · {r.difficulty} · {(r.tags||[]).join('/')}</p>
                    <p className="card-meta">投稿者: {r.submittedBy || '匿名'}</p>
                    <div className="card-detail">
                      <strong>食材:</strong> {(r.ingredients||[]).map(i=>i.name).join('、')}<br/>
                      <strong>步骤:</strong> {(r.steps||[]).length} 步
                    </div>
                  </div>
                  <div className="admin-card-actions">
                    <button className="btn-approve" onClick={() => approveRecipe(r._id)}>✅ 通过</button>
                    <button className="btn-reject" onClick={() => rejectRecipe(r._id)}>❌ 驳回</button>
                    <button className="btn-delete" onClick={() => deleteRecipe(r._id)}>🗑️</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === 'edits' && !loading && (
          <div className="admin-list">
            {edits.length === 0 ? <div className="empty-state"><p>没有待审核的编辑</p></div> :
              edits.map(e => (
                <div key={e.postId} className="admin-card">
                  <div className="admin-card-body">
                    <h4>帖子编辑</h4>
                    <p>用户: {e.username}</p>
                    <p>新内容: {e.newText}</p>
                    {e.newRating > 0 && <p>新评分: {'★'.repeat(e.newRating)}</p>}
                  </div>
                  <div className="admin-card-actions">
                    <button className="btn-approve" onClick={() => approveEdit(e.postId, e.userId)}>✅ 通过</button>
                    <button className="btn-reject" onClick={() => rejectEdit(e.postId)}>❌ 驳回</button>
                    <button className="btn-delete" onClick={() => deletePost(e.postId)}>🗑️</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === 'users' && !loading && (
          <div className="admin-list">
            {users.map(u => (
              <div key={u._id} className="admin-card">
                <div className="admin-card-body">
                  <h4>{u.username} <span className={`role-badge ${u.role}`}>{u.role}</span></h4>
                  <p>等级: {u.level} · 收藏: {(u.favorites||[]).length} · 帖子: {(u.shares||[]).length}</p>
                  {u.banned && <p className="banned-tag">🚫 已封禁</p>}
                </div>
                <div className="admin-card-actions">
                  <button className="btn-approve" onClick={() => toggleRole(u._id, u.role === 'admin' ? 'user' : 'admin')}>
                    {u.role === 'admin' ? '⬇ 降级' : '⬆ 升管理'}
                  </button>
                  <button className="btn-reject" onClick={() => toggleBan(u._id, u.banned)}>
                    {u.banned ? '🔓 解封' : '🔒 封禁'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>      <BottomNav />
</div>
  );
};

export default AdminScreen;
