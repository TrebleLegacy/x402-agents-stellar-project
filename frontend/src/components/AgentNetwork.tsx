'use client';

import React from 'react';
import {
  Database,
  AlertTriangle,
  Newspaper,
  Lock,
  Activity,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import { SpecialistAgent } from '@/types/agents';

const SAMPLE_AGENTS: SpecialistAgent[] = [
  {
    id: 'defi-agent',
    name: 'DeFi Data Agent',
    capability: 'Real-time TVL & Protocol Metrics',
    endpoint: 'https://defi-agent.example.com/tvl',
    description: 'Queries live blockchain data for protocol metrics',
    priceCalculator:
      'Calculate price based on data freshness (0.10-0.50 USDC per query)',
    basePrice: '0.15',
    icon: 'Database',
    status: 'online',
  },
  {
    id: 'security-agent',
    name: 'Security Scanner',
    capability: 'Incident Detection & Analysis',
    endpoint: 'https://security-agent.example.com/scan',
    description: 'Detects and analyzes security vulnerabilities',
    priceCalculator:
      'Dynamic pricing based on scan depth (0.05-0.30 USDC per scan)',
    basePrice: '0.20',
    icon: 'AlertTriangle',
    status: 'online',
  },
  {
    id: 'news-agent',
    name: 'News Feed Agent',
    capability: 'Curated News & Articles',
    endpoint: 'https://news-agent.example.com/feed',
    description: 'Provides relevant news filtered by relevance',
    priceCalculator: 'Pay-per-article model (0.01-0.05 USDC per article)',
    basePrice: '0.03',
    icon: 'Newspaper',
    status: 'online',
  },
  {
    id: 'quarantine-agent',
    name: 'Quarantine Agent',
    capability: 'Prompt Injection Defense',
    endpoint: 'https://quarantine-agent.example.com/scan',
    description: 'Detects and sanitizes harmful content',
    priceCalculator:
      'Fixed price with reputation staking (0.02 USDC per content)',
    basePrice: '0.02',
    icon: 'Lock',
    status: 'online',
  },
];

const getIconComponent = (iconName: string) => {
  const icons: { [key: string]: React.ReactNode } = {
    Database: <Database className="w-5 h-5" />,
    AlertTriangle: <AlertTriangle className="w-5 h-5" />,
    Newspaper: <Newspaper className="w-5 h-5" />,
    Lock: <Lock className="w-5 h-5" />,
  };
  return icons[iconName] || <Activity className="w-5 h-5" />;
};

interface AgentNetworkProps {
  onAgentSelect?: (agent: SpecialistAgent) => void;
}

export default function AgentNetwork({ onAgentSelect }: AgentNetworkProps) {
  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Agent Network</h2>
        </div>
        <p className="text-sm text-slate-400">
          {SAMPLE_AGENTS.length} specialist agents online
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {SAMPLE_AGENTS.map((agent, idx) => (
          <div
            key={agent.id}
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer"
            onClick={() => onAgentSelect?.(agent)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                  {getIconComponent(agent.icon)}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white text-sm">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {agent.capability}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-900/30 rounded-full border border-emerald-700/50">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-300 font-medium">
                  Online
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ArrowRight className="w-4 h-4 text-slate-600" />
                <code className="text-slate-300 font-mono text-xs max-w-[200px] truncate">
                  {agent.endpoint}
                </code>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400">
                  Base price: <span className="text-amber-300">{agent.basePrice} USDC</span>
                </span>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded px-3 py-2 border border-slate-800">
              <p className="text-xs text-slate-400">
                <span className="text-slate-300 font-mono">PriceCalculator:</span>
                <br />
                <span className="text-slate-500 italic">{agent.priceCalculator}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors">
          View Registry
        </button>
      </div>
    </div>
  );
}
