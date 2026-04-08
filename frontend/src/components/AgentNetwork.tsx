'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CloudSun,
  Code2,
  Cpu,
  CreditCard,
  Globe,
  Newspaper,
  Radar,
} from 'lucide-react';
import { ApiTool } from '@/types/network';


const iconByCategory: Record<string, React.ReactNode> = {
  AI: <Cpu className="w-5 h-5" />,
  Payments: <CreditCard className="w-5 h-5" />,
  Dev: <Code2 className="w-5 h-5" />,
  Data: <CloudSun className="w-5 h-5" />,
  Market: <BarChart3 className="w-5 h-5" />,
  News: <Newspaper className="w-5 h-5" />,
  Comms: <Radar className="w-5 h-5" />,
  Default: <Globe className="w-5 h-5" />,
};

interface AgentNetworkProps {
  apiUrl: string;
  onAgentSelect?: (tool: ApiTool) => void;
}

const parseResponseJson = async (response: Response): Promise<any> => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { __raw: text };
  }
};

export default function AgentNetwork({ apiUrl, onAgentSelect }: AgentNetworkProps) {
  const [tools, setTools] = useState<ApiTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadTools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/api/network/registry`);
        const data = await parseResponseJson(response);
        if (!response.ok) {
          throw new Error(data?.error || data?.__raw || 'Failed to load registry');
        }
        if (mounted && Array.isArray(data?.tools)) {
          setTools(data.tools);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load registry');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadTools();
    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  const total = useMemo(() => tools.length, [tools]);

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">API Network</h2>
        </div>
        <p className="text-sm text-slate-400">
          {loading ? 'Loading registry…' : `${total} APIs available`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error ? (
          <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded p-3">
            {error}
          </div>
        ) : tools.length === 0 ? (
          <div className="text-xs text-slate-500">No APIs available.</div>
        ) : (
          tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer"
              onClick={() => onAgentSelect?.(tool)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                    {iconByCategory[tool.category] || iconByCategory.Default}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white text-sm">{tool.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{tool.description}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${
                  tool.callable
                    ? 'bg-emerald-900/30 border-emerald-700/50'
                    : 'bg-amber-900/30 border-amber-700/50'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${tool.callable ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className={`text-xs font-medium ${tool.callable ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {tool.callable ? 'Live' : 'Key required'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                  <code className="text-slate-300 font-mono text-xs max-w-[200px] truncate">
                    {tool.endpoint}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-slate-500">Pricing:</span>
                  <span className="text-amber-300">{tool.pricing}</span>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded px-3 py-2 border border-slate-800">
                <p className="text-xs text-slate-400">
                  <span className="text-slate-300">Category:</span> {tool.category} · <span className="text-slate-300">Auth:</span> {tool.auth}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors">
          Browse API Catalog
        </button>
      </div>
    </div>
  );
}
