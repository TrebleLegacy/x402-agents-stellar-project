'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import SdkDocs from '@/components/SdkDocs';

export default function SDKPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm shrink-0 h-16">
        <div className="flex items-center justify-between px-6 h-full">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">FORGE SDK</h1>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="p-8 max-w-4xl mx-auto">
        <SdkDocs />
      </div>
    </div>
  );
}
