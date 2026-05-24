import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfileScreen.css';
import BottomNav from './BottomNav';
import Footer from './Footer';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SubmitRecipeScreen = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [form, setForm] = useState({
    name: '', time: '30分钟', tags: '', servings: 2, difficulty: '中等',
    ingredients: '', steps: '', image: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert('请输入菜名');
    if (!form.ingredients.trim()) return alert('请输入食材');
    if (!form.steps.trim()) return alert('请输入步骤');

    const ingredients = form.ingredients.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(/\s+/);
      return { name: parts.slice(0, -1).join(' ') || parts[0], amount: parts[parts.length - 1] || '适量' };
    });
    const steps = form.steps.split('\n').filter(Boolean).map(s => s.trim());

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/recipes/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name, time: form.time, tags: form.tags.split(/[,，]/).filter(Boolean).map(t => t.trim()),
          servings: form.servings, difficulty: form.difficulty,
          ingredients, steps, image: form.image || undefined
        })
      });
      if (res.ok) { setSuccess(true); }
      else { alert('提交失败: ' + (await res.json()).error); }
    } catch (err) { alert('网络错误'); }
    finally { setSubmitting(false); }
  };

  if (!token) return (
    <div className="profile-container">
      <div className="empty-state"><p>🔒 请先登录</p><button onClick={() => navigate('/auth')}>去登录</button></div>            <Footer />
      <BottomNav />
</div>
  );

  if (success) return (
    <div className="profile-container">
      <div style={{padding:'60px 20px',textAlign:'center'}}>
        <h2>✅ 投稿已提交！</h2>
        <p style={{color:'var(--color-text-secondary)'}}>管理员审核通过后即可在菜谱中看到</p>
        <button onClick={() => navigate('/profile')} style={{marginTop:20,padding:'10px 30px',background:'var(--color-primary)',color:'white',border:'none',borderRadius:'20px',fontSize:15,cursor:'pointer',fontWeight:600}}>返回个人中心</button>
      </div>
    </div>
  );

  return (
    <div className="profile-container">
      <div style={{padding:'var(--space-md)',maxWidth:600,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <button onClick={()=>navigate(-1)} style={{background:'none',border:'none',color:'var(--color-primary)',cursor:'pointer',fontSize:15}}>&lt; 返回</button>
          <h2 style={{margin:0,fontSize:18}}>📝 投稿菜谱</h2>
          <div></div>
        </div>

        <div className="edit-section">
          <label>菜名 *</label>
          <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="如: 手撕包菜" />

          <label>烹饪时间</label>
          <input value={form.time} onChange={e => update('time', e.target.value)} placeholder="如: 20分钟" />

          <label>标签 (逗号分隔)</label>
          <input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="如: 快手, 下饭, 家常" />

          <label>难度</label>
          <select value={form.difficulty} onChange={e => update('difficulty', e.target.value)} style={{width:'100%',padding:10,border:'2px solid var(--color-border)',borderRadius:8,fontSize:14,marginBottom:16}}>
            <option>简单</option><option>中等</option><option>困难</option>
          </select>

          <label>几人份</label>
          <input type="number" value={form.servings} onChange={e => update('servings', parseInt(e.target.value))} min={1} max={10} />

          <label>图片URL (可选)</label>
          <input value={form.image} onChange={e => update('image', e.target.value)} placeholder="https://..." />

          <label>食材清单 * (每行一个, 格式: 食材名 用量)</label>
          <textarea value={form.ingredients} onChange={e => update('ingredients', e.target.value)}
            placeholder={"鸡蛋 3个\n番茄 2个\n盐 1/2茶匙"} rows={6}
            style={{width:'100%',padding:10,border:'2px solid var(--color-border)',borderRadius:8,fontSize:14,resize:'vertical',fontFamily:'var(--font-family)',marginBottom:16}} />

          <label>烹饪步骤 * (每行一步)</label>
          <textarea value={form.steps} onChange={e => update('steps', e.target.value)}
            placeholder={"1. 鸡蛋打散\n2. 热锅加油\n3. 倒入蛋液翻炒"} rows={8}
            style={{width:'100%',padding:10,border:'2px solid var(--color-border)',borderRadius:8,fontSize:14,resize:'vertical',fontFamily:'var(--font-family)',marginBottom:16}} />

          <button className="save-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交审核'}
          </button>
        </div>
      </div>            <Footer />
      <BottomNav />
</div>
  );
};

export default SubmitRecipeScreen;
