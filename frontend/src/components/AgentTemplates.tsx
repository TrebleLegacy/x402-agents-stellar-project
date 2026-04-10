'use client';

import React from 'react';
import { Database, AlertTriangle, Newspaper, Brain, TrendingUp, Shield } from 'lucide-react';

export interface AgentTemplate {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  capabilities: string[];
  color: string;
  borderColor: string;
}

interface AgentTemplatesProps {
  onSelectTemplate: (template: AgentTemplate) => void;
  selectedId?: string;
  isLoading?: boolean;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'defi',
    name: 'DeFi Analyzer',
    icon: TrendingUp,
    description: 'Analyze DeFi protocols, TVL, yields, and metrics',
    capabilities: ['protocol-analysis', 'tvl-tracking', 'yield-farming', 'risk-assessment'],
    color: 'from-blue-600 to-blue-500',
    borderColor: 'border-blue-500/30 bg-blue-500/5',
  },
  {
    id: 'security',
    name: 'Security Auditor',
    icon: Shield,
    description: 'Smart contract security audits and vulnerability detection',
    capabilities: ['code-analysis', 'vulnerability-scan', 'gas-optimization', 'audit-report'],
    color: 'from-red-600 to-red-500',
    borderColor: 'border-red-500/30 bg-red-500/5',
  },
  {
    id: 'news',
    name: 'News Aggregator',
    icon: Newspaper,
    description: 'Real-time crypto news and market sentiment analysis',
    capabilities: ['sentiment-analysis', 'news-aggregation', 'market-trends', 'price-feeds'],
    color: 'from-amber-600 to-amber-500',
    borderColor: 'border-amber-500/30 bg-amber-500/5',
  },
  {
    id: 'oracle',
    name: 'Data Oracle',
    icon: Database,
    description: 'On-chain data aggregation and price oracles',
    capabilities: ['price-feeds', 'on-chain-data', 'real-time-updates', 'cross-chain'],
    color: 'from-purple-600 to-purple-500',
    borderColor: 'border-purple-500/30 bg-purple-500/5',
  },
  {
    id: 'ai',
    name: 'AI Agent',
    icon: Brain,
    description: 'General purpose LLM-powered reasoning and autonomy',
    capabilities: ['task-reasoning', 'multi-step-planning', 'reasoning', 'adaptation'],
    color: 'from-emerald-600 to-emerald-500',
    borderColor: 'border-emerald-500/30 bg-emerald-500/5',
  },
];

export default function AgentTemplates({
  onSelectTemplate,
  selectedId,
  isLoading,
}: AgentTemplatesProps) {
  return (
    <div className="w-full space-y-3 rounded-lg bg-slate-900/30 border border-slate-800 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Select Agent Template</h3>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {AGENT_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedId === template.id;

            return (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={`flex flex-col gap-3 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `${template.borderColor} border-opacity-100 ring-2 ring-offset-2 ring-offset-slate-950 scale-105`
                    : `${template.borderColor} border-opacity-50 hover:border-opacity-100`
                }`}
              >
                {/* Header with Icon */}
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${template.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {isSelected && (
                    <div className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                      <span className="text-xs font-bold text-emerald-400">✓ Selected</span>
                    </div>
                  )}
                </div>

                {/* Name and Description */}
                <div className="text-left">
                  <h4 className="font-semibold text-white text-sm">{template.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {template.description}
                  </p>
                </div>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-700/50">
                  {template.capabilities.slice(0, 2).map((cap, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 bg-slate-800/80 text-slate-300 rounded-full"
                    >
                      {cap}
                    </span>
                  ))}
                  {template.capabilities.length > 2 && (
                    <span className="text-[10px] px-2 py-0.5 text-slate-500">
                      +{template.capabilities.length - 2}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
        Click a template to select it, then interact with the chat to see real bidding and trust scores.
      </p>
    </div>
  );
}
