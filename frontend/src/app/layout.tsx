import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'x402 Agent Frontend',
  description: 'Configure and interact with AI agents using Stellar payments',
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
