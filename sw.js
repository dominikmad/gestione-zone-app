const APP_CACHE = 'zone-app-v4';
const VOSK_CACHE = 'vosk-cache-v1';

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
                    if (cacheName !== APP_CACHE && cacheName !== VOSK_CACHE) {
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

    // SE STIAMO CERCANDO RISORSE VOSK (Il Motore JS o il Modello ZIP)
    if (requestUrl.includes('vosk.js') || requestUrl.includes('vosk-model-small-it') || requestUrl.endsWith('.zip')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Se c'è in cache (inserito dalla barra di installazione), restituiscilo!
                if (response) {
                    console.log('[SW] Risorsa Vosk caricata DALLA CACHE:', requestUrl);
                    return response;
                }
                // Altrimenti lascialo passare su internet normale
                console.log('[SW] Risorsa Vosk non in cache, procedo con rete:', requestUrl);
                return fetch(event.request);
            })
        );
        return;
    }

    // COMPORTAMENTO STANDARD PER TUTTI GLI ALTRI FILE (Il Guscio HTML)
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
