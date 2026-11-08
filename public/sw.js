// Service worker do BlueFin (design kit: TelaAvisosOffline).
// Aviso da fatura: mostra a notificação que o servidor manda e, no toque, abre o Crédito do mês.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const aviso = event.data ? event.data.json() : { titulo: 'BlueFin', corpo: '', url: '/' };
  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.corpo,
      icon: '/icon',
      badge: '/icon',
      data: { url: aviso.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('navigate' in janela) return janela.navigate(url).then((j) => j && j.focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
