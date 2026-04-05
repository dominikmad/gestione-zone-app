const APP_CACHE = 'zone-app-v5';

// I file base del nostro Guscio
const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

// FASE 1: Installazione (Salviamo i file base)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// FASE 2: Attivazione (Pulizia vecchie cache per evitare conflitti)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Eliminiamo le vecchie cache, inclusa quella di vosk che si chiamava 'vosk-cache-v1'
                    if (cacheName !== APP_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// FASE 3: Intercettazione di Rete (La Magia Offline base)
self.addEventListener('fetch', (event) => {
    const requestUrl = event.request.url;

    // COMPORTAMENTO STANDARD PER TUTTI I FILE (Il Guscio HTML)
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchRes) => {
                return caches.open(APP_CACHE).then((cache) => {
                    if (event.request.method === 'GET' && requestUrl.startsWith('http')) {
                        cache.put(event.request, fetchRes.clone());
                    }
                    return fetchRes;
                });
            });
        }).catch(() => {
            return new Response('Sei offline e la risorsa non è in cache.');
        })
    );
});
