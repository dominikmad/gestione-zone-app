const APP_CACHE = 'zone-app-v2';
const MODEL_CACHE = 'vosk-model-cache-v1';

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

// FASE 2: Attivazione (Pulizia vecchie cache)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== APP_CACHE && cacheName !== MODEL_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// FASE 3: Intercettazione di Rete (La Magia Offline)
self.addEventListener('fetch', (event) => {
    const requestUrl = event.request.url;

    // SE STIAMO SCARICANDO IL MODELLO VOSK (Il file .zip)
    if (requestUrl.includes('vosk-model-small-it') || requestUrl.endsWith('.zip') || requestUrl.endsWith('.tar.gz')) {
        event.respondWith(
            caches.open(MODEL_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    // 1. Se il modello è già nella memoria del telefono, usalo immediatamente!
                    if (response) {
                        console.log('[SW] Modello Vosk caricato dalla CACHE OFFLINE!');
                        return response;
                    }
                    // 2. Altrimenti, scaricalo da internet e poi salvalo per sempre nella cache
                    console.log('[SW] Download modello Vosk in corso... (solo la prima volta)');
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // COMPORTAMENTO STANDARD PER TUTTI GLI ALTRI FILE
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(() => {
            // Fallback se manca rete e il file non è in cache
            return new Response('Sei offline e la risorsa non è in cache.');
        })
    );
});
