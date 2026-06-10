// 앱 셸 캐시 서비스워커 — index.html의 ?v= 버전과 함께 올린다.
const CACHE_VERSION = '20260610-2';
const CACHE_NAME = `timeline-app-${CACHE_VERSION}`;
const PRECACHE_URLS = [
    './',
    './index.html',
    `./styles.css?v=${CACHE_VERSION}`,
    `./app.js?v=${CACHE_VERSION}`,
    './manifest.json',
    './icon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // 페이지 이동은 네트워크 우선 — 새 버전 배포가 바로 반영되고,
    // 오프라인일 때만 캐시된 셸로 폴백한다.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
        );
        return;
    }

    // 정적 자산은 ?v= 버전이 붙어 있어 캐시 우선이 안전하다.
    event.respondWith(
        caches.match(request).then(hit => hit || fetch(request).then(response => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            }
            return response;
        }))
    );
});
