/* 优餐 - Service Worker */
const CACHE_NAME = 'youcan-v1';

// 预缓存的关键资源
const PRECACHE_URLS = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
];

// 安装：预缓存资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

// 拦截请求：网络优先，失败时用缓存
self.addEventListener('fetch', event => {
  // 只缓存同源请求
  if (!event.request.url.startsWith(self.location.origin)) return;
  // 跳过 API 请求
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
