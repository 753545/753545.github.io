const CACHE_NAME = 'c2n-app-cache-v2';
const IMAGE_CACHE_NAME = 'c2n-image-cache-v1';

const CORE_ASSETS = [
    './index.html',
    './manifest.json',
    './icon.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== IMAGE_CACHE_NAME) {
                        return caches.delete(cache); // Delete old code caches
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // IMAGES: Cache-First Strategy (Instant load if we have it)
    if (url.hostname === 'image.tmdb.org') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request, { mode: 'no-cors' }).then((response) => {
                    return caches.open(IMAGE_CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
        return;
    }

    // CODE & JSON: Network-First Strategy (Always get latest version if online!)
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // Save the newest version to cache for next time we go offline
            let clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
            });
            return networkResponse;
        }).catch(() => {
            // If offline, fall back to the cache
            return caches.match(event.request);
        })
    );
});