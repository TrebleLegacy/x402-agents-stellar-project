'use client';

import React, { useState } from 'react';
import { AgentConfig as AgentConfigType } from '@/types/agent';

interface AgentConfigProps {
  onConfigSubmit: (config: AgentConfigType, keypair: { publicKey: string; secret: string }) => void;
  isLoading: boolean;
}

export default function AgentConfig({ onConfigSubmit, isLoading }: AgentConfigProps) {
  const [config, setConfig] = useState<AgentConfigType>({
    name: 'My Agent',
    description: 'Default agent',
    systemPrompt: 'You are a helpful assistant.',
    model: 'gpt-4o',
    temperature: 0.4,
    maxTokens: 2000,
  });

  const [keypair, setKeypair] = useState({
    publicKey: '',
    secret: '',
  });

  const [showKeypairForm, setShowKeypairForm] = useState(false);

  const handleConfigChange = (field: keyof AgentConfigType, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleKeypairChange = (field: string, value: string) => {
    setKeypair(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keypair.publicKey || !keypair.secret) {
      alert('Please provide both public key and secret key');
      return;
    }
    onConfigSubmit(config, keypair);
  };

  const generatedKeypair = () => {
    // Generate random keypair (in production, use proper Stellar SDK)
    const publicKey = `G${Math.random().toString(36).substring(2, 57)}`;
    const secret = `S${Math.random().toString(36).substring(2, 57)}`;
    setKeypair({ publicKey, secret });
  };

  return (
    <div className="agent-config">
      <div className="config-panel">
        <h2>Configure Your Agent</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Agent Name</label>
            <input
              type="text"
              value={config.name}
              onChange={e => handleConfigChange('name', e.target.value)}
              placeholder="My Agent"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={config.description}
              onChange={e => handleConfigChange('description', e.target.value)}
              placeholder="What does this agent do?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>System Prompt</label>
            <textarea
              value={config.systemPrompt || ''}
              onChange={e => handleConfigChange('systemPrompt', e.target.value)}
              placeholder="You are a helpful assistant..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Model</label>
            <select
              value={config.model}
              onChange={e => handleConfigChange('model', e.target.value)}
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Temperature</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={e => handleConfigChange('temperature', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Max Tokens</label>
              <input
                type="number"
                min="100"
                max="4000"
                step="100"
                value={config.maxTokens}
                onChange={e => handleConfigChange('maxTokens', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="keypair-section">
            <h3>Stellar Keypair (for Payments)</h3>
            {!showKeypairForm ? (
              <button
                type="button"
                onClick={() => setShowKeypairForm(true)}
                className="btn-secondary"
              >
                Add Keypair
              </button>
            ) : (
              <div className="keypair-form">
                <div className="form-group">
                  <label>Public Key</label>
                  <input
                    type="text"
                    value={keypair.publicKey}
                    onChange={e => handleKeypairChange('publicKey', e.target.value)}
                    placeholder="G..."
                  />
                </div>

                <div className="form-group">
                  <label>Secret Key</label>
                  <input
                    type="password"
                    value={keypair.secret}
                    onChange={e => handleKeypairChange('secret', e.target.value)}
                    placeholder="S..."
                  />
                </div>

                <button
                  type="button"
                  onClick={generatedKeypair}
                  className="btn-secondary"
                >
                  Generate Demo Keypair
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !keypair.publicKey || !keypair.secret}
            className="btn-primary"
          >
            {isLoading ? 'Launching Agent...' : 'Launch Agent'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .agent-config {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .config-panel {
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
        }

        h2 {
          margin: 0 0 20px 0;
          color: #333;
        }

        h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 20px 0 10px 0;
          color: #666;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          color: #666;
        }

        input,
        textarea,
        select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }

        input:focus,
        textarea:focus,
        select:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        textarea {
          resize: vertical;
        }

        .keypair-section {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .keypair-form {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 12px;
          margin-top: 10px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-right: 8px;
          margin-top: 8px;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #5a6268;
        }
      `}</style>
    </div>
  );
}
