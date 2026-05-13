self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'OurStory';
  const options = {
    body: data.body || 'A sweet moment is waiting for you.',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: { url: data.url || '/dashboard' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
