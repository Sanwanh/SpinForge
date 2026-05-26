import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@mysten/dapp-kit/dist/index.css';
import { Providers } from './providers';
import { Navbar } from '@/components/shared/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SpinForge - Beyblade X Blockchain Card Game',
  description: 'Physics-authentic Beyblade X blockchain card game on Sui. Collect parts, assemble Beyblades, and battle in the arena.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:pb-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
