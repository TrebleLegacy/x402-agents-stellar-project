'use client';

import React from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';

interface WalletInfoProps {
  publicKey: string;
  secret: string;
}

export default function WalletInfo({ publicKey, secret }: WalletInfoProps) {
  const [showSecret, setShowSecret] = React.useState(false);
  const [copiedField, setCopiedField] = React.useState<'public' | 'secret' | null>(null);

  const copyToClipboard = (text: string, field: 'public' | 'secret') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-700">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Public Key
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-slate-900 p-2 rounded border border-slate-800 text-emerald-400 break-all font-mono">
            {publicKey}
          </code>
          <button
            onClick={() => copyToClipboard(publicKey, 'public')}
            className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-300"
            title="Copy public key"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        {copiedField === 'public' && (
          <p className="text-xs text-emerald-400 mt-1">✓ Copied</p>
        )}
      </div>

      <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-700">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Secret Key
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-slate-900 p-2 rounded border border-slate-800 text-red-400 break-all font-mono">
            {showSecret ? secret : '●'.repeat(Math.min(secret.length, 32))}
          </code>
          <button
            onClick={() => setShowSecret(!showSecret)}
            className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-300"
            title={showSecret ? 'Hide secret key' : 'Show secret key'}
          >
            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => copyToClipboard(secret, 'secret')}
            className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-300"
            title="Copy secret key"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        {copiedField === 'secret' && (
          <p className="text-xs text-emerald-400 mt-1">✓ Copied</p>
        )}
      </div>

      <div className="text-xs text-slate-500 bg-slate-950/50 rounded p-3 border border-slate-700/50 space-y-1">
        <p className="font-semibold text-slate-400">Network: Stellar</p>
        <p>Protocol: x402 (exact-v2)</p>
        <p>Asset: USDC (SEP-41)</p>
      </div>
    </div>
  );
}
