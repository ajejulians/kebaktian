import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Noto_Serif_SC } from 'next/font/google';

const sans = Inter({ subsets: ['latin'], variable: '--nf-sans' });
// Hanya untuk aksara Mandarin; teks lain tetap Inter.
const han = Noto_Serif_SC({ weight: ['400', '600'], variable: '--nf-han', preload: false });

export const metadata: Metadata = {
  title: 'Operasional Kebaktian',
  icons: { icon: '/icons/favicon_matakin.png', shortcut: '/icons/favicon_matakin.png', apple: '/icons/favicon_matakin.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="id" className={`${sans.variable} ${han.variable}`}><body>{children}</body></html>;
}
