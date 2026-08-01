// @omnilink/sw:v5-pwa - OmniLink Mobile PWA Service Worker (Cache-Busting & Upgraded)
// Provides offline support, caching, and native app-like experience for iOS/Android
// Upgraded to v5 to purge legacy v4 stale caches and enforce compiled JS MIME delivery.

const CACHE_VERSION = 'omnilink-v5-20260801';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;

function isSupabaseSensitiveRequest(url) {
  return url.hostname.endsWith('.supabase.co') ||
    url.pathname.startsWith('/rest/v1') ||
    url.pathname.startsWith('/rpc') ||
    url.pathname.startsWith('/functions/v1') ||
    url.pathname.startsWith('/auth/v1');
}

function shouldBypassCache(request, url) {
  if (request.method !== 'GET') return true;
  if (isSupabaseSensitiveRequest(url)) return true;
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return true;
  // Never cache or intercept raw source code requests (prevent MIME type application/octet-stream issues)
  if (url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts') || url.pathname.startsWith('/src/')) return true;
  return false;
}

function safeAppUrl(input) {
  const fallback = new URL('/', self.location.origin);
  const allowedAppPaths = new Set([
    '/',
    '/launch',
    '/auth',
    '/login',
    '/story',
    '/tech-specs',
    '/features/man-mode',
    '/man-mode',
    '/privacy',
    '/terms',
    '/request-access',
    '/advanced-analytics',
    '/ai-automation',
    '/fortress',
    '/maestro',
    '/omniport',
    '/orchestrator',
    '/smart-integrations',
    '/tri-force',
    '/integrations/web3',
    '/product/omnidash',
    '/demo',
    '/demo.html',
    '/omnidash',
    '/dashboard',
  ]);
  const legacyRouteMap = new Map([
    ['/integrations', '/integrations/web3'],
    ['/omnitrace', '/omnidash'],
  ]);

  try {
    if (!input || typeof input !== 'string') return fallback.href;
    const parsed = new URL(input, self.location.origin);
    if (parsed.origin !== self.location.origin) return fallback.href;
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fallback.href;

    const canonicalPath = legacyRouteMap.get(parsed.pathname) || parsed.pathname;
    if (!allowedAppPaths.has(canonicalPath)) return fallback.href;
    parsed.pathname = canonicalPath;
    parsed.username = '';
    parsed.password = '';
    parsed.hash = parsed.hash || '';
    return parsed.href;
  } catch {
    return fallback.href;
  }
}

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
];

// Install event - cache static assets and skip waiting immediately
globalThis.addEventListener('install', (event) => {
  console.log('[SW] Installing OmniLink PWA service worker v5 (Cache-Busting edition)');
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err);
      });
    }).then(() => {
      console.log('[SW] Install complete, forcing skipWaiting');
      return globalThis.skipWaiting();
    })
  );
});

// Activate event - purge ALL legacy caches (omnilink-v1 through omnilink-v4)
globalThis.addEventListener('activate', (event) => {
  console.log('[SW] Activating OmniLink PWA service worker v5 & purging legacy caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('omnilink-') && !name.startsWith(CACHE_VERSION))
          .map((name) => {
            console.log('[SW] Purging legacy cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Legacy cache purge complete, claiming clients');
      return globalThis.clients.claim();
    })
  );
});

// Fetch event - network-first with cache fallback for resilience
globalThis.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sensitive Supabase/API traffic and raw TSX/TS source code must never be cached.
  if (shouldBypassCache(request, url)) {
    return;
  }

  // Never intercept hashed asset requests — let them go to network directly.
  if (url.pathname.startsWith('/assets/')) {
    return;
  }

  // Strategy: Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response?.status === 200 && response.type !== 'error') {
          const responseToCache = response.clone();
          let cacheName = CACHE_DYNAMIC;
          if (STATIC_ASSETS.includes(url.pathname)) {
            cacheName = CACHE_STATIC;
          }
          caches.open(cacheName).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache (offline):', url.pathname);
            return cachedResponse;
          }

          if (request.mode === 'navigate') {
            return caches.match('/index.html').then((indexResponse) => {
              if (indexResponse) {
                console.log('[SW] Serving cached index.html for offline navigation');
                return indexResponse;
              }
              return new Response('Offline - Please check your connection', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' },
              });
            });
          }

          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// Message event - handle client messages
self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin) {
    console.warn('[SW] Rejected message from untrusted origin:', event.origin);
    return;
  }

  if (event.data?.type === 'SKIP_WAITING' || event.data?.type === 'PURGE_CACHE') {
    console.log('[SW] Received SKIP_WAITING / PURGE_CACHE message');
    globalThis.skipWaiting();
  }
});

// Push notification event - show notification when received
globalThis.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  if (!event.data) return;

  let notification;
  try {
    notification = event.data.json();
  } catch (err) {
    console.debug('[SW] Not JSON, falling back to text:', err);
    notification = {
      title: 'OmniLink',
      body: event.data.text(),
    };
  }

  const options = {
    body: notification.body || '',
    icon: notification.icon || '/icons/pwa/icon-192.png',
    badge: notification.badge || '/icons/pwa/icon-96.png',
    image: notification.image,
    data: notification.data || {},
    actions: notification.actions || [],
    tag: notification.tag || 'default',
    requireInteraction: notification.requireInteraction || false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    globalThis.registration.showNotification(notification.title || 'OmniLink', options)
  );
});

// Notification click event
globalThis.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let url = '/';
  if (event.action === 'open-dash') {
    url = '/omnidash';
  } else if (event.action === 'open-trace') {
    url = '/omnitrace';
  } else if (event.action === 'open-integrations') {
    url = '/integrations';
  } else if (event.notification.data?.url) {
    url = event.notification.data.url;
  }

  const safeUrl = safeAppUrl(url);
  const safePath = new URL(safeUrl).pathname;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).pathname === safePath && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(safeUrl);
      }
    })
  );

  clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'notification-click',
        action: event.action,
        data: event.notification.data,
      });
    });
  });
});

// Background sync
globalThis.addEventListener('sync', (event) => {
  if (event.tag === 'omnilink-sync') {
    event.waitUntil(
      fetch('/api/sync/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((res) => res.json())
        .catch((err) => {
          console.error('[SW] Background sync failed:', err);
          throw err;
        })
    );
  }
});

console.log('[SW] OmniLink PWA service worker v5 loaded with cache-busting support');
