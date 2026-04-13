'use client';

import React from 'react';
import { ExternalLink, ChevronRight, CreditCard } from 'lucide-react';

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
}

const SERVICE_ICONS: Record<string, string> = {
  'DeFi API': '📊',
  'News API': '📰',
  'Security Audit': '🔒',
  'Market Data': '📈',
  'AI Analysis': '🧠',
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

function renewalLabel(date: string): string {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Expired';
  if (days === 1) return 'Renews tomorrow';
  if (days <= 7) return `Renews in ${days} days`;
  return `Renews ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default function ServicesPanel({
  subscriptions,
  onToggle,
  onRenew,
  budgetLimit = 10,
  budgetSpent = 0,
}: ServicesPanelProps) {
  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const totalSpent = subscriptions.reduce((sum, s) => sum + s.totalSpent, 0) || budgetSpent;
  const budgetPercent = budgetLimit > 0 ? Math.min((totalSpent / budgetLimit) * 100, 100) : 0;
  const budgetRemaining = Math.max(budgetLimit - totalSpent, 0);

  // Group by status
  const active = subscriptions.filter(s => s.status === 'active');
  const inactive = subscriptions.filter(s => s.status !== 'active');

  return (
    <div className="flex flex-col h-full bg-slate-950">

      {/* ── Budget Card ─────────────────────────────────── */}
      <div className="p-5">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-5 border border-slate-700/50 shadow-lg">
          {/* Card header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Agent Budget</p>
                <p className="text-lg font-bold text-white tabular-nums leading-tight">
                  {totalSpent.toFixed(3)} <span className="text-slate-500 text-sm font-normal">/ {budgetLimit} XLM</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining</p>
              <p className="text-sm font-semibold text-emerald-400 tabular-nums">{budgetRemaining.toFixed(3)} XLM</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${budgetPercent}%`,
                background: budgetPercent > 80
                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                  : budgetPercent > 50
                  ? 'linear-gradient(90deg, #10b981, #f59e0b)'
                  : 'linear-gradient(90deg, #10b981, #34d399)',
              }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-slate-500">
              {activeCount} active subscription{activeCount !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-slate-500">
              {subscriptions.length} total payment{subscriptions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Subscription List (Apple-style) ──────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">

        {/* Active Subscriptions */}
        {active.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-2 px-1">Active</p>
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden divide-y divide-slate-800/50">
              {active.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  onClick={() => sub.txHash && window.open(getExplorerUrl(sub.txHash), '_blank')}
                >
                  {/* Service icon */}
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-700/50">
                    {SERVICE_ICONS[sub.service] || '⚡'}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white truncate">{sub.service}</h3>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-400">{sub.price}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-500">
                        {sub.renewsAt ? renewalLabel(sub.renewsAt) : sub.lastUsed ? timeAgo(sub.lastUsed) : 'Auto-renew'}
                      </span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-1 shrink-0">
                    {sub.txHash && (
                      <ExternalLink className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired / Paused */}
        {inactive.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-2 px-1">Expired</p>
            <div className="bg-slate-900/40 rounded-xl border border-slate-800/50 overflow-hidden divide-y divide-slate-800/30">
              {inactive.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 px-4 py-3 opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-lg shrink-0 border border-slate-700/30 grayscale">
                    {SERVICE_ICONS[sub.service] || '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-400 truncate">{sub.service}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{sub.price} · {sub.status === 'expired' ? 'Expired' : 'Paused'}</p>
                  </div>
                  <button
                    onClick={() => sub.status === 'expired' ? onRenew(sub.id) : onToggle(sub.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors font-medium"
                  >
                    {sub.status === 'expired' ? 'Resubscribe' : 'Resume'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {subscriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-4 border border-slate-800">
              <CreditCard className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No Subscriptions</p>
            <p className="text-xs text-slate-600 mt-1 max-w-[200px]">
              Your agent will auto-subscribe to APIs as it processes your requests
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/30">
        <a
          href="https://stellar.expert/explorer/testnet"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-500/70 hover:text-emerald-400 transition-colors font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          View All Transactions on Stellar Explorer
        </a>
      </div>
    </div>
  );
}
