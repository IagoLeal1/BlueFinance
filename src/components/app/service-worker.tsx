'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker (aviso da fatura e app sem internet). Em produção ele também guarda as telas
 * para abrir sem internet (`?cache=1`); no desenvolvimento, só o aviso, para não atrapalhar o recarregamento.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const url = process.env.NODE_ENV === 'production' ? '/sw.js?cache=1' : '/sw.js';
    navigator.serviceWorker.register(url, { scope: '/', updateViaCache: 'none' }).catch(() => {});
  }, []);
  return null;
}
