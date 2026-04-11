'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Play, Terminal, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { X402SdkClient } from '@/lib/x402Sdk';
import { InteractionLogEvent } from '@/types/agent';

interface SdkPlaygroundProps {
  apiUrl: string;
  wallet?: { publicKey: string; secret: string } | null;
  onLog?: (event: InteractionLogEvent) => void;
}

interface DemoResult {
  data?: any;
  paymentResponse?: any;
  status?: number;
}

export default function SdkPlayground({ apiUrl, wallet, onLog }: SdkPlaygroundProps) {
  const [message, setMessage] = useState('hello from forge');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const network =
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'testnet' | 'mainnet') ||
    'testnet';

  const client = useMemo(() => new X402SdkClient(apiUrl, network), [apiUrl, network]);

  useEffect(() => {
    client.setLogger(onLog);
    client.setLogSource('sdk');
  }, [client, onLog]);

  useEffect(() => {
    if (wallet) {
      client.setWallet(wallet);
    }
  }, [client, wallet]);

  const runDemo = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    onLog?.({
      at: new Date().toISOString(),
      source: 'sdk',
      stage: 'demo_started',
      detail: 'SDK demo request started',
      payload: { endpoint: '/api/x402-sdk/demo/echo', message },
    });

    if (!wallet) {
      setError('Configure a Stellar wallet to run the SDK demo.');
      setLoading(false);
      return;
    }

    try {
      const response = await client.payAndRequestDetailed({
        method: 'post',
        path: '/api/x402-sdk/demo/echo',
        data: {
          message,
          sentAt: new Date().toISOString(),
        },
      });

      setResult({
        data: response.data,
        paymentResponse: response.paymentResponse,
        status: response.status,
      });

      onLog?.({
        at: new Date().toISOString(),
        source: 'sdk',
        stage: 'demo_succeeded',
        detail: 'SDK demo completed',
        payload: response.data,
      });
    } catch (err: any) {
      setError(err.message || 'SDK demo failed');
      onLog?.({
        at: new Date().toISOString(),
        source: 'sdk',
        stage: 'demo_failed',
        detail: 'SDK demo failed',
        payload: err.message || err,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-violet-300" />
        <p className="text-xs font-semibold text-violet-200 uppercase tracking-wider">SDK Live Demo</p>
      </div>

      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <Wallet className="w-3 h-3" />
            Wallet
          </span>
          <span className={wallet ? 'text-emerald-300' : 'text-amber-300'}>
            {wallet ? 'ready' : 'not configured'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 break-all">
          Endpoint: {apiUrl}/api/x402-sdk/demo/echo
        </p>
        {wallet && (
          <p className="text-[11px] text-slate-500 break-all">
            Public Key: {wallet.publicKey}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[11px] text-slate-400">Request Payload</label>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white"
        />
      </div>

      <button
        onClick={runDemo}
        disabled={loading}
        className="w-full px-3 py-2 rounded-lg bg-violet-500/20 border border-violet-400/40 text-violet-100 text-sm font-medium hover:bg-violet-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4" />
        {loading ? 'Processing payment...' : 'Pay and Request'}
      </button>

      {error && (
        <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded p-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3 text-xs text-slate-200">
          <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              <span>Response</span>
              {result.status ? (
                <span className="text-[11px] text-slate-500">HTTP {result.status}</span>
              ) : null}
            </div>
            <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>

          {result.paymentResponse && (
            <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
              <div className="flex items-center gap-2 text-violet-300">
                <CheckCircle2 className="w-3 h-3" />
                <span>Payment Receipt</span>
              </div>
              <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
                {JSON.stringify(result.paymentResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
