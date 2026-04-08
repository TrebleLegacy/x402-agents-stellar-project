'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ApiTool, NetworkExecutionResponse } from '@/types/network';
import { InteractionLogEvent } from '@/types/agent';

interface ApiToolNetworkPanelProps {
  apiUrl: string;
  context: NetworkExecutionResponse | null;
  isRunning: boolean;
  onRunExample: (query: string) => void;
  onLog?: (event: InteractionLogEvent) => void;
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

const EXAMPLES = [
  {
    label: 'Ops Weather Agent',
    query: 'Get the current weather in Lisbon and assess wind risk for drone dispatch.',
  },
  {
    label: 'Crypto Market Watch',
    query: 'Get the Bitcoin price in USD and return a quick market pulse.',
  },
  {
    label: 'Repo Health Agent',
    query: 'Fetch GitHub repo stats for vercel/next.js and highlight stars and open issues.',
  },
  {
    label: 'HN Signal Scanner',
    query: 'Find recent Hacker News stories about AI agents and list the top 3.',
  },
  {
    label: 'FX Treasury Agent',
    query: 'Get the latest USD to BRL exchange rate and provide a short treasury note.',
  },
  {
    label: 'GitHub Search Agent',
    query: 'Search GitHub for repositories about agentic payments and return top results.',
  },
  {
    label: 'Weather Alert Agent',
    query: 'Check weather in Sao Paulo and report temperature and wind speed.',
  },
  {
    label: 'Crypto Comparator',
    query: 'Get the Ethereum price in EUR and compare it to Bitcoin price in EUR.',
  },
  {
    label: 'Stripe Ops Agent',
    query: 'Fetch Stripe balance snapshot and summarize available vs pending.',
  },
  {
    label: 'Twilio Ops Agent',
    query: 'Get Twilio account status and report if the account is active.',
  },
  {
    label: 'Dev Rel Scout',
    query: 'Search GitHub for repos about agent tools and list the top 3 by stars.',
  },
  {
    label: 'Comms Reliability Agent',
    query: 'Check Twilio account status and summarize any risk signals.',
  },
  {
    label: 'Stripe Cash Flow Monitor',
    query: 'Retrieve Stripe balance and highlight pending vs available amounts.',
  },
  {
    label: 'Global Weather Ops',
    query: 'Get the current weather in Tokyo and provide a short ops summary.',
  },
  {
    label: 'Crypto Treasury Snapshot',
    query: 'Get BTC price in USD and ETH price in USD for a treasury snapshot.',
  },
  {
    label: 'Market FX Check',
    query: 'Get the latest EUR to USD exchange rate and provide a short note.',
  },
  {
    label: 'Tech News Curator',
    query: 'Find recent Hacker News stories about payments and list the top 3.',
  },
  {
    label: 'OSS Due Diligence Agent',
    query: 'Fetch GitHub repo stats for openai/openai-node and summarize maintenance signals.',
  },
  {
    label: 'Crypto Risk Monitor',
    query: 'Get the Bitcoin price in USD and provide a one-line volatility hint.',
  },
  {
    label: 'Weather Logistics Agent',
    query: 'Check weather in New York and report temperature and wind for delivery routing.',
  },
];

export default function ApiToolNetworkPanel({
  apiUrl,
  context,
  isRunning,
  onRunExample,
  onLog,
}: ApiToolNetworkPanelProps) {
  const [tools, setTools] = useState<ApiTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeExample, setActiveExample] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadRegistry = async () => {
      setLoadingTools(true);
      setError(null);
      try {
        const response = await fetch(`${apiUrl}/api/network/registry`);
        const data = await parseResponseJson(response);
        if (!response.ok) {
          throw new Error(data?.error || data?.__raw || 'Failed to load API registry');
        }
        if (mounted) {
          setTools(data.tools || []);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load API registry');
        }
      } finally {
        if (mounted) {
          setLoadingTools(false);
        }
      }
    };

    loadRegistry();

    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  const callableCount = useMemo(
    () => tools.filter((tool) => tool.callable).length,
    [tools]
  );

  const handleExample = (query: string) => {
    setActiveExample(query);
    onRunExample(query);
    onLog?.({
      at: new Date().toISOString(),
      source: 'network',
      stage: 'context_example_selected',
      detail: 'Context example selected for tool routing',
      payload: { query },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-sky-300" />
        <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
          API Tool Network
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Registry</span>
          <span className="text-emerald-300">
            {loadingTools ? 'loading' : `${callableCount} live tools`}
          </span>
        </div>
        {error && (
          <p className="text-xs text-red-300">{error}</p>
        )}
        <div className="max-h-32 overflow-y-auto space-y-2">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/70 border border-slate-800 rounded px-2 py-1"
            >
              <span className="text-slate-200 truncate">{tool.name}</span>
              <span className={tool.callable ? 'text-emerald-300' : 'text-amber-300'}>
                {tool.callable ? 'live' : 'key'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 uppercase">Context Examples</span>
          {isRunning && (
            <span className="text-[11px] text-amber-300 flex items-center gap-1">
              <Zap className="w-3 h-3 animate-pulse" />
              routing
            </span>
          )}
        </div>
        <div className="space-y-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              onClick={() => handleExample(example.query)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors ${
                activeExample === example.query
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Latest Tool Plan</span>
          <span className="text-slate-500">{context?.query ? 'active' : 'idle'}</span>
        </div>
        {context ? (
          <div className="space-y-2 text-[11px] text-slate-300">
            <p className="text-slate-400">Query: {context.query}</p>
            {context.analysis && (
              <div className="bg-slate-950/70 border border-slate-800 rounded p-2">
                <p className="text-sky-300">LLM Preprocess</p>
                {context.analysis.normalizedQuery && (
                  <p className="text-slate-400 mt-1">
                    Normalized: {context.analysis.normalizedQuery}
                  </p>
                )}
                {context.analysis.intent && (
                  <p className="text-slate-400">Intent: {context.analysis.intent}</p>
                )}
                {context.analysis.clarifyingQuestion && (
                  <p className="text-slate-400">
                    Clarify: {context.analysis.clarifyingQuestion}
                  </p>
                )}
              </div>
            )}
            <div className="bg-slate-950/70 border border-slate-800 rounded p-2">
              <p className="text-emerald-300">Reasoning</p>
              <p className="text-slate-400 mt-1">{context.plan?.reasoning}</p>
            </div>
            <div className="space-y-2">
              {context.toolCalls?.map((call) => (
                <div
                  key={call.id}
                  className="bg-slate-950/70 border border-slate-800 rounded p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200">{call.name}</span>
                    <span className={call.status === 'success' ? 'text-emerald-300' : 'text-red-300'}>
                      {call.status}
                    </span>
                  </div>
                  <pre className="mt-2 text-[10px] text-slate-400 whitespace-pre-wrap break-words">
                    {JSON.stringify(call.status === 'success' ? call.data : call.error, null, 2)}
                  </pre>
                  <div className="text-[10px] text-slate-500 mt-1">{call.durationMs}ms</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Run a query to see tool routing.
          </div>
        )}
      </div>

      {context && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          Agent consumed {context.toolCalls?.length || 0} tools for this context.
        </div>
      )}
    </div>
  );
}
