'use client'; 
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100 flex-col space-y-4">
          <h2 className="text-2xl font-bold">Critical System Error</h2>
          <p className="text-slate-400">{error.message}</p>
          <button onClick={() => reset()} className="mt-4 px-4 py-2 bg-emerald-600 rounded">Try again</button>
        </div>
      </body>
    </html>
  );
}
