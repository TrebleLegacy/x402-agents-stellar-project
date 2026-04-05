'use client';

import React, { useState } from 'react';
import { Zap, Menu, X, Sparkles } from 'lucide-react';
import AgentConfigForm from '@/components/AgentConfigForm';
import AgentChat from '@/components/AgentChat';
import AgentNetwork from '@/components/AgentNetwork';
import SpecialistNetwork from '@/components/SpecialistNetwork';
import PreMadeAgents from '@/components/PreMadeAgents';
import WalletInfo from '@/components/WalletInfo';
import ForgeRuntime from '@/components/ForgeRuntime';
import InteractionLog from '@/components/InteractionLog';
import { AgentConfig as AgentConfigType, AgentQueryResponse } from '@/types/agent';
import { AgentAPIClient } from '@/lib/api';
import { SpecialistAgent } from '@/types/agents';
import { InteractionLogEvent } from '@/types/agent';

export default function Home() {
  const [view, setView] = useState<'config' | 'chat' | 'forge'>('config');
  const [showPreMadeAgents, setShowPreMadeAgents] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [agentConfig, setAgentConfig] = useState<AgentConfigType | null>(null);
  const [apiClient, setApiClient] = useState<AgentAPIClient | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<SpecialistAgent | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [keypair, setKeypair] = useState<{ publicKey: string; secret: string } | null>(null);
  const [logEvents, setLogEvents] = useState<InteractionLogEvent[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const pushLog = (event: InteractionLogEvent) => {
    setLogEvents(prev => [event, ...prev].slice(0, 200));
    setShowLogs(true);
  };

  const handleConfigSubmit = async (
    config: AgentConfigType,
    keypairData: { publicKey: string; secret: string }
  ) => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const network =
        (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'testnet' | 'mainnet') ||
        'testnet';

      const client = new AgentAPIClient(apiUrl, network);
      client.setKeypair(keypairData.publicKey, keypairData.secret);
      client.setLogger(pushLog);

      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      setAgentConfig(config);
      setApiClient(client);
      setKeypair(keypairData);
      setView('chat');
      setMobileMenuOpen(false);
    } catch (error: any) {
      console.error('Failed to initialize agent:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (query: string): Promise<AgentQueryResponse> => {
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    setIsPaying(true);
    try {
      if (!agentConfig) {
        throw new Error('Agent config not set');
      }

      // Get destination (the server's Stellar address)
      // In production, this would come from the server config
      const destination = process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS || '';
      if (!destination) {
        console.warn(
          'NEXT_PUBLIC_SERVER_STELLAR_ADDRESS not set. Payment may fail.'
        );
      }

      const response = await apiClient.queryAgent(query, sessionId, destination);
      return response;
    } finally {
      setIsPaying(false);
    }
  };

  const handleReset = () => {
    setView('config');
    setSessionId('');
    setAgentConfig(null);
    setApiClient(null);
    setSelectedAgent(null);
    setKeypair(null);
    setLogEvents([]);
    setShowLogs(false);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">FORGE v2</h1>
            <span className="text-xs text-slate-500 ml-2">Trust-aware agent market</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setView('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                view === 'chat'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                  : 'bg-slate-900/40 text-slate-300 border border-slate-800'
              }`}
            >
              Agent Chat
            </button>
            <button
              onClick={() => setView('forge')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                view === 'forge'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                  : 'bg-slate-900/40 text-slate-300 border border-slate-800'
              }`}
            >
              Forge Runtime
            </button>
          </div>
          <button
            onClick={() => setShowPreMadeAgents(!showPreMadeAgents)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30"
          >
            <Sparkles className="w-4 h-4" />
            Quick Agents
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-slate-400" />
            ) : (
              <Menu className="w-5 h-5 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => setShowLogs(prev => !prev)}
            className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300 rounded-lg text-xs border border-slate-800"
          >
            Logs
            <span className="text-[10px] text-emerald-300">{logEvents.length}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-0 overflow-hidden">
        <div
          className={`${
            mobileMenuOpen ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-96 border-r border-slate-800 overflow-y-auto`}
        >
          {view === 'config' ? (
            <AgentConfigForm
              onConfigSubmit={handleConfigSubmit}
              isLoading={isLoading}
              onKeypairChange={setKeypair}
            />
          ) : view === 'chat' ? (
            <div className="flex flex-col h-full p-6 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Configuration
                </h2>
                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Agent</p>
                    <p className="text-sm font-semibold text-white">{agentConfig?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Session ID</p>
                    <p className="text-xs font-mono text-emerald-400">{sessionId.slice(0, 20)}...</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Wallet Keypair
                </h3>
                {keypair ? (
                  <WalletInfo publicKey={keypair.publicKey} secret={keypair.secret} />
                ) : (
                  <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400">
                    Loading wallet information...
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 pt-6">
                <SpecialistNetwork
                  publicKey={keypair?.publicKey || ''}
                  secretKey={keypair?.secret || ''}
                  apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                  onLog={pushLog}
                />
              </div>

              <div className="border-t border-slate-700 pt-6">
                <ForgeRuntime
                  apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                  onLog={pushLog}
                />
              </div>

              <div className="border-t border-slate-700 pt-6">
                <InteractionLog
                  events={logEvents}
                  onClear={() => setLogEvents([])}
                />
              </div>

              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors mt-auto"
              >
                Configure New Agent
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full p-6 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-amber-200 uppercase tracking-wider mb-3">
                  Forge v2 Controls
                </h2>
                <p className="text-xs text-slate-400">
                  Run competitive agent bidding, audits, and execution with live x402 payments.
                </p>
              </div>

              <ForgeRuntime
                apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                onLog={pushLog}
              />

              <div className="mt-6">
                <InteractionLog
                  events={logEvents}
                  onClear={() => setLogEvents([])}
                />
              </div>

              <button
                onClick={() => setView('chat')}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors mt-auto"
              >
                Back to Agent Chat
              </button>
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-col flex-1 overflow-hidden">
          {view === 'config' ? (
            <AgentNetwork onAgentSelect={setSelectedAgent} />
          ) : view === 'chat' ? (
            <AgentChat
              sessionId={sessionId}
              agentName={agentConfig?.name || 'Agent'}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isPaying={isPaying}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-950">
              <div className="w-full max-w-2xl p-6">
                <ForgeRuntime apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} />
              </div>
            </div>
          )}
        </div>

        <div className="md:hidden flex-1 flex overflow-hidden">
          {view === 'chat' && (
            <AgentChat
              sessionId={sessionId}
              agentName={agentConfig?.name || 'Agent'}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isPaying={isPaying}
            />
          )}
          {view === 'forge' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <ForgeRuntime
                apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                onLog={pushLog}
              />
              <InteractionLog
                events={logEvents}
                onClear={() => setLogEvents([])}
              />
            </div>
          )}
        </div>
      </div>

      {showLogs && !showPreMadeAgents && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-4xl h-[78vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <p className="text-xs uppercase tracking-wider text-slate-400">Live Logs</p>
              <button
                onClick={() => setShowLogs(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="p-4 h-full overflow-hidden">
              <InteractionLog
                events={logEvents}
                onClear={() => setLogEvents([])}
              />
            </div>
          </div>
        </div>
      )}

      {showPreMadeAgents && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl h-[88vh] bg-slate-950 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
            <div className="h-full border-r border-slate-800">
              <PreMadeAgents
                publicKey={keypair?.publicKey}
                secretKey={keypair?.secret}
                apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                onWalletLoaded={setKeypair}
                onLog={pushLog}
                onClose={() => setShowPreMadeAgents(false)}
              />
            </div>
            <div className="h-full p-4 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                <p className="text-xs uppercase tracking-wider text-slate-400">Live Logs</p>
                <button
                  onClick={() => setShowLogs(prev => !prev)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  {showLogs ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pt-3">
                {showLogs ? (
                  <InteractionLog
                    events={logEvents}
                    onClear={() => setLogEvents([])}
                  />
                ) : (
                  <div className="text-xs text-slate-500 px-3">Logs hidden</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
