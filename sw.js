// Better Yourself - Service Worker
// Enables offline functionality and install prompt

const CACHE_NAME = 'better-yourself-v1.0.0';
const STATIC_CACHE = 'better-yourself-static-v1';
const DYNAMIC_CACHE = 'better-yourself-dynamic-v1';

// Files to cache for offline use
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache if not a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response (can only be consumed once)
            const responseToCache = networkResponse.clone();

            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                console.log('Service Worker: Caching dynamic content', event.request.url);
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.error('Service Worker: Failed to cache dynamic content', error);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('Service Worker: Network fetch failed', error);
            
            // Return a fallback page for navigation requests when offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // For other requests, let them fail naturally
            throw error;
          });
      })
  );
});

// Handle background sync (for future features)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // You could add background sync logic here
      // For example, syncing offline task changes
      Promise.resolve()
    );
  }
});

// Handle push notifications (for future features)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Better Yourself notification',
    icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ctext y=\'.9em\' font-size=\'90\'%3E🌟%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ctext y=\'.9em\' font-size=\'90\'%3E🌟%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    data: {
      url: './'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Better Yourself', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Cleanup function for efficient cache management
const cleanupCaches = () => {
  return caches.keys()
    .then((cacheNames) => {
      const oldCaches = cacheNames.filter(cacheName => {
        return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
      });
      
      return Promise.all(
        oldCaches.map(cacheName => caches.delete(cacheName))
      );
    });
};

// Periodic cleanup (when service worker is updated)
self.addEventListener('install', () => {
  cleanupCaches();
});
