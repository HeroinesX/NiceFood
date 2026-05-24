import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthScreen.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ── 密码强度检测 ──
const getPasswordStrength = (pw) => {
  if (!pw) return { label: '', level: 0, color: '' };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 1) return { label: '弱', level: 1, color: '#E53935' };
  if (score <= 3) return { label: '中', level: 2, color: '#F5A623' };
  return { label: '强', level: 3, color: '#4CAF50' };
};

const AuthScreen = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 如果已登录，自动跳首页
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/');
    }
  }, [navigate]);

  const pwStrength = isLogin ? null : getPasswordStrength(password);

  // ── 表单校验 ──
  const validate = () => {
    if (username.length < 2) return '用户名至少需要2个字符';
    if (password.length < 6) return '密码至少需要6个字符';
    if (!isLogin && password !== confirmPw) return '两次密码输入不一致';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const v = validate();
    if (v) { setError(v); return; }

    setSubmitting(true);
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName: isLogin ? undefined : (registerName || username) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      if (isLogin) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        navigate('/');
      } else {
        setIsLogin(true);
        setError('注册成功，请登录 🎉');
        setConfirmPw('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setConfirmPw('');
  };

  const isFormValid = username.length >= 2 && password.length >= 6 && (isLogin || password === confirmPw);

  return (
    <div className="auth-page">
      <button className="auth-back" onClick={() => navigate(-1)}>← 返回</button>

      <div className="auth-container">
        {/* 品牌头部 */}
        <div className="auth-brand">
          <span className="auth-logo">🍳</span>
          <h1>优餐</h1>
          <p className="auth-tagline">
            {isLogin ? '欢迎回来' : '加入优餐，发现美食的乐趣'}
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="auth-tabs">
          <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => isLogin || switchMode()}>
            登录
          </button>
          <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => !isLogin || switchMode()}>
            注册
          </button>
        </div>

        {/* 消息提示 */}
        {error && (
          <div className={`auth-message ${error.includes('🎉') ? 'success' : 'error'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* 用户名 */}
          <div className="auth-field">
            <label htmlFor="username">👤 用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isLogin ? '输入用户名' : '起个名字 (至少2个字符)'}
              autoFocus
              autoComplete="username"
              maxLength={20}
            />
            {username.length > 0 && username.length < 2 && (
              <span className="field-hint error">太短了，至少2个字符</span>
            )}
          </div>

          {/* 密码 */}
          <div className="auth-field">
            <label htmlFor="password">🔒 密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? '输入密码' : '至少6位密码'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              maxLength={50}
            />
            {/* 密码强度指示器（仅注册） */}
            {!isLogin && password.length > 0 && (
              <div className="pw-strength">
                <div className="pw-strength-bar">
                  <div
                    className="pw-strength-fill"
                    style={{
                      width: `${(pwStrength.level / 3) * 100}%`,
                      background: pwStrength.color,
                    }}
                  />
                </div>
                <span style={{ color: pwStrength.color }}>{pwStrength.label}</span>
              </div>
            )}
            {password.length > 0 && password.length < 6 && (
              <span className="field-hint error">至少需要6个字符</span>
            )}
          </div>

          {/* 确认密码（仅注册） */}
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="confirmPw">🔒 确认密码</label>
              <input
                id="confirmPw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
                maxLength={50}
              />
              {confirmPw.length > 0 && password !== confirmPw && (
                <span className="field-hint error">两次密码不一致</span>
              )}
              {confirmPw.length > 0 && password === confirmPw && (
                <span className="field-hint" style={{ color: 'var(--color-accent-green)' }}>✅ 密码一致</span>
              )}
            </div>
          )}

          {/* 显示名称（仅注册） */}
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="registerName">📝 显示名称</label>
              <input
                id="registerName"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="别人会看到的名字（可选）"
                maxLength={20}
              />
              <span className="field-hint" style={{ color: 'var(--color-text-light)' }}>不填则显示为用户名</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting || (!isFormValid && !isLogin)}
          >
            {submitting ? (
              <span className="btn-loading">
                <span className="btn-spinner" />
                {isLogin ? '登录中...' : '注册中...'}
              </span>
            ) : (
              isLogin ? '登录' : '注册'
            )}
          </button>
        </form>

        {/* 切换 */}
        <p className="auth-switch">
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button className="auth-switch-btn" onClick={switchMode}>
            {isLogin ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
