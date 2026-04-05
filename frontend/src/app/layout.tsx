import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FORGE v2',
  description: 'Trust-aware, competitive runtime for economically intelligent agents on Stellar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
