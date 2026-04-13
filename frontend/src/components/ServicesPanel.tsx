'use client';

import React from 'react';
import { ExternalLink, CreditCard, ChevronRight, Wifi } from 'lucide-react';

export interface Subscription {
  id: string;
  service: string;
  plan: 'on-demand' | 'monthly' | 'per-token';
  price: string;
  totalSpent: number;
  status: 'active' | 'paused' | 'expired';
  lastUsed?: string;
  renewsAt?: string;
  txHash?: string;
}

interface ServicesPanelProps {
  subscriptions: Subscription[];
  onToggle: (id: string) => void;
  onRenew: (id: string) => void;
  budgetLimit?: number;
  budgetSpent?: number;
  agentPublicKey?: string;
}

const SERVICE_ICONS: Record<string, string> = {
  'DeFi API': '📊',
  'News API': '📰',
  'Security Audit': '🔒',
  'Market Data': '📈',
  'AI Analysis': '🧠',
  'Agent API call': '⚡',
};

const getExplorerUrl = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ServicesPanel({
  subscriptions,
  onToggle,
  onRenew,
  budgetLimit = 10,
  budgetSpent = 0,
  agentPublicKey,
}: ServicesPanelProps) {
  const totalSpent = subscriptions.reduce((sum, s) => sum + s.totalSpent, 0) || budgetSpent;
  const budgetPercent = budgetLimit > 0 ? Math.min((totalSpent / budgetLimit) * 100, 100) : 0;
  const budgetRemaining = Math.max(budgetLimit - totalSpent, 0);
  const cardNumber = agentPublicKey
    ? `${agentPublicKey.slice(0, 4)} ${agentPublicKey.slice(4, 8)} •••• ${agentPublicKey.slice(-4)}`
    : '•••• •••• •••• ••••';

  const active = subscriptions.filter(s => s.status === 'active');
  const inactive = subscriptions.filter(s => s.status !== 'active');

  return (
    <div className="flex flex-col h-full bg-slate-950">

      {/* ── Debit Card ─────────────────────────────────── */}
      <div className="p-5 pb-3">
        <div
          className="relative rounded-2xl p-5 overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #0f1a2e 0%, #0a2e1f 40%, #1a1a2e 100%)',
            minHeight: '180px',
          }}
        >
          {/* Card shine overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(52,211,153,0.4) 0%, transparent 50%)',
            }}
          />

          {/* Top row: brand + contactless */}
          <div className="relative flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] text-emerald-400/60 uppercase tracking-[0.2em] font-medium">x402</p>
              <p className="text-base font-bold text-white tracking-tight">AgentPay</p>
            </div>
            <Wifi className="w-5 h-5 text-emerald-400/40 rotate-90" />
          </div>

          {/* Chip */}
          <div className="relative mb-4">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300/80 to-amber-500/60 border border-amber-400/30 flex items-center justify-center">
              <div className="w-6 h-4 rounded-sm border border-amber-600/40" />
            </div>
          </div>

          {/* Card number */}
          <div className="relative mb-4">
            <p className="text-sm font-mono text-white/80 tracking-[0.15em]">
              {cardNumber}
            </p>
          </div>

          {/* Bottom row: balance + logo */}
          <div className="relative flex items-end justify-between">
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Balance</p>
              <p className="text-xl font-bold text-white tabular-nums">
                {budgetRemaining.toFixed(2)} <span className="text-sm text-slate-400 font-normal">XLM</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Limit</p>
              <p className="text-sm text-slate-300 tabular-nums">{budgetLimit} XLM / day</p>
            </div>
          </div>

          {/* Budget bar at bottom edge */}
          <div className="relative mt-4">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${100 - budgetPercent}%`,
                  background: budgetPercent > 80
                    ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                    : 'linear-gradient(90deg, #34d399, #10b981)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Spending Summary ──────────────────────────── */}
      <div className="px-5 py-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
          Transactions
        </span>
        <span className="text-[11px] text-slate-400 tabular-nums">
          {totalSpent.toFixed(3)} XLM spent
        </span>
      </div>

      {/* ── Transaction List ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">

        {/* Active */}
        {active.length > 0 && (
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden divide-y divide-slate-800/50 mb-3">
            {active.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors cursor-pointer group"
                onClick={() => sub.txHash && window.open(getExplorerUrl(sub.txHash), '_blank')}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-base shrink-0 border border-slate-700/50">
                  {SERVICE_ICONS[sub.service] || '⚡'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{sub.service}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sub.lastUsed ? timeAgo(sub.lastUsed) : 'Just now'}
                    {sub.txHash && <span className="text-emerald-500/60"> · on-chain</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-white tabular-nums">-{sub.price}</p>
                  {sub.txHash && (
                    <ExternalLink className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto mt-0.5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expired */}
        {inactive.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mb-1.5 px-1">Failed</p>
            <div className="bg-slate-900/30 rounded-xl border border-slate-800/40 overflow-hidden divide-y divide-slate-800/20">
              {inactive.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 opacity-50">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/50 flex items-center justify-center text-base shrink-0 grayscale">
                    {SERVICE_ICONS[sub.service] || '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-slate-400 truncate">{sub.service}</h3>
                  </div>
                  <p className="text-sm text-slate-500 tabular-nums">-{sub.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {subscriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-3 border border-slate-800">
              <CreditCard className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No Transactions</p>
            <p className="text-xs text-slate-600 mt-1 max-w-[220px]">
              Your agent will auto-pay for APIs as it processes your requests
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/30">
        <a
          href={agentPublicKey ? `https://stellar.expert/explorer/testnet/account/${agentPublicKey}` : 'https://stellar.expert/explorer/testnet'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-500/70 hover:text-emerald-400 transition-colors font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          View Account on Stellar Explorer
        </a>
      </div>
    </div>
  );
}
