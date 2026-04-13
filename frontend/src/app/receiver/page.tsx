'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, ArrowDownLeft, ExternalLink, CreditCard } from 'lucide-react';
import SdkDocs from '@/components/SdkDocs';

interface Payment {
  id: string;
  from: string;
  amount: string;
  asset: string;
  timestamp: string;
  txHash: string;
}

const HORIZON = 'https://horizon-testnet.stellar.org';

export default function ReceiverPage() {
  const receiverAddress =
    process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS || '';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalXLM, setTotalXLM] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const addPayment = useCallback((p: Payment) => {
    setPayments((prev) => [p, ...prev]);
    setTotalXLM((prev) => prev + parseFloat(p.amount || '0'));
  }, []);

  // ── SSE stream ────────────────────────────────────────────────
  useEffect(() => {
    if (!receiverAddress) {
      setError('No NEXT_PUBLIC_SERVER_STELLAR_ADDRESS configured.');
      return;
    }

    const url = `${HORIZON}/accounts/${receiverAddress}/payments?cursor=now&order=asc`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'payment') return;

        const payment: Payment = {
          id: data.id,
          from: data.from,
          amount: data.amount,
          asset: data.asset_type === 'native' ? 'USDC*' : data.asset_code || data.asset_type,
          timestamp: data.created_at,
          txHash: data.transaction_hash,
        };
        addPayment(payment);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [receiverAddress, addPayment]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-5 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold text-white">x402 Receiver Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">API Provider — Incoming Agent Payments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
              connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Radio className={`w-3 h-3 ${connected ? 'animate-pulse' : ''}`} />
              {connected ? 'Streaming Live' : 'Connecting…'}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {/* Address & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-1 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Listening Address</p>
            <p className="text-xs text-slate-300 font-mono break-all leading-relaxed">
              {receiverAddress || '—'}
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Payments Received</p>
            <p className="text-3xl font-bold text-white tabular-nums">{payments.length}</p>
          </div>
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-1">Total Earned</p>
            <p className="text-3xl font-bold text-emerald-400 tabular-nums">
              {totalXLM.toFixed(4)} <span className="text-lg font-normal text-emerald-500">USDC</span>
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        {/* Payment Feed */}
        <div ref={listRef}>
          <h2 className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-4">Live Payment Feed</h2>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Radio className="w-10 h-10 mb-4 opacity-30 animate-pulse" />
              <p className="text-sm">Waiting for payments…</p>
              <p className="text-xs text-slate-600 mt-1">Send a transaction from the AgentPay dashboard to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-semibold text-white">
                        +{parseFloat(p.amount).toFixed(4)} {p.asset}
                      </p>
                      <span className="text-[10px] text-emerald-500 font-medium">RECEIVED</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">
                      from {p.from}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-slate-500">
                      {new Date(p.timestamp).toLocaleTimeString()}
                    </span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${p.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-10 border-t border-slate-800" />

        {/* SDK Documentation */}
        <div>
          <h2 className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-4">How x402 Works</h2>
          <SdkDocs />
        </div>

        {/* Testnet disclaimer */}
        <p className="text-[11px] text-slate-600 mt-8 text-center">
          * Demo runs on Stellar Testnet using XLM as a stand-in for USDC. Production uses native USDC via Stellar&apos;s regulated asset infrastructure.
        </p>
      </main>
    </div>
  );
}
