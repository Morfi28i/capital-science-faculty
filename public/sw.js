// Shows the "your slides are ready" notification when the site is closed. The push carries no data, so the wording
// lives here and no lecture detail ever passes through the browser's push service.
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Capital Science', {
      body: 'سلايداتك جاهزة · Your slides are ready',
      icon: '/favicon.svg',
      tag: 'slides-ready',
      data: { url: '/slides' },
    }),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/slides'));
});
