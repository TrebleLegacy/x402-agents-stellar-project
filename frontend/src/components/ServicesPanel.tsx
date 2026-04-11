'use client';

import React from 'react';
import { ExternalLink, Pause, Play, RefreshCw } from 'lucide-react';

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
}

const planLabels: Record<Subscription['plan'], string> = {
  'on-demand': 'on-demand',
  monthly: 'monthly',
  'per-token': 'per-token',
};

const getExplorerUrl = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

export default function ServicesPanel({
  subscriptions,
  onToggle,
  onRenew,
}: ServicesPanelProps) {
  const activeCount = subscriptions.filter(
    (s) => s.status === 'active'
  ).length;

  const totalThisMonth = subscriptions.reduce(
    (sum, s) => sum + s.totalSpent,
    0
  );

  const nextPayment = subscriptions
    .filter((s) => s.status === 'active' && s.renewsAt)
    .sort(
      (a, b) =>
        new Date(a.renewsAt!).getTime() - new Date(b.renewsAt!).getTime()
    )[0];

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Active Services
          </h2>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">
            {activeCount}
          </span>
        </div>
      </div>

      {/* Service List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {subscriptions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm py-12 text-center">
            <p>
              No services yet.
              <br />
              <span className="text-slate-600 text-xs">
                Ask your agent to subscribe to an API
              </span>
            </p>
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className={`bg-slate-900/60 border rounded-lg p-3 transition-all ${
                sub.status === 'expired'
                  ? 'border-red-500/20 opacity-70'
                  : sub.status === 'paused'
                  ? 'border-amber-500/20 opacity-80'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        sub.status === 'active'
                          ? 'bg-emerald-400'
                          : sub.status === 'paused'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <h3 className="text-sm font-medium text-white truncate">
                      {sub.service}
                    </h3>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{planLabels[sub.plan]}</span>
                    <span>·</span>
                    <span>{sub.price}</span>
                    <span>·</span>
                    <span className="text-slate-400">
                      spent: {sub.totalSpent.toFixed(2)} USDC
                    </span>
                  </div>

                  {sub.renewsAt && sub.status === 'active' && (
                    <p className="text-[10px] text-slate-600 mt-1">
                      renews{' '}
                      {new Date(sub.renewsAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {sub.txHash && (
                    <a
                      href={getExplorerUrl(sub.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-600 hover:text-slate-400 transition-colors"
                      title="View on Stellar Explorer"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {sub.status === 'expired' ? (
                    <button
                      onClick={() => onRenew(sub.id)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Renew
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggle(sub.id)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                      title={
                        sub.status === 'active' ? 'Pause' : 'Resume'
                      }
                    >
                      {sub.status === 'active' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Summary */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/30 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Total this month</span>
          <span className="text-white font-medium">
            {totalThisMonth.toFixed(2)} USDC
          </span>
        </div>

        {nextPayment && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Next auto-payment</span>
            <span className="text-slate-400">
              {nextPayment.price} in{' '}
              {Math.ceil(
                (new Date(nextPayment.renewsAt!).getTime() -
                  Date.now()) /
                  (1000 * 60 * 60 * 24)
              )}{' '}
              days
            </span>
          </div>
        )}

        <a
          href="https://stellar.expert/explorer/testnet"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors mt-1"
        >
          View on Stellar Explorer ↗
        </a>
      </div>
    </div>
  );
}
