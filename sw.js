const CACHE_NAME = 'c2n-app-cache-v1';
const IMAGE_CACHE_NAME = 'c2n-image-cache-v1';

const CORE_ASSETS = [
    './index.html',
    './manifest.json',
    './icon.png'
];

// 1. Install & Cache Core Files
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
});

// 2. Activate & Clean Up Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// 3. Intercept Network Requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // If requesting a TMDB poster image
    if (url.hostname === 'image.tmdb.org') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse; // Return offline image
                
                // Otherwise fetch it, save it, and return it
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

    // Default strategy: Stale-While-Revalidate for HTML/JS
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            }).catch(() => cachedResponse); // If offline and no cache, fail silently
            
            return cachedResponse || fetchPromise;
        })
    );
});