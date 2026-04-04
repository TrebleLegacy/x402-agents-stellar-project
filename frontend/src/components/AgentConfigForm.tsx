'use client';

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { AgentConfig as AgentConfigType } from '@/types/agent';
import WalletManager from './WalletManager';

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
