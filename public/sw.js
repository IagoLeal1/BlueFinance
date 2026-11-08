// Service worker do BlueFin (design kit: TelaAvisosOffline).
// Aviso da fatura: mostra a notificação que o servidor manda e, no toque, abre o Crédito do mês.

// App sem internet (só em produção, registrado como /sw.js?cache=1): guarda a última versão de cada tela
// aberta e os arquivos do app; sem sinal, abre com o que viu por último.

const GUARDAR = new URL(self.location.href).searchParams.get('cache') === '1';
const VERSAO = 'bf-v1';
const TELAS = `${VERSAO}-telas`;
const ARQUIVOS = `${VERSAO}-arquivos`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener('fetch', (event) => {
  if (!GUARDAR) return;
  const pedido = event.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  // Arquivos do app (com hash no nome) e ícones: do aparelho primeiro.
  if (url.pathname.startsWith('/_next/static/') || ['/icon', '/apple-icon', '/manifest.webmanifest'].includes(url.pathname)) {
    event.respondWith(
      caches.open(ARQUIVOS).then(async (cache) => {
        const guardado = await cache.match(pedido);
        if (guardado) return guardado;
        const resposta = await fetch(pedido);
        if (resposta.ok) cache.put(pedido, resposta.clone());
        return resposta;
      }),
    );
    return;
  }

  // Telas (abrir o app ou recarregar): da internet primeiro; sem sinal, a última versão guardada.
  if (pedido.mode === 'navigate') {
    event.respondWith(
      fetch(pedido)
        .then((resposta) => {
          if (resposta.ok && resposta.type === 'basic' && !resposta.redirected) {
            const copia = resposta.clone();
            caches.open(TELAS).then((cache) => cache.put(url.href, copia));
          }
          return resposta;
        })
        .catch(() =>
          caches.open(TELAS).then(async (cache) => (await cache.match(url.href)) || (await cache.match(`${url.origin}/`)) || Response.error()),
        ),
    );
  }
});

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
