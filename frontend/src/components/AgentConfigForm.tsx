'use client';

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { AgentConfig as AgentConfigType } from '@/types/agent';
import WalletManager from './WalletManager';

const PREMADE_AGENTS = [
  {
    id: 'forge-operator',
    name: 'Forge Market Operator',
    description: 'Select paid x402 tools, weigh cost vs value, and return concise results with traceable tool choices.',
    systemPrompt: [
      'You are a Forge v2 operator for paid agent tools.',
      'Use the API tool network to choose up to two paid x402 tools based on intent.',
      'State which tools were used and why, then provide the result clearly.',
      'Ask one clarifying question if intent is ambiguous.',
      'Be concise, do not use emojis.',
    ].join('\n'),
    temperature: 0.4,
    maxTokens: 1200,
    model: 'gpt-4o' as const,
  },
  {
    id: 'ops-analyst',
    name: 'Ops Intelligence Agent',
    description: 'Use x402 tools to deliver operational briefs with short, action-ready summaries.',
    systemPrompt: [
      'You are an operations intelligence agent.',
      'Use the API tool network to fetch data and return an actionable brief.',
      'If a single tool answers the question, do not call more than one.',
      'Include a one-line recommendation at the end.',
      'Be concise and structured, no emojis.',
    ].join('\n'),
    temperature: 0.35,
    maxTokens: 1000,
    model: 'gpt-4o' as const,
  },
  {
    id: 'market-brief',
    name: 'Market Brief Agent',
    description: 'Monitor crypto, FX, and macro signals with crisp summaries for treasury teams.',
    systemPrompt: [
      'You are a market brief agent for treasury teams.',
      'Use price and FX tools to answer the request with numeric context.',
      'List key metrics first, then provide a short interpretation.',
      'Avoid speculation; use tool data only.',
      'No emojis.',
    ].join('\n'),
    temperature: 0.3,
    maxTokens: 900,
    model: 'gpt-4o' as const,
  },
  {
    id: 'dev-scout',
    name: 'Dev Rel Scout',
    description: 'Use GitHub and Hacker News tools to scout developer trends and report highlights.',
    systemPrompt: [
      'You are a developer relations scout.',
      'Use GitHub and Hacker News tools to collect relevant signals.',
      'Return top items with short context and why they matter.',
      'Ask a clarifying question only if the topic is too broad.',
      'No emojis.',
    ].join('\n'),
    temperature: 0.45,
    maxTokens: 1100,
    model: 'gpt-4o' as const,
  },
];

interface AgentConfigProps {
  onConfigSubmit: (config: AgentConfigType, keypair: { publicKey: string; secret: string }) => void;
  isLoading: boolean;
  onKeypairChange?: (keypair: { publicKey: string; secret: string }) => void;
}

export default function AgentConfigForm({
  onConfigSubmit,
  isLoading,
  onKeypairChange,
}: AgentConfigProps) {
  const [config, setConfig] = useState<AgentConfigType>({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
  });

  const [keypair, setKeypair] = useState({
    publicKey: '',
    secret: '',
  });

  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);

  const handleConfigChange = (field: keyof AgentConfigType, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleKeypairSelected = (selectedKeypair: {
    publicKey: string;
    secret: string;
  }) => {
    setKeypair(selectedKeypair);
    onKeypairChange?.(selectedKeypair);
  };

  const handleLoadPremade = (presetId: string) => {
    const preset = PREMADE_AGENTS.find((agent) => agent.id === presetId);
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
    setLoadedPresetId(presetId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.name.trim()) {
      alert('Agent name is required');
      return;
    }
    if (!keypair.publicKey || !keypair.secret) {
      alert('Please provide both public key and secret key');
      return;
    }
    onConfigSubmit(config, keypair);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-y-auto">
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

        <div className="border-t border-slate-800 pt-6 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-200">Pre-made Agent</p>
            <p className="text-xs text-slate-400">
              Load a ready-to-run description and system prompt.
            </p>
          </div>
          <div className="space-y-3">
            {PREMADE_AGENTS.map((preset) => (
              <div
                key={preset.id}
                className={`bg-slate-900/60 border rounded-lg p-4 space-y-2 ${
                  loadedPresetId === preset.id
                    ? 'border-emerald-500/60'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{preset.name}</p>
                  {loadedPresetId === preset.id ? (
                    <span className="text-[11px] text-emerald-300">Loaded</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400">{preset.description}</p>
                <button
                  type="button"
                  onClick={() => handleLoadPremade(preset.id)}
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                >
                  Load Agent
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <WalletManager
            onKeypairSelected={handleKeypairSelected}
            isConfigured={!!keypair.publicKey}
            selectedKeypair={keypair}
          />
        </div>

        <button
          type="submit"
          disabled={
            isLoading ||
            !config.name.trim() ||
            !keypair.publicKey ||
            !keypair.secret
          }
          className="w-full mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Launching...' : 'Launch Agent'}
        </button>
      </form>
    </div>
  );
}
