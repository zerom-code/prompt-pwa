import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'Forma — ваша идея, идеальный промпт',
  description: 'Личная студия промптов. Превратите простую идею в продуманный запрос для ИИ. Текст, изображения и анализ референсов.',
  applicationName: 'Forma',
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Forma' },
  icons: { icon: `${basePath}/icon.svg`, apple: `${basePath}/icons/apple-touch-icon.png` },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#fbfafc' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
