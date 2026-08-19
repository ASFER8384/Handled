import type { Metadata } from 'next';
import { Figtree, Fraunces, Geist_Mono } from 'next/font/google';
import './globals.css';

const sans = Figtree({ variable: '--font-sans-fallback', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
// Display face for marketing headings.
const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
});

export const metadata: Metadata = {
  title: 'Handled, the platform for independent businesses',
  description: 'Clients, projects, invoices and payments in one place.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${sans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
