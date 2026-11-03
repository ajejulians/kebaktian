import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Source_Serif_4, Public_Sans } from 'next/font/google';

const serif = Source_Serif_4({ subsets: ['latin'], variable: '--nf-serif', weight: ['500', '600'] });
const sans = Public_Sans({ subsets: ['latin'], variable: '--nf-sans' });

export const metadata: Metadata = {
  title: 'Operasional Kebaktian',
  icons: { icon: '/icons/favicon_matakin.png', shortcut: '/icons/favicon_matakin.png', apple: '/icons/favicon_matakin.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="id" className={`${serif.variable} ${sans.variable}`}><body>{children}</body></html>;
}
