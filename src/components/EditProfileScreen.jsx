import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import Footer from './Footer';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const EditProfileScreen = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  // 加载现有资料
  useEffect(() => {
    if (!token) { navigate('/auth'); return; }
    fetch(`${API_BASE}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setDisplayName(data.displayName || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setAvatar(data.avatar || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch(`${API_BASE}/community/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ displayName, bio, location, avatar })
      });
      if (res.ok) {
        setMessage({ text: '✅ 保存成功', type: 'success' });
        setTimeout(() => navigate('/profile'), 1500);
      } else {
        setMessage({ text: '❌ 保存失败，请重试', type: 'error' });
      }
    } catch {
      setMessage({ text: '❌ 网络错误', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!token) return null;
  if (loading) {
    return (
      <div className="profile-container" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* 顶部导航 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px', borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, background: 'var(--color-bg-card)', zIndex: 10
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', fontSize: 16, color: 'var(--color-primary)',
          cursor: 'pointer', padding: '4px 8px', fontWeight: 600
        }}>
          ← 返回
        </button>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, flex: 1 }}>编辑资料</h2>
      </div>

      <div className="profile-tab-content" style={{ paddingTop: 16 }}>
        <div className="edit-section">
          {/* 头像上传 */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div
              onClick={() => document.getElementById('avatar-input')?.click()}
              className="profile-avatar-placeholder"
              style={{
                cursor: 'pointer',
                overflow: 'hidden',
                backgroundImage: avatar ? 'none' : undefined
              }}
            >
              {avatar ? (
                <img src={avatar} alt="头像" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
              ) : (
                <span style={{fontSize:28}}>{localStorage.getItem('username')?.[0]?.toUpperCase() || '👤'}</span>
              )}
            </div>
            <input id="avatar-input" type="file" accept="image/jpeg,image/png,image/gif"
              style={{display:'none'}}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 20*1024*1024) { alert('图片不能超过20MB'); return; }
                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(API_BASE+'/upload', {
                      method:'POST',
                      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
                      body:JSON.stringify({image:reader.result,type:'avatar'})
                    });
                    if (!res.ok) { const txt2=await res.text(); let msg; try{msg=JSON.parse(txt2).error}catch{msg=txt2}; alert(msg||"上传失败"); return; }
                    const data = await res.json();
                    setAvatar(data.url);
                  } catch(err) { alert(err.message); }
                };
                reader.readAsDataURL(file);
              }}
            />
            <p style={{fontSize:11,color:'var(--color-text-light)',margin:'4px 0 0'}}>
              点击上传头像
            </p>
          </div>

          <label>头像（emoji 备选）</label>
          <input
            value={avatar?.startsWith('/images') ? '' : avatar}
            onChange={e => setAvatar(e.target.value)}
            placeholder="或者直接输入 emoji"
            maxLength={100}
          />

          <label>昵称（显示名称）</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="你希望别人怎么称呼你？"
            maxLength={20}
          />

          <label>个人简介</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="介绍一下自己..."
            maxLength={100}
            rows={3}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-light)', marginTop: 2 }}>
            {bio.length}/100
          </div>

          <label>所在地</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="如：上海"
            maxLength={20}
          />

          {message.text && (
            <p style={{
              textAlign: 'center',
              fontSize: 14,
              margin: '12px 0 0',
              color: message.type === 'success' ? 'var(--color-accent-green)' : 'var(--color-accent-red)'
            }}>
              {message.text}
            </p>
          )}

          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </div>            <Footer />
      <BottomNav />
</div>
  );
};

export default EditProfileScreen;
