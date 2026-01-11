const CACHE_NAME = 'luxessence-v2'; // Updated version to force cache refresh
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/images/logo.svg',
  '/images/logo-blanco.png',
  '/images/logo.ico',
  '/images/logo-luxessence.svg',
  '/images/banner-mandarin.png',
  '/images/bandera-honduras.png',
  '/images/instagram.png',
  '/images/whatsapp.png',
  '/images/tiktok.png',
  '/images/products/Club de Nuit.webp',
  '/images/products/Jibbitz.jpg',
  '/images/products/mandarin_sky.webp',
  '/images/products/Perry Elis for Women.png'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Force activation of new service worker
});

// Fetch event with better offline handling
self.addEventListener('fetch', event => {
  // Handle external resources (Firebase, FontAwesome) differently
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('font-awesome') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('firestore.googleapis.com')) {
    // For external resources, try network first, fall back to offline response
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return a basic response for Firebase scripts when offline
          if (event.request.url.includes('firebase-app.js') ||
              event.request.url.includes('firebase-firestore.js')) {
            return new Response('// Firebase offline stub\nfunction(){}');
          }
          // For other external resources, return empty response
          return new Response('');
        })
    );
  } else {
    // For local resources, use cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
  }
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});
