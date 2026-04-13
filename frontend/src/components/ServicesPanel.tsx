'use client';

import React, { useState } from 'react';
import { ExternalLink, CreditCard, X, Wifi, Loader2, Plus } from 'lucide-react';

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
  onCancel?: (id: string) => void;
  onRenew: (id: string) => void;
  budgetLimit?: number;
  budgetSpent?: number;
  onChainBalance?: number | null;
  agentPublicKey?: string;
  agentFunded?: boolean;
  isFunding?: boolean;
  onBudgetChange?: (limit: number) => void;
  onFundAgent?: () => void;
}

const SERVICE_ICONS: Record<string, string> = {
  'DeFi Data API': '📊',
  'Security Audit API': '🔒',
  'Crypto News API': '📰',
  'Market Intelligence': '🌐',
  'DeFi API': '📊',
  'News API': '📰',
  'Security Audit': '🔒',
  'Agent API call': '⚡',
};

const getExplorerUrl = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

function renewalLabel(date: string): string {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Expired';
  if (days === 1) return 'Renews tomorrow';
  if (days <= 7) return `Renews in ${days} days`;
  return `Renews ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function expiresLabel(date: string): string {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Expired';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 30) return `${days} days remaining`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} remaining`;
}

export default function ServicesPanel({
  subscriptions,
  onToggle,
  onCancel,
  onRenew,
  budgetLimit = 10,
  budgetSpent = 0,
  onChainBalance,
  agentPublicKey,
  agentFunded = false,
  isFunding = false,
  onBudgetChange,
  onFundAgent,
}: ServicesPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Real balance from Horizon, default to 0 when not yet fetched
  const cardBalance = onChainBalance ?? 0;

  // Monthly estimate: sum of all active subscription prices × 30
  const monthlyEstimate = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.totalSpent * 30, 0);

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
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(52,211,153,0.4) 0%, transparent 50%)',
            }}
          />

          <div className="relative flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] text-emerald-400/60 uppercase tracking-[0.2em] font-medium">x402</p>
              <p className="text-base font-bold text-white tracking-tight">AgentPay</p>
            </div>
            <Wifi className="w-5 h-5 text-emerald-400/40 rotate-90" />
          </div>

          <div className="relative mb-4">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300/80 to-amber-500/60 border border-amber-400/30 flex items-center justify-center">
              <div className="w-6 h-4 rounded-sm border border-amber-600/40" />
            </div>
          </div>

          <div className="relative mb-4">
            <p className="text-sm font-mono text-white/80 tracking-[0.15em]">{cardNumber}</p>
          </div>

          <div className="relative flex items-end justify-between">
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Balance</p>
              <p className="text-xl font-bold text-white tabular-nums">
                {cardBalance.toFixed(2)} <span className="text-sm text-slate-400 font-normal">XLM</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Est. Monthly</p>
              <p className="text-sm text-slate-300 tabular-nums">
                {monthlyEstimate > 0 ? `${monthlyEstimate.toFixed(3)} XLM` : '—'}
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${cardBalance > 0 ? Math.min((cardBalance / Math.max(budgetLimit, cardBalance)) * 100, 100) : 0}%`,
                  background: cardBalance < 2
                    ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                    : 'linear-gradient(90deg, #34d399, #10b981)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Fund / Top Up Controls ─────────────────────── */}
      {agentPublicKey && (
        <div className="px-5 pb-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                min="1"
                max="1000"
                step="1"
                value={budgetLimit}
                onChange={(e) => onBudgetChange?.(parseFloat(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="Amount (XLM)"
              />
            </div>
            <button
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
                <><CreditCard className="w-3.5 h-3.5" /> Fund Card</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Active Subscriptions ────────────────────────── */}
      <div className="px-5 py-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
          Subscriptions
        </span>
        <span className="text-[11px] text-slate-400 tabular-nums">
          {active.length} active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {active.length > 0 && (
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden divide-y divide-slate-800/50 mb-3">
            {active.map((sub) => {
              const isExpanded = expandedId === sub.id;
              return (
                <div key={sub.id}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-700/50">
                      {SERVICE_ICONS[sub.service] || '⚡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{sub.service}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {sub.renewsAt ? renewalLabel(sub.renewsAt) : 'Per-query billing'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-white tabular-nums">{sub.price}</p>
                      {sub.renewsAt && (
                        <p className="text-[10px] text-emerald-500/60 mt-0.5">{expiresLabel(sub.renewsAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail (Apple-style) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-900/40 space-y-3">
                      {/* Renewal info */}
                      {sub.renewsAt && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Auto-renews</span>
                          <span className="text-slate-300">
                            {new Date(sub.renewsAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}

                      {/* Plan */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Plan</span>
                        <span className="text-slate-300">{sub.price} / {sub.plan === 'monthly' ? 'month' : 'query'}</span>
                      </div>

                      {/* Total spent */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Total spent</span>
                        <span className="text-slate-300">{sub.totalSpent.toFixed(3)} XLM</span>
                      </div>

                      {/* Explorer link */}
                      {sub.txHash && (
                        <a
                          href={getExplorerUrl(sub.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Stellar Explorer
                        </a>
                      )}

                      {/* Cancel button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel?.(sub.id);
                          setExpandedId(null);
                        }}
                        className="w-full mt-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3 h-3" />
                        Cancel Subscription
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Expired */}
        {inactive.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mb-1.5 px-1">Cancelled</p>
            <div className="bg-slate-900/30 rounded-xl border border-slate-800/40 overflow-hidden divide-y divide-slate-800/20">
              {inactive.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 opacity-50">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/50 flex items-center justify-center text-base shrink-0 grayscale">
                    {SERVICE_ICONS[sub.service] || '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-slate-400 truncate">{sub.service}</h3>
                    <p className="text-[10px] text-slate-600">Cancelled</p>
                  </div>
                  <button
                    onClick={() => onRenew(sub.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors font-medium"
                  >
                    Resubscribe
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {subscriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-3 border border-slate-800">
              <CreditCard className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No Subscriptions</p>
            <p className="text-xs text-slate-600 mt-1 max-w-[220px]">
              Subscribe to APIs from the marketplace or let your agent auto-pay
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
