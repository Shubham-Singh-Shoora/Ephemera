import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ephemera — A study in leaving less behind',
  description:
    'Follow the life of a file through an interactive story, then explore a temporary, browser-only data room. A research prototype with clear boundaries.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
