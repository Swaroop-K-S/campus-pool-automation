// CampusPool Service Worker — v2.1 (Offline PWA + Push Notifications)
// ─────────────────────────────────────────────────────────────────────
const CACHE_NAME = 'campuspool-shell-v2';
const OFFLINE_URL = '/offline.html';

// Resources to pre-cache on install (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
];

// ── Install: Pre-cache the app shell ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting(); // Activate immediately
});

// ── Activate: Clean up old caches ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Take control of all open tabs
});

// ── Fetch Strategy ──────────────────────────────────────────────────
// - API calls (/api/*): Network-first, no cache
// - Student pages (/event/*, /apply/*, /passport): Cache-first with network update
// - Everything else: Network-first, fall back to cache, then offline page

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // API calls — always network-first, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ success: false, error: 'You are offline. Please reconnect.' }),
      { headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  // Student-facing pages — stale-while-revalidate
  const isStudentPage =
    url.pathname.startsWith('/event/') ||
    url.pathname.startsWith('/apply/') ||
    url.pathname === '/passport' ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  if (isStudentPage) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request).then(response => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => null);

        // Return cached version immediately, update in background
        return cached || networkFetch || caches.match('/offline.html');
      })
    );
    return;
  }

  // Static assets (JS, CSS, fonts) — cache-first
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|ico|webp)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // Default — network-first with offline fallback
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request) || caches.match('/offline.html')
    )
  );
});

// ── Push Notifications ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'New update from CampusPool',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'campuspool-notification',
    requireInteraction: data.requireInteraction ?? true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'CampusPool', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Background Sync: Retry failed check-in data ─────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkin') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Placeholder for future offline check-in queue
  console.log('[SW] Background sync triggered: sync-checkin');
}
