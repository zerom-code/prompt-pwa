import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return {
    name: 'Forma — Prompt Studio', short_name: 'Forma', description: 'Ваша идея. Идеальный промпт.', lang: 'ru',
    id: `${basePath}/`, start_url: `${basePath}/`, scope: `${basePath}/`, display: 'standalone', background_color: '#fbfafc', theme_color: '#fbfafc',
    icons: [{ src: `${basePath}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: `${basePath}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    categories: ['productivity', 'utilities'],
  };
}
