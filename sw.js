const cacheName = 'nextgenit-v2';
const assets = [
  '/NextGenIT/',
  '/NextGenIT/index.html',
  '/NextGenIT/builder.html',
  '/NextGenIT/guide.html',
  '/NextGenIT/login.html',
  '/NextGenIT/others.html',
  '/NextGenIT/practice.html',
  '/NextGenIT/prompts.html',
  '/NextGenIT/tools.html',
  '/NextGenIT/updates.html',
  '/NextGenIT/shared.css',
  '/NextGenIT/shared.js',
  '/NextGenIT/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});