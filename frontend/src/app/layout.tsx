import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DeadDrop AI | Self-Destructing Confidential Data Room',
  description: 'Enterprise zero-trace data room for confidential AI inference. Data physically self-destructs upon timer expiration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090D16] text-[#E5E7EB]">
        {children}
      </body>
    </html>
  );
}
