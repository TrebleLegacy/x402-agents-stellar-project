'use client';

import React, { useState } from 'react';
import { Rocket, Timer, DollarSign, ShieldCheck, Route, CheckCircle2 } from 'lucide-react';
import { InteractionLogEvent } from '@/types/agent';

interface ForgeRuntimeProps {
  apiUrl: string;
  onLog?: (event: InteractionLogEvent) => void;
}

interface ForgeResult {
  success: boolean;
  error?: string;
  request?: { amount: string; from: string; to: string };
  bids?: any[];
  audits?: any[];
  decision?: any;
  graph?: any;
  execution?: any;
}

export default function ForgeRuntime({ apiUrl, onLog }: ForgeRuntimeProps) {
  const [amount, setAmount] = useState('500');
  const [from, setFrom] = useState('BRL');
  const [to, setTo] = useState('USDC');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runForge = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    onLog?.({
      at: new Date().toISOString(),
      source: 'forge',
      stage: 'runtime_started',
      detail: 'Forge v3 execution started (Escrow & Stake activated)',
      payload: { amount, from, to },
    });

    try {
      const response = await fetch(`${apiUrl}/api/forge/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, from, to }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Forge execution failed');
      }
      setResult(data);
      onLog?.({
        at: new Date().toISOString(),
        source: 'forge',
        stage: 'runtime_succeeded',
        detail: 'Forge v3 execution completed',
        payload: { decision: data?.decision, execution: data?.execution },
      });
    } catch (err: any) {
      setError(err.message || 'Forge execution failed');
      onLog?.({
        at: new Date().toISOString(),
        source: 'forge',
        stage: 'runtime_failed',
        detail: 'Forge v3 execution failed',
        payload: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="w-4 h-4 text-amber-400" />
        <p className="text-xs font-semibold text-amber-200 uppercase tracking-wider">Forge v3 Runtime (Escrow & Staking)</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">Amount</label>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">From</label>
          <input
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-slate-400">To</label>
          <input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white"
          />
        </div>
      </div>

      <button
        onClick={runForge}
        disabled={loading}
        className="w-full px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-100 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-60"
      >
        {loading ? 'Executing Escrow & Settling...' : 'Run Forge v3 Execution'}
      </button>

      {error && (
        <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded p-2">
          {error}
        </div>
      )}

      {result?.success && (
        <div className="space-y-3 text-xs text-slate-200">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                <span>Decision</span>
              </div>
              <p className="mt-2 text-slate-400">{result.decision?.selectedAgent}</p>
              <p className="text-slate-500">{result.decision?.selection?.notes || 'Selection complete'}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
              <div className="flex items-center gap-2 text-sky-300">
                <Timer className="w-3 h-3" />
                <span>Selection Snapshot</span>
              </div>
              <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
                {JSON.stringify(result.decision?.selection, null, 2)}
              </pre>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
            <div className="flex items-center gap-2 text-amber-300">
              <DollarSign className="w-3 h-3" />
              <span>Bids & Capital Stakes</span>
            </div>
            <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
              {JSON.stringify(result.bids, null, 2)}
            </pre>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="w-3 h-3" />
              <span>Stake-Backed Audits</span>
            </div>
            <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
              {JSON.stringify(result.audits, null, 2)}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
              <div className="flex items-center gap-2 text-violet-300">
                <Route className="w-3 h-3" />
                <span>Route</span>
              </div>
              <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
                {JSON.stringify(result.graph?.route, null, 2)}
              </pre>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
              <div className="flex items-center gap-2 text-teal-300">
                <ShieldCheck className="w-3 h-3" />
                <span>Risk</span>
              </div>
              <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
                {JSON.stringify(result.graph?.risk, null, 2)}
              </pre>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              <span>Escrow & Micro-market Execution</span>
            </div>
            <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap break-words">
              {JSON.stringify(result.execution, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
