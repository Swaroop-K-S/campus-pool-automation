// CampusPool Service Worker — Push Notifications

self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'CampusPool', {
        body: data.body || '',
        icon: '/campuspool-icon.png',
        badge: '/campuspool-badge.png',
        tag: 'campuspool-notification',
        requireInteraction: true,
        data: { url: data.url || '/' }
      }
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(
      event.notification.data.url
    )
  );
});
