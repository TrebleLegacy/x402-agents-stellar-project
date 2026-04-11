
'use client';

import React, { useState } from 'react';
import { Zap, Menu, X, Sparkles, Lock, Package, Code2, ExternalLink } from 'lucide-react';
import AgentConfigForm from '@/components/AgentConfigForm';
import AgentChat from '@/components/AgentChat';
import PreMadeAgents from '@/components/PreMadeAgents';
import WalletInfo from '@/components/WalletInfo';
import PaidDataSources from '@/components/PaidDataSources';
import { AgentConfig as AgentConfigType, AgentQueryResponse } from '@/types/agent';
import { AgentAPIClient } from '@/lib/api';
import { InteractionLogEvent } from '@/types/agent';
import { ApiTool, NetworkExecutionResponse } from '@/types/network';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  const [started, setStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [agentConfig, setAgentConfig] = useState<AgentConfigType | null>(null);
  const [apiClient, setApiClient] = useState<AgentAPIClient | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<ApiTool | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [keypair, setKeypair] = useState<{ publicKey: string; secret: string } | null>(null);
  const [logEvents, setLogEvents] = useState<InteractionLogEvent[]>([]);
  const [networkContext, setNetworkContext] = useState<NetworkExecutionResponse | null>(null);
  const [autoMessageSessionId, setAutoMessageSessionId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'templates' | 'datasources'>('datasources');
  const [loadPresetId, setLoadPresetId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getAutoMessage = () => {
    if (!agentConfig) return 'Hello, how can I assist you?';
    const lowerName = agentConfig.name.toLowerCase();
    if (lowerName.includes('forge') || lowerName.includes('operator')) {
      return 'What paid tools can you call via x402?';
    }
    if (agentConfig.description) {
      return `Hello! Based on your profile: "${agentConfig.description}", demonstrate what you do.`;
    }
    return 'Show me what you are capable of.';
  };

  const autoMessage = getAutoMessage();

  const createSessionId = () => {
    const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (globalCrypto?.randomUUID) {
      return globalCrypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  };

  const pushLog = (event: InteractionLogEvent) => {
    setLogEvents(prev => [event, ...prev].slice(0, 200));
  };

  const handleConfigSubmit = async (
    config: AgentConfigType,
    keypairData: { publicKey: string; secret: string }
  ) => {
    setIsLoading(true);
    try {
      const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
      const client = new AgentAPIClient(apiUrl, network);
      client.setKeypair(keypairData.publicKey, keypairData.secret);
      client.setLogger(pushLog);

      const session = await client.createSession(config);
      const newSessionId = session.sessionId || createSessionId();
      setSessionId(newSessionId);
      setAutoMessageSessionId(null);
      setAgentConfig(config);
      setApiClient(client);
      setKeypair(keypairData);
      setMobileMenuOpen(false);
      if (session.bootMessage) {
        pushLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'boot_completed',
          detail: `Boot response from ${config.name}`,
          payload: { message: session.bootMessage },
        });
      }
    } catch (error: any) {
      console.error('Failed to initialize agent:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string): Promise<AgentQueryResponse> => {
    if (!apiClient || !agentConfig) {
      throw new Error('API Client or Agent Config not initialized');
    }

    setIsLoading(true);
    pushLog({
      at: new Date().toISOString(),
      source: 'network',
      stage: 'request_sent',
      detail: `Query sent to ${agentConfig.name}`,
      payload: { message }
    });

    try {
      const response = await apiClient.chat(agentConfig, message, sessionId);
      pushLog({
        at: new Date().toISOString(),
        source: 'agent',
        stage: 'response_received',
        detail: `Response from ${agentConfig.name}`,
        payload: { responseLength: response.response?.length, trace: response.trace?.length }
      });
      return response;
    } catch (error: any) {
      pushLog({
        at: new Date().toISOString(),
        source: 'forge',
        stage: 'error',
        detail: `Communication failed`,
        payload: error.message
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAgentConfig(null);
    setApiClient(null);
    setSessionId('');
    setAutoMessageSessionId(null);
  };

  if (!started) {
    return <LandingPage onStart={() => setStarted(true)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm shrink-0 h-16">
        <div className="flex items-center justify-between px-6 h-full">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">FORGE</h1>
            <span className="text-[10px] text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 ml-2 hidden sm:inline-block font-mono">LIVE ESCROW ACTIVE</span>
          </div>
          
          <div className="flex items-center gap-3"></div>
        </div>
      </header>

      {/* MAIN DASHBOARD MAP */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Wallet & Configuration */}
        <div className={`${agentConfig ? 'w-[340px]' : 'w-[420px]'} flex-col shrink-0 border-r border-slate-800 bg-slate-900/30 overflow-y-auto hidden md:flex transition-all duration-300`}>
          {!agentConfig ? (
            <div className="flex flex-col min-h-full">
              <AgentConfigForm
                onConfigSubmit={handleConfigSubmit}
                isLoading={isLoading}
                onKeypairChange={setKeypair}
                loadPresetId={loadPresetId}
              />
            </div>
          ) : (
            <div className="p-5 flex flex-col h-full bg-slate-900/10">
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Active Configuration</h2>
                
                <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4 space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Agent Persona</p>
                    <p className="text-sm font-bold text-white truncate">{agentConfig.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Session ID</p>
                    <p className="text-xs font-mono text-emerald-400 truncate">{sessionId}</p>
                  </div>
                </div>
              </div>

              {keypair && (
                <div className="space-y-4 mb-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Provisioned Wallet</h3>
                  <WalletInfo publicKey={keypair.publicKey} secret={keypair.secret} />
                </div>
              )}
              
              <div className="mt-auto pt-4 shadow-sm">
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-3 border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-xl transition-all active:scale-95"
                >
                  Destroy Runtime & Reconfigure
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN: Chat UI */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative border-r border-slate-800">
          {!agentConfig ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[url('/grid-pattern.svg')] opacity-90 text-center">
              <div className="max-w-md space-y-6">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-2xl">
                  <Zap className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">System Offline</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Provide operational credentials in the left panel to boot the command center.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
              <div className="bg-emerald-500/5 text-emerald-200/90 px-4 py-2 flex items-center justify-between text-[11px] uppercase font-mono tracking-widest border-b border-emerald-500/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Trustless Escrow Module Online</span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col relative">
                <AgentChat
                  sessionId={sessionId}
                  agentName={agentConfig.name}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  isPaying={isPaying}
                  autoMessage={sessionId && autoMessageSessionId !== sessionId ? autoMessage : undefined}
                  onAutoMessageSent={() => setAutoMessageSessionId(sessionId)}
                  logEvents={logEvents}
                  showInlineLogs={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Templates & Paid Data Sources */}
        <div className="w-[420px] shrink-0 bg-slate-900 hidden lg:flex flex-col relative border-l border-slate-800">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-900/50">
            <button
              onClick={() => setRightPanelTab('datasources')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                rightPanelTab === 'datasources'
                  ? 'border-b-2 border-emerald-500 text-emerald-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Unified Data</span>
            </button>
            <button
              onClick={() => setRightPanelTab('templates')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                rightPanelTab === 'templates'
                  ? 'border-b-2 border-emerald-500 text-emerald-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Actors</span>
            </button>
            <button
              onClick={() => window.open('/sdk', '_blank')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50"
            >
              <Code2 className="w-4 h-4" />
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto bg-slate-950/80">
            {rightPanelTab === 'datasources' ? (
              <div className="p-4">
                <PaidDataSources />
              </div>
            ) : (
              <div className="p-4">
                <PreMadeAgents onLoadPreset={setLoadPresetId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
