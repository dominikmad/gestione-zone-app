const APP_CACHE = 'zone-app-v3';
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

    // SE STIAMO SCARICANDO RISORSE VOSK (Il Motore JS o il Modello ZIP)
    if (requestUrl.includes('vosk.js') || requestUrl.includes('vosk-model-small-it') || requestUrl.endsWith('.zip') || requestUrl.endsWith('.tar.gz')) {
        event.respondWith(
            caches.open(VOSK_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    // 1. Se la risorsa è già nella memoria del telefono, usala immediatamente!
                    if (response) {
                        console.log('[SW] Risorsa Vosk caricata dalla CACHE OFFLINE:', requestUrl);
                        return response;
                    }
                    // 2. Altrimenti, scaricala da internet e poi salvala per sempre nella cache
                    console.log('[SW] Download risorsa Vosk in corso... (solo la prima volta):', requestUrl);
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(err => {
                        console.error('[SW] Impossibile scaricare la risorsa Vosk. Sei offline e non è in cache.', err);
                        throw err;
                    });
                });
            })
        );
        return;
    }

    // COMPORTAMENTO STANDARD PER TUTTI GLI ALTRI FILE (Il Guscio HTML)
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchRes) => {
                // Aggiorna dinamicamente la cache base
                return caches.open(APP_CACHE).then((cache) => {
                    // Non cachiamo le chiamate API di Google Script (POST, ecc.)
                    if (event.request.method === 'GET' && requestUrl.startsWith('http')) {
                        cache.put(event.request, fetchRes.clone());
                    }
                    return fetchRes;
                });
            });
        }).catch(() => {
            // Fallback se manca rete e il file non è in cache
            return new Response('Sei offline e la risorsa non è in cache.');
        })
    );
});
