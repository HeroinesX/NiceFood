import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * 统一底部导航栏
 * 所有页面共用，保证样式和按钮完全一致！
 */
const NAV_ITEMS = [
  { path: '/',       label: '首页', icon: '🏠' },
  { path: '/search', label: '搜索', icon: '🔍' },
  { path: '/community', label: '社区', icon: '💬' },
  { path: '/favorites', label: '收藏', icon: '❤️' },
  { path: '/profile',   label: '我的', icon: '👤' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <button
            key={item.path}
            className={isActive ? 'active' : ''}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
