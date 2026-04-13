'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Shield } from 'lucide-react';
import { AgentConfig as AgentConfigType } from '@/types/agent';
import { AGENT_PRESETS } from '@/data/agentPresets';
import { AgentWallet } from '@/lib/x402Client';

interface AgentConfigProps {
  onConfigSubmit: (config: AgentConfigType) => void;
  isLoading: boolean;
  walletConnected: boolean;
  loadPresetId?: string | null;
  agentWallet?: AgentWallet | null;
  budgetLimit?: number;
  onBudgetChange?: (limit: number) => void;
}

export default function AgentConfigForm({
  onConfigSubmit,
  isLoading,
  walletConnected,
  loadPresetId,
  agentWallet,
  budgetLimit = 10,
  onBudgetChange,
}: AgentConfigProps) {
  const [config, setConfig] = useState<AgentConfigType>({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'gpt-4o',
    temperature: 0.4,
    maxTokens: 2000,
  });

  const handleConfigChange = (field: keyof AgentConfigType, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleLoadPremade = (presetId: string) => {
    const preset = AGENT_PRESETS.find((agent) => agent.id === presetId);
    if (!preset) return;
    setConfig(prev => ({
      ...prev,
      name: preset.name,
      description: preset.description,
      systemPrompt: preset.systemPrompt,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
      model: preset.model || prev.model,
    }));
  };

  useEffect(() => {
    if (!loadPresetId) return;
    handleLoadPremade(loadPresetId);
  }, [loadPresetId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.name.trim()) {
      alert('Agent name is required');
      return;
    }
    onConfigSubmit(config);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="sticky top-0 p-6 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Configure Agent</h2>
        </div>
        <p className="text-sm text-slate-400">Create and launch a new agent</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Agent Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={e => handleConfigChange('name', e.target.value)}
            placeholder="e.g., DeFi Analyzer"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Description
          </label>
          <textarea
            value={config.description}
            onChange={e => handleConfigChange('description', e.target.value)}
            placeholder="What does this agent do?"
            rows={2}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            System Prompt
          </label>
          <textarea
            value={config.systemPrompt || ''}
            onChange={e => handleConfigChange('systemPrompt', e.target.value)}
            placeholder="Define the agent's behavior and capabilities..."
            rows={4}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors resize-none font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Model
            </label>
            <select
              value={config.model}
              onChange={e =>
                handleConfigChange('model', e.target.value as any)
              }
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none transition-colors"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={e =>
                handleConfigChange('temperature', parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Max Tokens
          </label>
          <input
            type="number"
            min="100"
            max="4000"
            step="100"
            value={config.maxTokens}
            onChange={e =>
              handleConfigChange('maxTokens', parseInt(e.target.value))
            }
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Agent Sub-Account */}
        {walletConnected && (
          <div className="space-y-3 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Agent Sub-Account</h3>
            </div>

            {agentWallet ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-mono">
                    {agentWallet.publicKey.slice(0, 8)}...{agentWallet.publicKey.slice(-4)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Autonomous signing — no popups. Budget enforced on-chain.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-400">Daily Budget (XLM)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="1000"
                    step="0.5"
                    value={budgetLimit}
                    onChange={(e) => onBudgetChange?.(parseFloat(e.target.value) || 10)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
                Provisioning agent account...
              </div>
            )}
          </div>
        )}

        {!walletConnected && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 text-center">
            Connect your Freighter wallet in the sidebar to launch an agent
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !config.name.trim() || !walletConnected}
          className="w-full mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Launching...' : 'Launch Agent'}
        </button>
      </form>
    </div>
  );
}
