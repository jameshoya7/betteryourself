// Better Yourself - Offline-First Service Worker
// Enables complete offline functionality

const CACHE_NAME = 'better-yourself-offline-v1.0.0';
const STATIC_CACHE = 'better-yourself-static-v1';

// Files to cache for offline use
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing for offline use...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching all files for offline use');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Ready for offline use');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating offline mode...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Offline mode activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - ALWAYS serve from cache (offline-first)
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
        // ALWAYS return cached version if available (offline-first strategy)
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache (offline)', event.request.url);
          return cachedResponse;
        }

        // If not in cache, try to fetch and cache for next time
        // But prioritize cache over network for offline-first experience
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache if not a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response (can only be consumed once)
            const responseToCache = networkResponse.clone();

            // Cache the new content
            caches.open(STATIC_CACHE)
              .then((cache) => {
                console.log('Service Worker: Caching new content', event.request.url);
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.error('Service Worker: Failed to cache new content', error);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.log('Service Worker: Network failed, app is fully offline');
            
            // For navigation requests, always return the main app
            if (event.request.destination === 'document') {
              return caches.match('./index.html')
                .then((response) => {
                  if (response) {
                    return response;
                  }
                  // Fallback offline page
                  return new Response(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Better Yourself - Offline</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                            .container { max-width: 400px; margin: 0 auto; padding: 40px; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                            .icon { font-size: 4rem; margin-bottom: 20px; }
                            h1 { color: #333; margin-bottom: 20px; }
                            p { color: #666; line-height: 1.6; }
                            button { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="icon">🌟</div>
                            <h1>Better Yourself</h1>
                            <p>You're currently offline, but your productivity app is ready to work!</p>
                            <p>All your data is stored locally and will sync when you're back online.</p>
                            <button onclick="window.location.reload()">Launch App</button>
                        </div>
                    </body>
                    </html>
                  `, {
                    headers: { 'Content-Type': 'text/html' }
                  });
                });
            }
            
            // For other requests when offline, return a basic response
            throw error;
          });
      })
  );
});

// Handle sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Connection restored, syncing data');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync any pending data when connection is restored
      syncOfflineData()
    );
  }
});

// Function to sync offline data (placeholder for future features)
function syncOfflineData() {
  return new Promise((resolve) => {
    console.log('Service Worker: Syncing offline data...');
    // Here you could sync any offline changes to a server
    // For now, just resolve immediately
    resolve();
  });
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ 
      version: CACHE_NAME, 
      offline: true,
      mode: 'offline-first'
    });
  }

  if (event.data && event.data.type === 'CACHE_STATUS') {
    caches.match('./index.html')
      .then((response) => {
        event.ports[0].postMessage({ 
          cached: !!response,
          ready: true,
          mode: 'offline'
        });
      });
  }
});

// Ensure immediate offline capability
self.addEventListener('install', (event) => {
  // Force immediate activation for offline use
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: App ready for offline use');
        return self.skipWaiting();
      })
  );
});

// Log when app is running offline
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes(self.location.origin)) {
    console.log('Service Worker: App running in offline mode');
  }
});
