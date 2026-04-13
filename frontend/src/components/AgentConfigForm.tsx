'use client';

import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { AgentConfig as AgentConfigType } from '@/types/agent';
import { AGENT_PRESETS } from '@/data/agentPresets';

interface AgentConfigProps {
  onConfigSubmit: (config: AgentConfigType) => void;
  isLoading: boolean;
  walletConnected: boolean;
  loadPresetId?: string | null;
}

export default function AgentConfigForm({
  onConfigSubmit,
  isLoading,
  walletConnected,
  loadPresetId,
}: AgentConfigProps) {
  const [config, setConfig] = useState<AgentConfigType>({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'gpt-4o',
    temperature: 0.4,
    maxTokens: 2000,
  });

  const handleLoadPremade = (presetId: string) => {
    const preset = AGENT_PRESETS.find((agent) => agent.id === presetId);
    if (!preset) return;
    setConfig({
      name: preset.name,
      description: preset.description,
      systemPrompt: preset.systemPrompt,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
      model: preset.model || 'gpt-4o',
    });
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
        <p className="text-sm text-slate-400">Select a template above, then launch</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Agent Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Select a template or type a name"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {config.name && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Ready to launch</p>
            <p className="text-sm text-white font-medium">{config.name}</p>
            {config.description && (
              <p className="text-xs text-slate-400 mt-1">{config.description}</p>
            )}
          </div>
        )}

        {!walletConnected && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 text-center">
            Connect your Freighter wallet to launch an agent
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
