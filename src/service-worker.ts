/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;
const OFFLINE_CACHE = `offline-${version}`;

const ASSETS = [
  ...build, // the app itself
  ...files, // everything in `static`
];

const OFFLINE_PAGES = ['/offline'];

// Install event - cache assets
sw.addEventListener('install', (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    
    // Cache offline pages
    const offlineCache = await caches.open(OFFLINE_CACHE);
    await offlineCache.addAll(OFFLINE_PAGES);
  }

  event.waitUntil(addFilesToCache());
  // Force activate immediately
  sw.skipWaiting();
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE && key !== OFFLINE_CACHE) {
        await caches.delete(key);
      }
    }
  }

  event.waitUntil(deleteOldCaches());
  // Take control of all clients immediately
  sw.clients.claim();
});

// Fetch event - network first strategy for API calls
sw.addEventListener('fetch', (event) => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // For API calls (Supabase), use network first with fallback
  if (url.pathname.includes('/rest/v1/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if available
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Return empty response for offline API calls
            return new Response(
              JSON.stringify({ error: 'Offline', data: [] }),
              { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached page or offline page
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match('/offline');
          });
        })
    );
    return;
  }

  // For other assets, use cache first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Update cache in background
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE).then((cache) => {
                cache.put(event.request, response);
              });
            }
          })
          .catch(() => {});
        return cached;
      }
      
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return offline image for image requests
          if (event.request.destination === 'image') {
            return new Response('Offline', { 
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          }
          throw new Error('Network error');
        });
    })
  );
});

// Background sync for offline form submissions
sw.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncFormSubmissions());
  }
});

async function syncFormSubmissions() {
  // Implement background sync logic here
  console.log('Background sync triggered');
}

// Handle push notifications
sw.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  event.waitUntil(
    sw.registration.showNotification(data.title || 'Split Expense', {
      body: data.body || 'มีการอัพเดทใหม่',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-72x72.svg',
      data: data.url || '/',
      actions: [
        { action: 'open', title: 'เปิด' },
        { action: 'close', title: 'ปิด' }
      ]
    })
  );
});

// Handle notification clicks
sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      sw.clients.openWindow(event.notification.data || '/')
    );
  }
});
