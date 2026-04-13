'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Plus, RefreshCw } from 'lucide-react';

interface AgentFundCardProps {
  agentPublicKey?: string;
  agentFunded: boolean;
  isFunding: boolean;
  budgetLimit: number;
  onBudgetChange: (limit: number) => void;
  onFundAgent: () => void;
  onBalanceUpdate?: (balance: number) => void;
}

export default function AgentFundCard({
  agentPublicKey,
  agentFunded,
  isFunding,
  budgetLimit,
  onBudgetChange,
  onFundAgent,
  onBalanceUpdate,
}: AgentFundCardProps) {
  const [onChainBalance, setOnChainBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real on-chain balance
  const fetchBalance = async () => {
    if (!agentPublicKey || !agentFunded) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${agentPublicKey}`);
      if (res.ok) {
        const data = await res.json();
        const native = data.balances?.find((b: any) => b.asset_type === 'native');
        if (native) {
          const bal = parseFloat(native.balance);
          setOnChainBalance(bal);
          onBalanceUpdate?.(bal);
        }
      }
    } catch {
      // noop
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    if (!agentFunded || !agentPublicKey) return;
    const interval = setInterval(fetchBalance, 15000); // poll every 15s
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFunded, agentPublicKey]);

  if (!agentPublicKey) return null;

  return (
    <div className="p-4 border-b border-slate-800">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">AgentPay Card</h3>
          </div>
          {agentFunded && (
            <button
              onClick={fetchBalance}
              disabled={isRefreshing}
              className="p-1 hover:bg-slate-800 rounded transition-colors"
              title="Refresh balance"
            >
              <RefreshCw className={`w-3 h-3 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Agent address */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${agentFunded ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
          <span className="text-xs text-emerald-400 font-mono">
            {agentPublicKey.slice(0, 8)}...{agentPublicKey.slice(-4)}
          </span>
        </div>

        {/* On-chain balance (when funded) */}
        {agentFunded && onChainBalance !== null && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-white tabular-nums">{onChainBalance.toFixed(2)}</span>
            <span className="text-xs text-slate-500">XLM on-chain</span>
          </div>
        )}

        {/* Budget input + Fund/Top Up button */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              {agentFunded ? 'Top Up Amount' : 'Initial Deposit'} (XLM)
            </label>
            <input
              type="number"
              min="0.1"
              max="1000"
              step="0.5"
              value={budgetLimit}
              onChange={(e) => onBudgetChange(parseFloat(e.target.value) || 10)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onFundAgent}
              disabled={isFunding}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap ${
                agentFunded
                  ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400'
              }`}
            >
              {isFunding ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing...</>
              ) : agentFunded ? (
                <><Plus className="w-3.5 h-3.5" /> Top Up</>
              ) : (
                <><CreditCard className="w-3.5 h-3.5" /> Fund</>
              )}
            </button>
          </div>
        </div>

        {/* Status */}
        {agentFunded && (
          <p className="text-[10px] text-slate-600">
            Freighter signs top-ups · Agent signs payments autonomously
          </p>
        )}
      </div>
    </div>
  );
}
