import type { MetadataRoute } from 'next';

/** Para "Adicionar à Tela de Início" no iPhone: abre em tela cheia, sem a barra do Safari. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BlueFinance',
    short_name: 'BlueFin',
    description: 'Suas finanças em um toque.',
    start_url: '/',
    display: 'standalone',
    background_color: '#eef4f8',
    theme_color: '#0b1f4d',
    lang: 'pt-BR',
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png' }],
  };
}
