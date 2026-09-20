/**
 * BLACK AI PWA Service Worker
 * Network-first strategy - always fetch latest from server
 */

const CACHE_NAME = 'blackai-v2.1.0'; // Bumped - forces all devices to clear old cache
const OFFLINE_URL = '/';

// Only cache static assets - never HTML or API
const CACHE_ASSETS = [
  '/manifest.json',
  '/logo.png',
];

// Install - cache only static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_ASSETS);
    })
  );
  // Force immediate activation - don't wait for old SW to die
  self.skipWaiting();
});

// Activate - delete ALL old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete every cache that isn't the current one
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// Fetch - network first for EVERYTHING
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests (POST, etc.)
  if (event.request.method !== 'GET') return;

  // Skip API calls - always go straight to network, no caching
  if (event.request.url.includes('/api/')) return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  const isHTMLRequest = event.request.headers.get('accept')?.includes('text/html');
  const isJSRequest = event.request.url.includes('/assets/');

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache static assets (JS/CSS/images) - NEVER cache HTML
        if (response.status === 200 && isJSRequest) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache for static assets
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // For HTML requests with no cache, return root (app shell)
          if (isHTMLRequest) return caches.match(OFFLINE_URL);
        });
      })
  );
});
