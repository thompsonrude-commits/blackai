/**
 * BLACK AI PWA Service Worker
 * NETWORK-ONLY strategy for all JS/HTML — never cache app code.
 * Only caches static assets like icons and manifest.
 * This ensures users always get the latest version immediately.
 */

const CACHE_NAME = 'blackai-v2.3.0';

self.addEventListener('install', (event) => {
  // Skip waiting — activate immediately, don't wait for old SW to unload
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Delete ALL old caches without exception
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((name) => {
        console.log('[SW] Clearing cache:', name);
        return caches.delete(name);
      }))
    ).then(() => {
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // NEVER intercept API calls — always go to network directly
  if (url.includes('/api/')) return;

  // NEVER cache or intercept JS/CSS app bundles — always go to network
  if (url.includes('/assets/')) {
    // Network only — no cache. This ensures new deployments are always loaded.
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => new Response('/* offline */', { headers: { 'Content-Type': 'text/javascript' } }))
    );
    return;
  }

  // NEVER cache HTML — always network
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => fetch('/'))
    );
    return;
  }

  // For everything else (icons, manifest) — network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
