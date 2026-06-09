const CACHE_NAME = 'ecotrack-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/supply-chain.json',
  '/pkg/carbon_engine_bg.wasm',
  '/pkg/carbon_engine.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Cache-First Strategy with Graceful Degradation
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude API calls from caching
  if (
    url.hostname.includes('openrouter.ai') ||
    url.hostname.includes('noaa.gov') ||
    url.hostname.includes('allorigins.win')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      return fetch(event.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    }).catch(() => {
      console.warn("Offline fallback triggered for:", event.request.url);
    })
  );
});
