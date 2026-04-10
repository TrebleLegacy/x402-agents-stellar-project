'use client';

import React, { useMemo } from 'react';
import {
  Lock,
  TrendingUp,
  Database,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react';

interface PaidSource {
  id: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  costPerCall: number;
  costUnit: string;
  rateLimit: string;
  responseTime: string;
  trustScore: number;
  dataPoints: string[];
  requiresAuthentication: boolean;
  x402Protected: boolean;
}

const PAID_SOURCES: PaidSource[] = [
  {
    id: 'bloomberg-terminals',
    name: 'Bloomberg Terminal Data',
    description: 'Real-time institutional market data, news, and analytics',
    provider: 'Bloomberg',
    category: 'Financial Data',
    costPerCall: 0.50,
    costUnit: 'XLM per query',
    rateLimit: '1000/day',
    responseTime: '< 100ms',
    trustScore: 98,
    dataPoints: ['Bond yields', 'Equity pricing', 'News feed'],
    requiresAuthentication: true,
    x402Protected: true,
  },
  {
    id: 'refinitiv-data',
    name: 'Refinitiv Data APIs',
    description: 'Enterprise financial data, ESG metrics, and derivatives',
    provider: 'Refinitiv',
    category: 'Financial Data',
    costPerCall: 0.35,
    costUnit: 'XLM per query',
    rateLimit: '500/day',
    responseTime: '< 150ms',
    trustScore: 97,
    dataPoints: ['FX rates', 'Commodities', 'ESG scores'],
    requiresAuthentication: true,
    x402Protected: true,
  },
  {
    id: 'facteus-data',
    name: 'Facteus Intelligence',
    description: 'Alternative data: satellite imagery, credit card transactions, web traffic',
    provider: 'Facteus',
    category: 'Alternative Data',
    costPerCall: 0.45,
    costUnit: 'XLM per query',
    rateLimit: '200/day',
    responseTime: '< 500ms',
    trustScore: 94,
    dataPoints: ['Satellite imagery', 'Transaction flow', 'Foot traffic'],
    requiresAuthentication: true,
    x402Protected: true,
  },
  {
    id: 'sec-edgar-premium',
    name: 'SEC EDGAR Premium (Real-time)',
    description: 'Real-time SEC filings with parsed fundamentals and sentiment',
    provider: 'SEC / Premium Provider',
    category: 'Regulatory Data',
    costPerCall: 0.25,
    costUnit: 'XLM per filing',
    rateLimit: '5000/day',
    responseTime: '< 50ms',
    trustScore: 99,
    dataPoints: ['10-K/Q filings', 'Insider trades', 'Sentiment analysis'],
    requiresAuthentication: true,
    x402Protected: true,
  },
  {
    id: 'chain-data-pro',
    name: 'On-Chain Data Pro',
    description: 'Blockchain analytics: whale wallets, MEV, smart contract risks',
    provider: 'Glassnode / Nansen',
    category: 'Blockchain Data',
    costPerCall: 0.15,
    costUnit: 'XLM per query',
    rateLimit: '2000/day',
    responseTime: '< 200ms',
    trustScore: 96,
    dataPoints: ['Whale movements', 'Smart contract analysis', 'MEV tracking'],
    requiresAuthentication: true,
    x402Protected: true,
  },
  {
    id: 'research-reports',
    name: 'Premium Research Reports',
    description: 'Institutional research reports from sell-side banks and hedge funds',
    provider: 'Research Providers',
    category: 'Research',
    costPerCall: 0.75,
    costUnit: 'XLM per report',
    rateLimit: '100/day',
    responseTime: '< 1s',
    trustScore: 95,
    dataPoints: ['Equity research', 'Macro analysis', 'Credit research'],
    requiresAuthentication: true,
    x402Protected: true,
  },
  {
    id: 'sentiment-premium',
    name: 'Premium Sentiment Analysis',
    description: 'Real-time sentiment from institutional traders, crypto influencers, and media',
    provider: 'Sentiment Providers',
    category: 'Sentiment',
    costPerCall: 0.20,
    costUnit: 'XLM per scan',
    rateLimit: '1000/day',
    responseTime: '< 300ms',
    trustScore: 92,
    dataPoints: ['Institutional positioning', 'Social sentiment', 'Media tone'],
    requiresAuthentication: true,
    x402Protected: true,
  },
  {
    id: 'weather-premium',
    name: 'Weather Data (Commodity Impact)',
    description: 'Premium weather data correlated with agricultural commodity prices',
    provider: 'WeatherPro',
    category: 'Alternative Data',
    costPerCall: 0.10,
    costUnit: 'XLM per query',
    rateLimit: '500/day',
    responseTime: '< 100ms',
    trustScore: 93,
    dataPoints: ['Yield forecasts', 'Crop conditions', 'Price impact'],
    requiresAuthentication: false,
    x402Protected: true,
  },
];

interface PaidDataSourcesProps {
  onSourceSelect?: (source: PaidSource) => void;
}

export default function PaidDataSources({ onSourceSelect }: PaidDataSourcesProps) {
  const categories = useMemo(() => {
    const cats = new Set(PAID_SOURCES.map((s) => s.category));
    return Array.from(cats);
  }, []);

  const sourcesByCategory = useMemo(() => {
    const grouped: Record<string, PaidSource[]> = {};
    PAID_SOURCES.forEach((source) => {
      if (!grouped[source.category]) grouped[source.category] = [];
      grouped[source.category].push(source);
    });
    return grouped;
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4 pb-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Unified Data Sources
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Unified institutional data available via HTTP 402 protocol
        </p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {categories.map((category) => (
          <div key={category} className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              {category}
            </div>
            <div className="space-y-2">
              {sourcesByCategory[category]?.map((source) => (
                <div
                  key={source.id}
                  onClick={() => onSourceSelect?.(source)}
                  className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-3 cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{source.name}</h4>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] text-amber-300 font-medium">x402</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{source.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/50 rounded px-2 py-1.5 border border-slate-700">
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-slate-500">Cost</span>
                      </div>
                      <div className="text-sm font-mono text-emerald-300">
                        {source.costPerCall} {source.costUnit}
                      </div>
                    </div>

                    <div className="bg-slate-900/50 rounded px-2 py-1.5 border border-slate-700">
                      <div className="flex items-center gap-1 mb-1">
                        <Zap className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] text-slate-500">Response</span>
                      </div>
                      <div className="text-sm font-mono text-blue-300">
                        {source.responseTime}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] text-slate-500">Trust Score</span>
                      <span className="text-xs font-semibold text-slate-300 ml-auto">
                        {source.trustScore}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{ width: `${source.trustScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700">
                    <div className="text-[10px] text-slate-500 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>Rate limit: {source.rateLimit}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {source.dataPoints.map((point) => (
                          <span
                            key={point}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 rounded text-slate-300"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600">
                    Provider: <span className="text-slate-400 font-medium">{source.provider}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-amber-300">Unified Access</span>
        </div>
        <p className="text-xs text-amber-200/70">
          All data sources are protected by HTTP 402 protocol. Payment required per query. Trust scores dynamically updated based on data accuracy and uptime.
        </p>
      </div>
    </div>
  );
}
