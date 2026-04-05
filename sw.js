const CACHE_NAME = 'zone-app-v1';

// Quando l'app viene installata, salviamo l'essenziale in memoria
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './',
                './index.html',
                './manifest.json'
            ]);
        })
    );
});

// Quando manca internet, il telefono cerca le risorse nella cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
