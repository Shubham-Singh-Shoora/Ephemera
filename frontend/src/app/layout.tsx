import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ephemera — Where data and models meet',
  description:
    'Step into a shared training playground for data providers and AI teams. Explore three ways to connect, agree on a purpose, and train a model. An interactive testnet concept.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
