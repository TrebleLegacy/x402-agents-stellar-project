'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, Newspaper, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { SpecialistAgentClient } from '@/lib/specialistAgents';

interface SpecialistAgentsProps {
  publicKey: string;
  secretKey: string;
  apiUrl: string;
}

type AgentType = 'defi' | 'security' | 'news' | null;

interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
}

export default function SpecialistAgents({
  publicKey,
  secretKey,
  apiUrl,
}: SpecialistAgentsProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  // DeFi state
  const [defiProtocol, setDefiProtocol] = useState('aave');
  const [defiMetric, setDefiMetric] = useState<'tvl' | 'volume' | 'users' | 'fees'>('tvl');

  // Security state
  const [securityTarget, setSecurityTarget] = useState('myapp.com');
  const [securityType, setSecurityType] = useState<'quick' | 'deep' | 'comprehensive'>('deep');

  // News state
  const [newsCategory, setNewsCategory] = useState('blockchain');
  const [newsLimit, setNewsLimit] = useState(5);

  const client = new SpecialistAgentClient(apiUrl, 'testnet');
  client.setKeypair(publicKey, secretKey);

  const handleQueryDeFi = async () => {
    setLoading(true);
    try {
      const response = await client.queryDeFiAgent(defiProtocol, defiMetric);
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

  const handleQuerySecurity = async () => {
    setLoading(true);
    try {
      const response = await client.querySecurity(securityTarget, securityType);
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

  const handleQueryNews = async () => {
    setLoading(true);
    try {
      const response = await client.queryNews(newsCategory, newsLimit);
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

  return (
    <div className="space-y-4">
      {selectedAgent === null ? (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSelectedAgent('defi');
              setResult(null);
            }}
            className="p-4 border border-slate-700 hover:border-emerald-500 hover:bg-slate-900/50 rounded-lg transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">DeFi Data</span>
            </div>
            <p className="text-xs text-slate-400">TVL, volume, fees</p>
          </button>

          <button
            onClick={() => {
              setSelectedAgent('security');
              setResult(null);
            }}
            className="p-4 border border-slate-700 hover:border-emerald-500 hover:bg-slate-900/50 rounded-lg transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="font-medium text-white">Security</span>
            </div>
            <p className="text-xs text-slate-400">Scan & analysis</p>
          </button>

          <button
            onClick={() => {
              setSelectedAgent('news');
              setResult(null);
            }}
            className="p-4 border border-slate-700 hover:border-emerald-500 hover:bg-slate-900/50 rounded-lg transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-white">News</span>
            </div>
            <p className="text-xs text-slate-400">Latest updates</p>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedAgent(null)}
            className="text-sm text-slate-400 hover:text-slate-300 mb-4"
          >
            ← Back to all agents
          </button>

          {selectedAgent === 'defi' && (
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
              <h3 className="font-medium text-white">DeFi Data Query</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Protocol</label>
                  <select
                    value={defiProtocol}
                    onChange={(e) => setDefiProtocol(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                  >
                    <option>aave</option>
                    <option>compound</option>
                    <option>uniswap</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Metric</label>
                  <select
                    value={defiMetric}
                    onChange={(e) => setDefiMetric(e.target.value as any)}
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                  >
                    <option>tvl</option>
                    <option>volume</option>
                    <option>users</option>
                    <option>fees</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleQueryDeFi}
                disabled={loading}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700/50 text-white text-sm rounded flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Querying...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Query (0.15 USDC)
                  </>
                )}
              </button>
            </div>
          )}

          {selectedAgent === 'security' && (
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
              <h3 className="font-medium text-white">Security Scan</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Target Domain</label>
                  <input
                    type="text"
                    value={securityTarget}
                    onChange={(e) => setSecurityTarget(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Scan Type</label>
                  <select
                    value={securityType}
                    onChange={(e) => setSecurityType(e.target.value as any)}
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                  >
                    <option>quick</option>
                    <option>deep</option>
                    <option>comprehensive</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleQuerySecurity}
                disabled={loading}
                className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-700/50 text-white text-sm rounded flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Scan (0.20 USDC)
                  </>
                )}
              </button>
            </div>
          )}

          {selectedAgent === 'news' && (
            <div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
              <h3 className="font-medium text-white">News Feed</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Category</label>
                  <select
                    value={newsCategory}
                    onChange={(e) => setNewsCategory(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                  >
                    <option>blockchain</option>
                    <option>defi</option>
                    <option>payments</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newsLimit}
                    onChange={(e) => setNewsLimit(parseInt(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                  />
                </div>
              </div>
              <button
                onClick={handleQueryNews}
                disabled={loading}
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-700/50 text-white text-sm rounded flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Fetch (0.03 USDC)
                  </>
                )}
              </button>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded border space-y-3 ${result.success ? 'border-emerald-700 bg-emerald-900/20' : 'border-red-700 bg-red-900/20'}`}>
              {result.success ? (
                <div className="text-sm space-y-3">
                  {result.data?.reasoning && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-300 mb-2">Agent Reasoning:</h4>
                      <div className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700 italic">
                        {result.data.reasoning}
                      </div>
                    </div>
                  )}
                  <details>
                    <summary className="text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-300">Full Response</summary>
                    <pre className="text-xs text-slate-400 overflow-auto max-h-64 whitespace-pre-wrap mt-2 bg-slate-950 p-2 rounded">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-red-300">{result.error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
