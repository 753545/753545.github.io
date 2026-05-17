const CACHE_NAME = 'c2n-app-cache-v3';
const IMAGE_CACHE_NAME = 'c2n-image-cache-v2'; // Bumped version to clear old bloated cache

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
                    // Delete old versions of caches automatically
                    if (cache !== CACHE_NAME && cache !== IMAGE_CACHE_NAME) {
                        return caches.delete(cache); 
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // IMAGES: Cache-First Strategy using CORS
    if (url.hostname === 'image.tmdb.org') {
        event.respondWith(
            // Match via URL string to ignore mode mismatches (no-cors vs cors)
            caches.match(url.href).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                
                // Construct a CORS request to prevent opaque response caching limits
                const corsRequest = new Request(url.href, { mode: 'cors' });
                
                return fetch(corsRequest).then((response) => {
                    return caches.open(IMAGE_CACHE_NAME).then((cache) => {
                        // Put the CORS response in cache mapped to the URL string
                        cache.put(url.href, response.clone());
                        return response;
                    });
                }).catch(() => {
                    // Fallback
                    return fetch(event.request);
                });
            })
        );
        return;
    }

    // CODE & JSON: Network-First Strategy
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            let clone = networkResponse.clone();
            
            // DON'T cache the database JSON if it has the cache-busting timestamp
            if (!url.searchParams.has('t')) {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                });
            }
            
            return networkResponse;
        }).catch(() => {
            // If offline, fall back to the cache
            return caches.match(event.request);
        })
    );
});