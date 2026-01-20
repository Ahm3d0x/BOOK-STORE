const CACHE_NAME = 'book-store-v6';
const ASSETS = [
  './',
  './index.html',
  './index.js',
  './style.css',
  './manifest.json'
];

// تثبيت التطبيق وتخزين الملفات الجديدة
self.addEventListener('install', (e) => {
  self.skipWaiting(); // 👈 إضافة هامة لتفعيل التحديث فوراً
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// تفعيل السيرفس ووركر وحذف الكاش القديم
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // حذف النسخة القديمة v1
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// جلب الملفات
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});