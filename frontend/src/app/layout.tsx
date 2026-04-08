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
      {/* pt-8 protege contra sobreposição do Traffic Light nativo vindo do tauri */}
      <body className="flex flex-col h-screen overflow-hidden bg-slate-950 pt-8 relative">
        <div data-tauri-drag-region className="absolute top-0 left-0 right-0 h-8 z-50 cursor-grab active:cursor-grabbing pointer-events-auto" />
        
        <main className="flex-1 overflow-hidden h-full flex flex-col relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
