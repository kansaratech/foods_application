import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LocalSell Admin',
    short_name: 'LS Admin',
    id: '/',
    description: 'LocalSell marketplace admin & vendor console.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#1c5bc7',
    orientation: 'any',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
