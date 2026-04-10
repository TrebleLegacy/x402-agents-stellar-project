const fs = require('fs');

let code = `
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
import { AgentConfig as AgentConfigType } from '@/types/agent';
import { AgentAPIClient } from '@/lib/api';
import { InteractionLogEvent } from '@/types/agent';
import { ApiTool, NetworkExecutionResponse } from '@/types/network';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  const [started, setStarted] = useState(false);
  const [showPreMadeAgents, setShowPreMadeAgents] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [agentConfig, setAgentConfig] = useState<AgentConfigType | null>(null);
  const [apiClient, setApiClient] = useState<AgentAPIClient | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<ApiTool | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [keypair, setKeypair] = useState<{ publicKey: string; secret: string } | null>(null);
  const [logEvents, setLogEvents] = useState<InteractionLogEvent[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [networkContext, setNetworkContext] = useState<NetworkExecutionResponse | null>(null);
  const [networkRunning, setNetworkRunning] = useState(false);
  const [autoMessageSessionId, setAutoMessageSessionId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getAutoMessage = () => {
    if (!agentConfig) return 'Hello, how can I assist you?';
    const lowerName = agentConfig.name.toLowerCase();
    if (lowerName.includes('forge') || lowerName.includes('operator')) {
      return 'What paid tools can you call via x402? How do you analyze the market?';
    }
    if (lowerName.includes('ops') || lowerName.includes('intelligence')) {
      return 'Please generate an operational summary focused on the data obtained by your tools.';
    }
    if (lowerName.includes('market') || lowerName.includes('brief')) {
      return 'Bring a summary of global market indicators, focusing on essential metrics like crypto and FX.';
    }
    if (lowerName.includes('dev') || lowerName.includes('scout')) {
      return 'Search and summarize relevant development trends and repositories today on GitHub and Hacker News data.';
    }
    if (agentConfig.description) {
      return \`Hello! Based on your profile of acting with: "\${agentConfig.description}", demonstrate one of your main functionalities with real data.\`;
    }
    return 'Show me what you are capable of considering your tools, list useful commands.';
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
    return \`\${hex.slice(0, 4).join('')}-\${hex.slice(4, 6).join('')}-\${hex
      .slice(6, 8)
      .join('')}-\${hex.slice(8, 10).join('')}-\${hex.slice(10, 16).join('')}\`;
  };

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
      const network =
        (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'testnet' | 'mainnet') ||
        'testnet';

      const client = new AgentAPIClient(apiUrl, network);
      client.setKeypair(keypairData.publicKey, keypairData.secret);
      client.setLogger(pushLog);

      const newSessionId = createSessionId();
      setSessionId(newSessionId);
      setAutoMessageSessionId(null);
      setAgentConfig(config);
      setApiClient(client);
      setKeypair(keypairData);
      setMobileMenuOpen(false);
    } catch (error: any) {
      console.error('Failed to initialize agent:', error);
      alert(\`Error: \${error.message}\`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!apiClient || !agentConfig) return;

    setIsLoading(true);
    
    pushLog({
      at: new Date().toISOString(),
      source: 'client',
      stage: 'request_sent',
      detail: \`Query sent to \${agentConfig.name}\`,
      payload: { message }
    });

    try {
      const response = await apiClient.chat(agentConfig, message, sessionId);
      
      pushLog({
        at: new Date().toISOString(),
        source: 'agent',
        stage: 'response_received',
        detail: \`Response from \${agentConfig.name}\`,
        payload: { textLength: response.text?.length, hasRawOutput: !!response.rawOutput }
      });
      
      return response;
    } catch (error: any) {
      pushLog({
        at: new Date().toISOString(),
        source: 'system',
        stage: 'error',
        detail: \`Communication failed\`,
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
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">FORGE</h1>
            <span className="text-[10px] text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 ml-2 hidden sm:inline-block font-mono">LIVE ESCROW ACTIVE</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreMadeAgents(!showPreMadeAgents)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30 text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Setup & Agent Config */}
        <div className={\`\${agentConfig ? 'w-[320px]' : 'w-[420px]'} flex-col shrink-0 border-r border-slate-800 bg-slate-900/30 overflow-y-auto hidden md:flex transition-all duration-300\`}>
          {!agentConfig ? (
            <div className="flex flex-col h-full bg-slate-900/50">
              <AgentConfigForm onConfigSubmit={handleConfigSubmit} isLoading={isLoading} onKeypairChange={setKeypair} />
              <div className="border-t border-slate-800 mt-4 pt-4 p-4 flex-1">
                <AgentNetwork apiUrl={apiUrl} onAgentSelect={setSelectedAgent} />
              </div>
            </div>
          ) : (
            <div className="p-5 flex flex-col h-full">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Active Configuration</h2>
              
              <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4 space-y-4 mb-6">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Agent Persona</p>
                  <p className="text-sm font-bold text-white truncate">{agentConfig.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Session ID</p>
                  <p className="text-xs font-mono text-emerald-400 truncate">{sessionId}</p>
                </div>
              </div>

              {keypair && (
                <div className="space-y-4 mb-auto">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Provisioned Wallet</h3>
                  <WalletInfo publicKey={keypair.publicKey} secret={keypair.secret} />
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full mt-8 px-4 py-3 border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-xl transition-all shadow-sm active:scale-95"
              >
                Destroy Runtime & Reconfigure
              </button>
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN: Interface Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative border-r border-slate-800">
          {!agentConfig ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[url('/grid-pattern.svg')] opacity-90 text-center">
              <div className="max-w-md space-y-6">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-2xl">
                  <Zap className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">System Offline</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Provide operational credentials in the left panel to boot the command center. System establishes local multisig custody automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950">
              <div className="bg-emerald-500/5 text-emerald-200/90 px-4 py-2.5 flex items-center justify-between text-[11px] uppercase font-mono tracking-widest border-b border-emerald-500/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Trustless Escrow Module Online</span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <AgentChat
                  sessionId={sessionId}
                  agentName={agentConfig.name}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  isPaying={isPaying}
                  autoMessage={sessionId && autoMessageSessionId !== sessionId ? autoMessage : undefined}
                  onAutoMessageSent={() => setAutoMessageSessionId(sessionId)}
                  logEvents={logEvents}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Execution Details & Forge Runtime (only if agent configured) */}
        {agentConfig && (
            <div className="w-[380px] shrink-0 bg-slate-900 hidden xl:flex flex-col overflow-y-auto">
              <div className="p-5 space-y-6 flex-1 flex flex-col">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Intelligent Automation</h3>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 flex flex-col shadow-inner">
                    <ForgeRuntime apiUrl={apiUrl} onLog={pushLog} />
                  </div>
                </div>

                <div className="space-y-4 flex-1 flex flex-col h-1/2 min-h-[300px]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Network Trace</h3>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">{logEvents.length} events</span>
                  </div>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-auto bg-black/40">
                      <InteractionLog events={logEvents} onClear={() => setLogEvents([])} compact />
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
      
      {/* FLOATING PREMADE AGENTS PANEL */}
      {showPreMadeAgents && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-slate-900/90 backdrop-blur-md p-4 border-b border-slate-800 flex justify-between items-center z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Select a Specialized Agent
              </h2>
              <button onClick={() => setShowPreMadeAgents(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <PreMadeAgents 
                onSelect={(agent) => {
                  setSelectedAgent(agent);
                  setShowPreMadeAgents(false);
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('frontend/src/app/page.tsx', code);
console.log('Finished writing frontend/src/app/page.tsx for a single unified dashboard without navigation tabs.');
