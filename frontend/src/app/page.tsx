
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Zap, Lock, Package, Code2, ExternalLink } from 'lucide-react';
import AgentConfigForm from '@/components/AgentConfigForm';
import AgentChat from '@/components/AgentChat';
import PreMadeAgents from '@/components/PreMadeAgents';
import WalletSidebar from '@/components/WalletSidebar';
import VaultModal from '@/components/VaultModal';
import PaidDataSources from '@/components/PaidDataSources';
import { AgentConfig as AgentConfigType, AgentQueryResponse } from '@/types/agent';
import { AgentAPIClient } from '@/lib/api';
import { InteractionLogEvent } from '@/types/agent';
import { VaultManager, VaultPayload } from '@/lib/vault';
import { freighterSigner } from '@/lib/freighter';
import LandingPage from '@/components/LandingPage';

export default function Home() {
  // ── App state ─────────────────────────────────────────────────
  const [started, setStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [agentConfig, setAgentConfig] = useState<AgentConfigType | null>(null);
  const [apiClient, setApiClient] = useState<AgentAPIClient | null>(null);
  const [logEvents, setLogEvents] = useState<InteractionLogEvent[]>([]);
  const [autoMessageSessionId, setAutoMessageSessionId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'templates' | 'datasources'>('datasources');
  const [loadPresetId, setLoadPresetId] = useState<string | null>(null);

  // ── Vault state ───────────────────────────────────────────────
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultPassword, setVaultPassword] = useState<string | null>(null);
  const [vaultPayload, setVaultPayload] = useState<VaultPayload | null>(null);

  // ── Wallet state ──────────────────────────────────────────────
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const apiClientRef = useRef<AgentAPIClient | null>(null);

  // ── On mount: check vault ─────────────────────────────────────
  useEffect(() => {
    if (started && VaultManager.hasVault() && !vaultPayload) {
      setVaultOpen(true);
    }
  }, [started, vaultPayload]);

  // ── Vault unlock handler ──────────────────────────────────────
  const handleVaultUnlocked = useCallback((password: string, payload: VaultPayload) => {
    setVaultPassword(password);
    setVaultPayload(payload);
    setVaultOpen(false);

    // Restore active wallet from vault
    if (payload.activeWallet) {
      setConnectedWallet(payload.activeWallet);
    }
  }, []);

  // ── Save vault (persist state) ────────────────────────────────
  const saveVault = useCallback(async (payload: VaultPayload) => {
    if (!vaultPassword) return;
    await VaultManager.encryptAndSave(vaultPassword, payload);
    setVaultPayload(payload);
  }, [vaultPassword]);

  // ── Freighter connect ─────────────────────────────────────────
  const handleWalletConnected = useCallback(async (publicKey: string) => {
    setConnectedWallet(publicKey);

    // Save to vault
    if (vaultPayload && vaultPassword) {
      const updatedPayload: VaultPayload = {
        ...vaultPayload,
        activeWallet: publicKey,
        connectedWallets: vaultPayload.connectedWallets.includes(publicKey)
          ? vaultPayload.connectedWallets
          : [...vaultPayload.connectedWallets, publicKey],
      };
      await saveVault(updatedPayload);
    }
  }, [vaultPayload, vaultPassword, saveVault]);

  const handleWalletDisconnected = useCallback(() => {
    setConnectedWallet(null);
    setAgentConfig(null);
    setApiClient(null);
    apiClientRef.current = null;
    setSessionId('');
  }, []);

  const handleLockApp = useCallback(async () => {
    setVaultPassword(null);
    setVaultPayload(null);
    setConnectedWallet(null);
    setAgentConfig(null);
    setApiClient(null);
    apiClientRef.current = null;
    setSessionId('');
    setVaultOpen(true);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────
  const createSessionId = () => {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
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

  const pushLog = useCallback((event: InteractionLogEvent) => {
    setLogEvents(prev => [event, ...prev].slice(0, 200));
  }, []);

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

  // ── Agent config submit (wallet already connected via sidebar) ─
  const handleConfigSubmit = async (config: AgentConfigType) => {
    if (!connectedWallet) {
      alert('Please connect your Freighter wallet first.');
      return;
    }

    setIsLoading(true);
    try {
      const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
      const client = new AgentAPIClient(apiUrl, network);
      client.setPublicKey(connectedWallet);
      client.setSigner(freighterSigner);
      client.setLogger(pushLog);

      const session = await client.createSession(config);
      const newSessionId = session.sessionId || createSessionId();

      setSessionId(newSessionId);
      setAutoMessageSessionId(null);
      setAgentConfig(config);
      setApiClient(client);
      apiClientRef.current = client;

      if (session.bootMessage) {
        pushLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'boot_completed',
          detail: `Boot response from ${config.name}`,
          payload: { message: session.bootMessage },
        });
      }

      // Save last config to vault
      if (vaultPayload && vaultPassword) {
        const updated: VaultPayload = {
          ...vaultPayload,
          sessionHistory: {
            ...vaultPayload.sessionHistory,
            [connectedWallet]: newSessionId,
          },
        };
        await saveVault(updated);
      }
    } catch (error: any) {
      console.error('Failed to initialize agent:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Send message ──────────────────────────────────────────────
  const handleSendMessage = async (message: string): Promise<AgentQueryResponse> => {
    const client = apiClientRef.current;
    if (!client || !agentConfig) {
      throw new Error('API Client or Agent Config not initialized');
    }

    setIsLoading(true);

    pushLog({
      at: new Date().toISOString(),
      source: 'network',
      stage: 'request_sent',
      detail: `Query sent to ${agentConfig.name}`,
      payload: { message },
    });

    try {
      const response = await client.chat(agentConfig, message, sessionId);

      pushLog({
        at: new Date().toISOString(),
        source: 'agent',
        stage: 'response_received',
        detail: `Response from ${agentConfig.name}`,
        payload: { responseLength: response.response?.length, trace: response.trace?.length },
      });

      return response;
    } catch (error: any) {
      pushLog({
        at: new Date().toISOString(),
        source: 'forge',
        stage: 'error',
        detail: 'Communication failed',
        payload: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAgentConfig(null);
    setApiClient(null);
    apiClientRef.current = null;
    setSessionId('');
    setAutoMessageSessionId(null);
  };

  // ── Landing page gate ─────────────────────────────────────────
  if (!started) {
    return <LandingPage onStart={() => setStarted(true)} />;
  }

  // ── Main layout ───────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* Vault Modal */}
      <VaultModal
        isOpen={vaultOpen}
        onClose={() => {
          if (!vaultPayload) {
            // First time — create vault on close
            setVaultOpen(false);
          } else {
            setVaultOpen(false);
          }
        }}
        onUnlocked={handleVaultUnlocked}
      />

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

      {/* MAIN DASHBOARD */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Wallet Sidebar + Agent Config */}
        <div className={`${agentConfig ? 'w-[300px]' : 'w-[420px]'} flex flex-col shrink-0 border-r border-slate-800 bg-slate-900/30 overflow-hidden hidden md:flex transition-all duration-300`}>
          {/* Wallet Sidebar (top) */}
          <div className={`${agentConfig ? 'h-auto' : 'h-[280px]'} shrink-0 border-b border-slate-800`}>
            <WalletSidebar
              onConnected={handleWalletConnected}
              onDisconnected={handleWalletDisconnected}
              onLockApp={handleLockApp}
              currentPublicKey={connectedWallet}
            />
          </div>

          {/* Agent Config or Active Session (bottom) */}
          <div className="flex-1 overflow-y-auto">
            {!agentConfig ? (
              <AgentConfigForm
                onConfigSubmit={handleConfigSubmit}
                isLoading={isLoading}
                walletConnected={!!connectedWallet}
                loadPresetId={loadPresetId}
              />
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
                    {connectedWallet && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Wallet</p>
                        <p className="text-xs font-mono text-slate-400 truncate">{connectedWallet}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <button
                    onClick={handleReset}
                    className="w-full px-4 py-3 border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-xl transition-all active:scale-95"
                  >
                    Destroy Runtime &amp; Reconfigure
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: Chat UI */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative border-r border-slate-800">
          {!agentConfig ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-90 text-center">
              <div className="max-w-md space-y-6">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-2xl">
                  <Zap className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">System Offline</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {!connectedWallet
                    ? 'Connect your Freighter wallet and configure an agent to start.'
                    : 'Configure an agent in the left panel to boot the command center.'}
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
                  autoMessage={undefined}
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
