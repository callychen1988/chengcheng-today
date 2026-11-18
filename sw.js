/* 澄澄的今天 · Service Worker
 *
 * 策略说明：
 * - 页面导航走 network-first，保证每次部署新版本后，打开就是新版；
 *   只有断网时才回退到缓存，所以离线也能用。
 * - 静态资源走 stale-while-revalidate，先秒开缓存、后台静默更新。
 * - 升级时只需要把 CACHE 版本号 +1，旧缓存会在 activate 阶段清掉。
 */
const CACHE = 'chengcheng-v9';

const CORE_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 跨域请求交给浏览器自己处理

  // 页面导航：先网络，断网再回退缓存
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy));
            return response;
          }
          // 线上鉴权失效或服务端异常时，不要让错误页覆盖掉可用的缓存
          return caches.match('./index.html').then(hit => hit || response);
        })
        .catch(() =>
          caches.match('./index.html').then(hit => hit || caches.match('./'))
        )
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
