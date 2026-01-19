const CACHE_NAME = 'book-store';
const ASSETS = [
  './',
  './index.html',
  './index.js',
  './manifest.json'
];

// تثبيت التطبيق وتخزين الملفات
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// جلب الملفات من الكاش أو الشبكة
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});