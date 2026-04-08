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
import SdkPlayground from '@/components/SdkPlayground';
import SdkDocs from '@/components/SdkDocs';
import InteractionLog from '@/components/InteractionLog';
import ApiToolNetworkPanel from '@/components/ApiToolNetworkPanel';
import { AgentConfig as AgentConfigType, AgentQueryResponse } from '@/types/agent';
import { AgentAPIClient } from '@/lib/api';
import { InteractionLogEvent } from '@/types/agent';
import { ApiTool, NetworkExecutionResponse } from '@/types/network';
import { X402SdkClient } from '@/lib/x402Sdk';

export default function Home() {
  const [view, setView] = useState<'config' | 'chat' | 'forge' | 'sdk'>('config');
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
    if (!agentConfig) return 'Olá, como pode me ajudar?';
    
    const lowerName = agentConfig.name.toLowerCase();
    
    if (lowerName.includes('forge') || lowerName.includes('operator')) {
      return 'Quais ferramentas pagas você consegue chamar via x402? Como você analisa o mercado?';
    }
    if (lowerName.includes('ops') || lowerName.includes('intelligence')) {
      return 'Por favor, gere um sumário operacional focado nos dados obtidos pelas suas ferramentas.';
    }
    if (lowerName.includes('market') || lowerName.includes('brief')) {
      return 'Traga um resumo dos indicadores de mercado globais, focando em métricas essenciais como cripto e FX.';
    }
    if (lowerName.includes('dev') || lowerName.includes('scout')) {
      return 'Procure e resuma as tendências e repositórios relevantes de desenvolvimento hoje no GitHub e dados do Hacker News.';
    }
    
    // Fallback based on description (if it exists)
    if (agentConfig.description) {
      return `Olá! Baseado no seu perfil de atuar com: "${agentConfig.description}", demonstre uma de suas principais funcionalidades com dados reais.`;
    }

    return 'Mostre-me do que você é capaz considerando suas ferramentas, liste comandos úteis.';
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
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
      .slice(6, 8)
      .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
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

    void runNetworkContext(query, 'chat');

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
    setNetworkContext(null);
    setNetworkRunning(false);
    setAutoMessageSessionId(null);
  };

  const handleBackToNetwork = () => {
    setView('config');
    setMobileMenuOpen(false);
  };

  const runNetworkContext = async (query: string, origin: 'chat' | 'example') => {
    setNetworkRunning(true);
    pushLog({
      at: new Date().toISOString(),
      source: 'network',
      stage: 'context_received',
      detail: 'Agent context received for tool routing',
      payload: { query, origin },
    });

    try {
      const response = await fetch(`${apiUrl}/api/network/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const text = await response.text();
      const data = text ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { __raw: text };
        }
      })() : {};
      if (!response.ok) {
        throw new Error(data?.error || data?.__raw || 'Network tool routing failed');
      }
      const plan = data?.plan;
      const analysis = data?.analysis;
      setNetworkContext({
        success: true,
        query,
        analysis,
        plan,
        toolCalls: [],
      });

      if (analysis) {
        pushLog({
          at: new Date().toISOString(),
          source: 'network',
          stage: 'llm_preprocess',
          detail: 'LLM preprocessing completed',
          payload: analysis,
        });
      }

      pushLog({
        at: new Date().toISOString(),
        source: 'network',
        stage: 'tool_plan_ready',
        detail: 'Tool selection completed',
        payload: plan,
      });

      if (!keypair) {
        pushLog({
          at: new Date().toISOString(),
          source: 'network',
          stage: 'tool_payment_skipped',
          detail: 'Wallet not configured for x402 payments',
          payload: { query },
        });
        return;
      }

      const selectedTools = Array.isArray(plan?.selectedTools)
        ? plan.selectedTools
        : [];

      if (selectedTools.length === 0) {
        pushLog({
          at: new Date().toISOString(),
          source: 'network',
          stage: 'tool_plan_empty',
          detail: 'No tools selected for this context',
          payload: { query },
        });
        return;
      }

      const network =
        (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'testnet' | 'mainnet') ||
        'testnet';
      const sdkClient = new X402SdkClient(apiUrl, network);
      sdkClient.setWallet(keypair);
      sdkClient.setLogger(pushLog);
      sdkClient.setLogSource('network');

      const toolCalls = await Promise.all(
        selectedTools.map(async (selection: any) => {
          const start = Date.now();
          try {
            const result = await sdkClient.payAndRequestDetailed({
              method: 'post',
              path: `/api/network/tools/${selection.id}`,
              data: { params: selection.params || {}, query },
            });
            return {
              id: selection.id,
              name: result.data?.tool?.name || selection.id,
              status: 'success' as const,
              durationMs: Date.now() - start,
              data: result.data?.data ?? result.data,
              payment: result.paymentResponse,
            };
          } catch (error: any) {
            return {
              id: selection.id,
              name: selection.id,
              status: 'error' as const,
              durationMs: Date.now() - start,
              error: error.message || 'Tool call failed',
            };
          }
        })
      );

      setNetworkContext({
        success: true,
        query,
        analysis,
        plan,
        toolCalls,
      });

      toolCalls.forEach((call) => {
        pushLog({
          at: new Date().toISOString(),
          source: 'network',
          stage: call.status === 'success' ? 'tool_call_succeeded' : 'tool_call_failed',
          detail: call.name,
          payload: call.status === 'success' ? call.data : call.error,
        });
      });
    } catch (error: any) {
      pushLog({
        at: new Date().toISOString(),
        source: 'network',
        stage: 'tool_plan_failed',
        detail: error.message || 'Network tool routing failed',
        payload: { query },
      });
    } finally {
      setNetworkRunning(false);
    }
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
              onClick={() => setView('config')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                view === 'config'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                  : 'bg-slate-900/40 text-slate-300 border border-slate-800'
              }`}
            >
              Agent Network
            </button>
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
            <button
              onClick={() => setView('sdk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                view === 'sdk'
                  ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
                  : 'bg-slate-900/40 text-slate-300 border border-slate-800'
              }`}
            >
              SDK Playground
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
                  apiUrl={apiUrl}
                  onLog={pushLog}
                />
              </div>

              <div className="border-t border-slate-700 pt-6">
                <ApiToolNetworkPanel
                  apiUrl={apiUrl}
                  context={networkContext}
                  isRunning={networkRunning}
                  onRunExample={(query) => runNetworkContext(query, 'example')}
                  onLog={pushLog}
                />
              </div>

              <div className="border-t border-slate-700 pt-6">
                <ForgeRuntime
                  apiUrl={apiUrl}
                  onLog={pushLog}
                />
              </div>

              <div className="border-t border-slate-700 pt-6">
                <InteractionLog
                  events={logEvents}
                  onClear={() => setLogEvents([])}
                />
              </div>

              <div className="mt-auto space-y-2">
                <button
                  onClick={handleBackToNetwork}
                  className="w-full px-4 py-2 bg-slate-900/70 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Back to Agent Network
                </button>
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                >
                  Configure New Agent
                </button>
              </div>
            </div>
          ) : (
            view === 'forge' ? (
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
                apiUrl={apiUrl}
                onLog={pushLog}
              />

              <div className="mt-6">
                <InteractionLog
                  events={logEvents}
                  onClear={() => setLogEvents([])}
                />
              </div>

              <div className="mt-auto space-y-2">
                <button
                  onClick={() => setView('chat')}
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                >
                  Back to Agent Chat
                </button>
                <button
                  onClick={handleBackToNetwork}
                  className="w-full px-4 py-2 bg-slate-900/70 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Back to Agent Network
                </button>
              </div>
            </div>
            ) : (
            <div className="flex flex-col h-full p-6 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-violet-200 uppercase tracking-wider mb-3">
                  SDK Playground
                </h2>
                <p className="text-xs text-slate-400">
                  Run live x402 payments with the SDK and inspect the payment receipt.
                </p>
              </div>

              <SdkPlayground
                apiUrl={apiUrl}
                wallet={keypair}
                onLog={pushLog}
              />

              <InteractionLog
                events={logEvents}
                onClear={() => setLogEvents([])}
              />

              <div className="mt-auto space-y-2">
                <button
                  onClick={() => setView('chat')}
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                >
                  Back to Agent Chat
                </button>
                <button
                  onClick={handleBackToNetwork}
                  className="w-full px-4 py-2 bg-slate-900/70 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Back to Agent Network
                </button>
              </div>
            </div>
            )
          )}
        </div>

        <div className="hidden md:flex flex-col flex-1 overflow-hidden">
          {view === 'config' ? (
            <AgentNetwork apiUrl={apiUrl} onAgentSelect={setSelectedAgent} />
          ) : view === 'chat' ? (
            <AgentChat
              sessionId={sessionId}
              agentName={agentConfig?.name || 'Agent'}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isPaying={isPaying}
              autoMessage={sessionId && autoMessageSessionId !== sessionId ? autoMessage : undefined}
              onAutoMessageSent={() => setAutoMessageSessionId(sessionId)}
              logEvents={logEvents}
            />
          ) : view === 'forge' ? (
            <div className="flex-1 flex items-center justify-center bg-slate-950">
              <div className="w-full max-w-2xl p-6">
                <ForgeRuntime apiUrl={apiUrl} />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <SdkDocs />
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
              autoMessage={sessionId && autoMessageSessionId !== sessionId ? autoMessage : undefined}
              onAutoMessageSent={() => setAutoMessageSessionId(sessionId)}
              logEvents={logEvents}
            />
          )}
          {view === 'forge' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <ForgeRuntime
                apiUrl={apiUrl}
                onLog={pushLog}
              />
              <InteractionLog
                events={logEvents}
                onClear={() => setLogEvents([])}
              />
            </div>
          )}
          {view === 'sdk' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <SdkPlayground
                apiUrl={apiUrl}
                wallet={keypair}
                onLog={pushLog}
              />
              <SdkDocs />
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
                apiUrl={apiUrl}
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
