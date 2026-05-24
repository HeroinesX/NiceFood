import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// 路由切换时自动滚动到顶部
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// 懒加载所有页面组件 — 减小首屏体积
const HomeScreen = lazy(() => import('./components/HomeScreen.jsx'));
const RecipeListScreen = lazy(() => import('./components/RecipeListScreen'));
const RecipeDetailScreen = lazy(() => import('./components/RecipeDetailScreen'));
const SearchScreen = lazy(() => import('./components/SearchScreen'));
const FavoritesScreen = lazy(() => import('./components/FavoritesScreen'));
const CommunityScreen = lazy(() => import('./components/CommunityScreen'));
const SubmitRecipeScreen = lazy(() => import('./components/SubmitRecipeScreen'));
const AdminScreen = lazy(() => import('./components/AdminScreen'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));
const EditProfileScreen = lazy(() => import('./components/EditProfileScreen'));
const AuthScreen = lazy(() => import('./components/AuthScreen'));

// 全局加载骨架
const PageLoader = () => (
  <div className="page-loader">
    <div className="loader-spinner" />
    <p>加载中...</p>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/auth" element={<AuthScreen />} />
            <Route path="/recipes" element={<RecipeListScreen />} />
            <Route path="/recipes/:id" element={<RecipeDetailScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/community" element={<CommunityScreen />} />
            <Route path="/favorites" element={<FavoritesScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/profile/edit" element={<EditProfileScreen />} />
            <Route path="/submit" element={<SubmitRecipeScreen />} />
            <Route path="/admin" element={<AdminScreen />} />
            {/* 404 兜底 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
