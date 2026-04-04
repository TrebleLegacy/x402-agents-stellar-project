'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, Newspaper, Zap, ChevronRight } from 'lucide-react';
import { SpecialistAgentClient } from '@/lib/specialistAgents';

interface SpecialistNetworkProps {
  publicKey: string;
  secretKey: string;
  apiUrl: string;
}

type AgentType = 'defi' | 'security' | 'news';

interface AgentConfig {
  name: string;
  icon: React.ElementType;
  description: string;
  queries: { label: string; params: Record<string, any> }[];
}

const agents: Record<AgentType, AgentConfig> = {
  defi: {
    name: 'DeFi Agent',
    icon: Database,
    description: 'DeFi Protocol Analytics',
    queries: [
      { label: 'Aave TVL', params: { protocol: 'aave', metric: 'tvl' } },
      { label: 'Uniswap Volume', params: { protocol: 'uniswap', metric: 'volume' } },
      { label: 'Curve Users', params: { protocol: 'curve', metric: 'users' } },
    ],
  },
  security: {
    name: 'Security Agent',
    icon: AlertTriangle,
    description: 'Security Analysis',
    queries: [
      { label: 'Quick Scan', params: { target: 'default', scanType: 'quick' } },
      { label: 'Deep Scan', params: { target: 'default', scanType: 'deep' } },
    ],
  },
  news: {
    name: 'News Agent',
    icon: Newspaper,
    description: 'Blockchain News',
    queries: [
      { label: 'Blockchain News', params: { category: 'blockchain', limit: 5 } },
      { label: 'DeFi Updates', params: { category: 'defi', limit: 5 } },
    ],
  },
};

interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
}

export default function SpecialistNetwork({
  publicKey,
  secretKey,
  apiUrl,
}: SpecialistNetworkProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);

  const client = new SpecialistAgentClient(apiUrl, 'testnet');
  client.setKeypair(publicKey, secretKey);

  const handleQuery = async (agent: AgentType, params: Record<string, any>) => {
    setLoading(true);
    setResult(null);

    try {
      let response;
      if (agent === 'defi') {
        response = await client.queryDeFiAgent(params.protocol, params.metric);
      } else if (agent === 'security') {
        response = await client.querySecurity(params.target, params.scanType);
      } else if (agent === 'news') {
        response = await client.queryNews(params.category, params.limit);
      }

      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedAgent) {
    const agent = agents[selectedAgent];
    const AgentIcon = agent.icon;

    return (
      <div className="flex flex-col h-full space-y-4">
        <button
          onClick={() => setSelectedAgent(null)}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
        >
          ← Back to Agents
        </button>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <AgentIcon className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
              <p className="text-xs text-slate-400">{agent.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {agent.queries.map((query, idx) => (
            <button
              key={idx}
              onClick={() => handleQuery(selectedAgent, query.params)}
              disabled={loading}
              className="w-full p-3 text-left text-sm bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-emerald-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-300 group-hover:text-white">{query.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <Zap className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="text-xs text-slate-400">Running agent...</span>
          </div>
        )}

        {result && (
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-xs overflow-y-auto max-h-40">
            {result.success ? (
              <div className="space-y-1">
                <p className="text-emerald-400 font-semibold mb-2">✓ Result</p>
                <pre className="text-slate-300 whitespace-pre-wrap break-words">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-red-400 font-semibold mb-2">✗ Error</p>
                <p className="text-red-300">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        x402 Specialist Network
      </p>
      {(Object.entries(agents) as [AgentType, AgentConfig][]).map(([type, agent]) => {
        const Icon = agent.icon;
        return (
          <button
            key={type}
            onClick={() => setSelectedAgent(type)}
            className="w-full p-3 text-left bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-emerald-500/30 rounded-lg transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-slate-300 group-hover:text-white text-sm">
                  {agent.name}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xs text-slate-500">{agent.description}</p>
          </button>
        );
      })}
    </div>
  );
}
