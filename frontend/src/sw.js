import { precacheAndRoute } from 'workbox-precaching';

// Precaching automatically injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }
  
  const title = data.title || 'CampusPool Update';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/icons/pwa-192x192.png',
    badge: data.badge || '/icons/pwa-192x192.png',
    vibrate: [200, 100, 200, 100, 500],
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});
