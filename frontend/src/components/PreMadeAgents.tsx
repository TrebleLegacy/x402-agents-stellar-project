'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Database, AlertTriangle, Newspaper, Zap, ChevronRight, X } from 'lucide-react';
import { SpecialistAgentClient } from '@/lib/specialistAgents';
import { InteractionLogEvent } from '@/types/agent';

interface PreMadeAgentsProps {
  publicKey?: string;
  secretKey?: string;
  apiUrl: string;
  onClose?: () => void;
  onWalletLoaded?: (keypair: { publicKey: string; secret: string }) => void;
  onLog?: (event: InteractionLogEvent) => void;
}

type AgentTab = 'defi' | 'security' | 'news';

interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
}

const agentTemplates = {
  defi: {
    name: 'DeFi Agent',
    icon: Database,
    description: 'Analyze DeFi protocols and metrics',
    presets: [
      { label: 'Aave TVL', protocol: 'aave', metric: 'tvl' },
      { label: 'Uniswap Volume', protocol: 'uniswap', metric: 'volume' },
      { label: 'Curve Finance Users', protocol: 'curve', metric: 'users' },
      { label: 'Protocol Fees', protocol: 'aave', metric: 'fees' },
    ],
  },
  security: {
    name: 'Security Agent',
    icon: AlertTriangle,
    description: 'Run security scans and audits',
    presets: [
      { label: 'Quick Scan', target: 'myapp.com', scanType: 'quick' },
      { label: 'Deep Scan', target: 'myapp.com', scanType: 'deep' },
      { label: 'Comprehensive Audit', target: 'myapp.com', scanType: 'comprehensive' },
    ],
  },
  news: {
    name: 'News Agent',
    icon: Newspaper,
    description: 'Get latest blockchain news',
    presets: [
      { label: 'Blockchain News', category: 'blockchain', limit: 5 },
      { label: 'DeFi Updates', category: 'defi', limit: 5 },
      { label: 'Security Alerts', category: 'security', limit: 5 },
      { label: 'Market News', category: 'market', limit: 10 },
    ],
  },
};

export default function PreMadeAgents({
  publicKey: propPublicKey,
  secretKey: propSecretKey,
  apiUrl,
  onClose,
  onWalletLoaded,
  onLog,
}: PreMadeAgentsProps) {
  const [activeTab, setActiveTab] = useState<AgentTab>('defi');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [inputPublicKey, setInputPublicKey] = useState('');
  const [inputSecretKey, setInputSecretKey] = useState('');
  const [walletLoaded, setWalletLoaded] = useState(false);
  
  const clientRef = useRef<SpecialistAgentClient>(new SpecialistAgentClient(apiUrl, 'testnet'));

  useEffect(() => {
    clientRef.current.setLogger(onLog);
  }, [onLog]);

  useEffect(() => {
    if (propPublicKey && propSecretKey) {
      clientRef.current.setKeypair(propPublicKey, propSecretKey);
      setWalletLoaded(true);
      return;
    }
    setWalletLoaded(false);
  }, [propPublicKey, propSecretKey]);

  const publicKey = propPublicKey || inputPublicKey;
  const secretKey = propSecretKey || inputSecretKey;
  const hasKeys = walletLoaded;

  const handleUseWallet = () => {
    if (inputPublicKey && inputSecretKey) {
      clientRef.current.setKeypair(inputPublicKey, inputSecretKey);
      setWalletLoaded(true);
      setResult(null);
      onWalletLoaded?.({ publicKey: inputPublicKey, secret: inputSecretKey });
    }
  };

  const handleRunPreset = async (presetIndex: number) => {
    if (!walletLoaded || !publicKey || !secretKey) {
      setResult({
        success: false,
        error: 'Configure and load wallet first',
      });
      return;
    }

    setSelectedPreset(presetIndex);
    setLoading(true);
    setResult(null);

    try {
      const template = agentTemplates[activeTab];
      const preset = template.presets[presetIndex];

      onLog?.({
        at: new Date().toISOString(),
        source: 'specialist',
        stage: 'preset_selected',
        detail: `Running ${template.name} preset`,
        payload: preset,
      });

      let response;
      if (activeTab === 'defi') {
        response = await clientRef.current.queryDeFiAgent(
          (preset as any).protocol,
          (preset as any).metric
        );
      } else if (activeTab === 'security') {
        response = await clientRef.current.querySecurity(
          (preset as any).target,
          (preset as any).scanType
        );
      } else if (activeTab === 'news') {
        response = await clientRef.current.queryNews(
          (preset as any).category,
          (preset as any).limit
        );
      }

      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Agent error',
      });
      onLog?.({
        at: new Date().toISOString(),
        source: 'specialist',
        stage: 'preset_failed',
        detail: 'Quick agent preset failed',
        payload: error.message || 'Agent error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between gap-1 border-b border-slate-700 bg-slate-950 p-2">
        <div className="flex gap-1 flex-1">
          {(Object.keys(agentTemplates) as AgentTab[]).map((tab) => {
            const TabTemplate = agentTemplates[tab];
            const TabIcon = TabTemplate.icon;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setResult(null);
                  setSelectedPreset(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{TabTemplate.name}</span>
              </button>
            );
          })}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!hasKeys ? (
          <>
            <div className="border-b border-slate-700 p-4 bg-slate-950/50">
              <p className="text-sm font-semibold text-white">Enter Wallet Keys</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">
                  Public Key
                </label>
                <input
                  type="text"
                  value={inputPublicKey}
                  onChange={(e) => setInputPublicKey(e.target.value)}
                  placeholder="Your public key here"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={inputSecretKey}
                  onChange={(e) => setInputSecretKey(e.target.value)}
                  placeholder="Your secret key here"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleUseWallet}
                disabled={!inputPublicKey || !inputSecretKey}
                className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
              >
                Use This Wallet
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-slate-700 p-4 bg-slate-950/50">
              <div className="flex items-start gap-2">
                <Database className="w-5 h-5 text-emerald-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-white text-sm">{agentTemplates[activeTab].name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{agentTemplates[activeTab].description}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {agentTemplates[activeTab].presets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleRunPreset(index)}
                  disabled={loading}
                  className={`w-full p-3 rounded border transition-all text-left text-sm ${
                    selectedPreset === index ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-300">{preset.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </button>
              ))}
            </div>

            {result && (
              <div className="border-t border-slate-700 p-4 bg-slate-950/50 max-h-40 overflow-y-auto">
                {result.success ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-emerald-400">✓ Result</p>
                    <pre className="text-xs text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-red-400 mb-1">✗ Error</p>
                    <p className="text-xs text-red-300">{result.error}</p>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="border-t border-slate-700 p-4 bg-slate-950/50 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-xs text-slate-400">Running...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
