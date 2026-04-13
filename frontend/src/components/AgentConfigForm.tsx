'use client';

import React, { useEffect, useState } from 'react';
import { Rocket } from 'lucide-react';
import { AgentConfig as AgentConfigType } from '@/types/agent';
import { AGENT_PRESETS } from '@/data/agentPresets';

const QUICK_TEMPLATES = [
  { id: 'forge-operator', name: 'Autonomous Analyst', icon: '🤖', desc: 'Auto-pays for data it needs', cost: '~0.001–0.003 USDC / query' },
  { id: 'market-brief',   name: 'Market Brief',       icon: '📊', desc: 'Treasury brief: crypto, FX, macro', cost: '~0.001 USDC / query' },
  { id: 'quick-scan',     name: 'Security Scanner',    icon: '🔒', desc: 'Smart contract audits', cost: '~0.002 USDC / query' },
];

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfigType>({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'gpt-4o',
    temperature: 0.4,
    maxTokens: 2000,
  });

  const selectPreset = (presetId: string) => {
    const preset = AGENT_PRESETS.find((a) => a.id === presetId);
    if (!preset) return;
    setSelectedId(presetId);
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
    selectPreset(loadPresetId);
  }, [loadPresetId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.name.trim()) return;
    onConfigSubmit(config);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-5 border-b border-slate-800 bg-slate-950/95">
        <div className="flex items-center gap-2 mb-1">
          <Rocket className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Launch Agent</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-5 space-y-3 flex flex-col">
        {/* Template picker */}
        <div className="space-y-2">
          {QUICK_TEMPLATES.map((t) => {
            const active = selectedId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectPreset(t.id)}
                disabled={!walletConnected}
                className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <span className="text-xl shrink-0">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${active ? 'text-emerald-300' : 'text-white'}`}>{t.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{t.desc}</p>
                </div>
                <span className={`text-[10px] font-mono shrink-0 px-2 py-0.5 rounded-full ${active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  {t.cost}
                </span>
              </button>
            );
          })}
        </div>

        {/* Wallet gate */}
        {!walletConnected && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 text-center">
            Connect Freighter to launch
          </div>
        )}

        {/* Launch */}
        <button
          type="submit"
          disabled={isLoading || !selectedId || !walletConnected}
          className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
        >
          {isLoading ? 'Launching…' : selectedId ? `Launch ${config.name}` : 'Select an agent'}
        </button>
      </form>
    </div>
  );
}
