import type { Metadata } from 'next';
import './globals.css';
import '@mysten/dapp-kit/dist/index.css';
import { Providers } from './providers';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { GuestBanner } from '@/components/shared/Guest';

// Disable static pre-rendering for all routes. better-auth/react is a pure-ESM
// package externalised as an async webpack module. Async modules that haven't
// settled when the build-time static-generation worker runs cause downstream
// component exports to be `undefined`, breaking every page. Opting out of
// static generation makes routes render at request time, by which point all
// async modules in the running server have fully resolved.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SpinForge — Ancient Steel. On-Chain Spin.',
  description:
    'Real metal meets the on-chain world. Register your physical Beyblade as a Sui Object — build a permanent battle history, season rank, and a passport that proves every spin.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <div className="bg-trigram" aria-hidden />
          <Navbar />
          <GuestBanner />
          <main className="shell">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
