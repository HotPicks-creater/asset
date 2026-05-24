// 자산 앱 PWA Service Worker
const CACHE_VERSION = 'asset-app-v6';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // 외부 리소스 (CDN)
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// 설치: 캐시 만들기
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        return Promise.allSettled(
          CACHE_FILES.map((url) => cache.add(url).catch(() => null))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 활성화: 옛날 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 요청 가로채기: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        
        const url = event.request.url;
        const isCacheable = url.startsWith(self.location.origin) 
          || url.includes('cdn.jsdelivr.net')
          || url.includes('cdnjs.cloudflare.com');
        
        if (isCacheable) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
