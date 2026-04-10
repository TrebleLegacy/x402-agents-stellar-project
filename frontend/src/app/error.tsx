'use client'; 
 
import { useEffect } from 'react';
import { Zap } from 'lucide-react';
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error boundary explicitly caught:', error);
  }, [error]);
 
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100 flex-col space-y-6">
      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
        <Zap className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold">Something went wrong!</h2>
      <p className="text-sm text-slate-400 max-w-md text-center">{error.message}</p>
      <button
        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30 border-sm"
        onClick={() => reset()}
      >
        Attempt Recovery
      </button>
    </div>
  );
}
