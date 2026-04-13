'use client';

import React, { useState } from 'react';
import { Zap, Globe, Shield, BarChart3, Newspaper, Loader2 } from 'lucide-react';

export interface APIService {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  price: string;
  priceXLM: number;
  billing: 'per-query' | 'daily' | 'monthly';
  category: 'defi' | 'security' | 'news' | 'agent';
  endpoint: string;
  features: string[];
}

const API_SERVICES: APIService[] = [
  {
    id: 'defi-data',
    name: 'DeFi Data API',
    description: 'Real-time TVL, volume, and protocol metrics from DefiLlama and The Graph.',
    icon: <BarChart3 className="w-5 h-5 text-blue-400" />,
    price: '0.001 XLM',
    priceXLM: 0.001,
    billing: 'per-query',
    category: 'defi',
    endpoint: '/api/agent/query',
    features: ['TVL tracking', 'Volume analytics', 'Protocol fees', 'Historical data'],
  },
  {
    id: 'security-scan',
    name: 'Security Audit API',
    description: 'Smart contract analysis, vulnerability scanning, and risk assessment.',
    icon: <Shield className="w-5 h-5 text-amber-400" />,
    price: '0.002 XLM',
    priceXLM: 0.002,
    billing: 'per-query',
    category: 'security',
    endpoint: '/api/agent/query',
    features: ['Contract scanning', 'Vulnerability detection', 'Risk scoring', 'Audit reports'],
  },
  {
    id: 'news-feed',
    name: 'Crypto News API',
    description: 'Aggregated news from blockchain, DeFi, and market sources.',
    icon: <Newspaper className="w-5 h-5 text-purple-400" />,
    price: '0.001 XLM',
    priceXLM: 0.001,
    billing: 'per-query',
    category: 'news',
    endpoint: '/api/agent/query',
    features: ['Real-time feed', 'Sentiment analysis', 'Alert triggers', 'Topic filtering'],
  },
  {
    id: 'market-intel',
    name: 'Market Intelligence',
    description: 'FX rates, price feeds, and macro indicators for treasury operations.',
    icon: <Globe className="w-5 h-5 text-emerald-400" />,
    price: '0.001 XLM',
    priceXLM: 0.001,
    billing: 'per-query',
    category: 'defi',
    endpoint: '/api/agent/query',
    features: ['Price feeds', 'FX rates', 'Macro signals', 'Portfolio context'],
  },
];

const AGENT_TEMPLATES = [
  {
    id: 'forge-operator',
    name: 'Autonomous Analyst',
    description: 'Ask anything — the agent auto-pays for the data it needs.',
    icon: '🤖',
  },
  {
    id: 'market-brief',
    name: 'Market Brief',
    description: 'Daily treasury brief with crypto, FX, and macro signals.',
    icon: '📊',
  },
  {
    id: 'quick-scan',
    name: 'Security Scanner',
    description: 'Run security audits on smart contracts.',
    icon: '🔒',
  },
];

interface ServiceCatalogProps {
  onSubscribe: (service: APIService) => Promise<void>;
  onLaunchAgent: (presetId: string) => void;
  walletConnected: boolean;
  /** Service IDs that are currently subscribed (source of truth from parent) */
  subscribedServiceIds: Set<string>;
}

export default function ServiceCatalog({
  onSubscribe,
  onLaunchAgent,
  walletConnected,
  subscribedServiceIds,
}: ServiceCatalogProps) {
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  const handleSubscribe = async (service: APIService) => {
    setSubscribingId(service.id);
    try {
      await onSubscribe(service);
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800 shrink-0">
        <h1 className="text-xl font-bold text-white tracking-tight">x402 Marketplace</h1>
        <p className="text-sm text-slate-500 mt-1">Subscribe to paid APIs or launch an agent</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Agent Templates */}
        <div className="px-6 py-4">
          <h2 className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-3">Launch an Agent</h2>
          <div className="grid grid-cols-3 gap-3">
            {AGENT_TEMPLATES.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onLaunchAgent(agent.id)}
                disabled={!walletConnected}
                className="text-left p-4 bg-slate-900/60 rounded-xl border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-2xl mb-2">{agent.icon}</div>
                <h3 className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{agent.name}</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">{agent.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="px-6">
          <div className="border-t border-slate-800" />
        </div>

        {/* API Services */}
        <div className="px-6 py-4">
          <h2 className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-3">Paid API Services</h2>
          <div className="space-y-3">
            {API_SERVICES.map((service) => {
              const isSubscribed = subscribedServiceIds.has(service.id);
              const isLoading = subscribingId === service.id;
              return (
                <div
                  key={service.id}
                  className={`rounded-xl border transition-all ${
                    isSubscribed
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/50">
                        {service.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-medium text-white">{service.name}</h3>
                          <span className="text-xs text-emerald-400 font-mono shrink-0">{service.price}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{service.description}</p>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {service.features.map((f) => (
                            <span key={f} className="text-[10px] px-2 py-0.5 bg-slate-800/80 text-slate-400 rounded-full">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-600">{service.billing} · {service.endpoint}</span>
                      {isSubscribed ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Subscribed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(service)}
                          disabled={!walletConnected || isLoading}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Signing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              Add to AgentPay
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!walletConnected && (
          <div className="px-6 pb-6">
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
              <p className="text-xs text-amber-400/80">Connect your Freighter wallet to subscribe to services</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
