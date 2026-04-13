
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Zap, Lock } from 'lucide-react';
import AgentConfigForm from '@/components/AgentConfigForm';
import AgentChat from '@/components/AgentChat';
import ServiceCatalog, { APIService } from '@/components/ServiceCatalog';
import AgentFundCard from '@/components/AgentFundCard';
import TransactionToast, { useTxToast } from '@/components/TransactionToast';

import WalletSidebar from '@/components/WalletSidebar';
import VaultModal from '@/components/VaultModal';

import ServicesPanel, { Subscription } from '@/components/ServicesPanel';
import { AgentConfig as AgentConfigType, AgentQueryResponse } from '@/types/agent';
import { AgentAPIClient, BudgetState, AutoPayment } from '@/lib/api';
import { InteractionLogEvent } from '@/types/agent';
import { VaultManager, VaultPayload } from '@/lib/vault';
import { freighterSigner } from '@/lib/freighter';
import { deriveAgentWallet, agentWalletSigner, AgentWallet } from '@/lib/x402Client';
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

  // ── Transaction toast (agent signing pipeline) ─────────────
  const { toasts, addToast, updateStep, dismiss } = useTxToast();
  const [autoMessageSessionId, setAutoMessageSessionId] = useState<string | null>(null);

  const [loadPresetId, setLoadPresetId] = useState<string | null>(null);

  // ── Vault state ───────────────────────────────────────────────
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultPassword, setVaultPassword] = useState<string | null>(null);
  const [vaultPayload, setVaultPayload] = useState<VaultPayload | null>(null);

  // ── Wallet state ──────────────────────────────────────────────
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  // ── Agent Wallet (auto-sign keypair for autonomous payments) ──
  const [agentWallet, setAgentWallet] = useState<AgentWallet | null>(null);
  const [agentFunded, setAgentFunded] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [onChainBalance, setOnChainBalance] = useState<number | null>(null);
  const [budget, setBudget] = useState<BudgetState>({
    dailyLimit: 10,
    spent: 0,
    remaining: 10,
    payments: [],
  });

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

    // Deterministically derive agent wallet from main wallet pubkey
    // Same input → same output, on any device/browser
    const wallet = await deriveAgentWallet(publicKey);
    setAgentWallet(wallet);

    // Check if already funded on-chain
    try {
      const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${wallet.publicKey}`);
      if (res.ok) setAgentFunded(true);
    } catch { /* noop */ }

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
    setAgentWallet(null);
    setAgentFunded(false);
    setOnChainBalance(null);
    setBudget({ dailyLimit: 10, spent: 0, remaining: 10, payments: [] });
    setLogEvents([]);
    setStarted(false);
  }, []);

  const handleLockApp = useCallback(async () => {
    setVaultPassword(null);
    setVaultPayload(null);
    setConnectedWallet(null);
    setAgentConfig(null);
    setApiClient(null);
    apiClientRef.current = null;
    setSessionId('');
    setAgentWallet(null);
    setAgentFunded(false);
    setOnChainBalance(null);
    setBudget({ dailyLimit: 10, spent: 0, remaining: 10, payments: [] });
    setLogEvents([]);
    setStarted(false);
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

  // ── Fund Agent Wallet (standalone, via Freighter) ─────────────
  const handleFundAgent = useCallback(async () => {
    if (!agentWallet || !connectedWallet) return;
    setIsFunding(true);
    try {
      const horizonUrl = 'https://horizon-testnet.stellar.org';
      const networkPassphrase = StellarSdk.Networks.TESTNET;

      const accRes = await fetch(`${horizonUrl}/accounts/${connectedWallet}`);
      if (!accRes.ok) throw new Error('Main wallet not found on testnet. Fund it via Friendbot first.');
      const accData = await accRes.json();

      const account = new StellarSdk.Account(connectedWallet, accData.sequence);
      const fundAmount = String(budget.dailyLimit);

      // Use createAccount for first fund, payment for top-ups
      const operation = agentFunded
        ? StellarSdk.Operation.payment({
            destination: agentWallet.publicKey,
            asset: StellarSdk.Asset.native(),
            amount: fundAmount,
          })
        : StellarSdk.Operation.createAccount({
            destination: agentWallet.publicKey,
            startingBalance: fundAmount,
          });

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(60)
        .build();

      const signedXdr = await freighterSigner(tx.toXDR(), networkPassphrase);

      const submitRes = await fetch(`${horizonUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `tx=${encodeURIComponent(signedXdr)}`,
      });

      if (submitRes.ok) {
        setAgentFunded(true);
      } else {
        const err = await submitRes.json();
        if (err?.extras?.result_codes?.operations?.includes('op_already_exists')) {
          setAgentFunded(true);
        } else {
          throw new Error(err?.extras?.result_codes?.operations?.join(', ') || 'Funding failed');
        }
      }
    } catch (err: any) {
      alert(`Funding failed: ${err.message}`);
    } finally {
      setIsFunding(false);
    }
  }, [agentWallet, connectedWallet, agentFunded, budget.dailyLimit]);

  // ── Poll on-chain balance for agent wallet ───────────────────
  const fetchAgentBalance = useCallback(async () => {
    if (!agentWallet || !agentFunded) return;
    try {
      const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${agentWallet.publicKey}`);
      if (res.ok) {
        const data = await res.json();
        const native = data.balances?.find((b: any) => b.asset_type === 'native');
        if (native) setOnChainBalance(parseFloat(native.balance));
      }
    } catch { /* noop */ }
  }, [agentWallet, agentFunded]);

  useEffect(() => {
    fetchAgentBalance();
    if (!agentFunded || !agentWallet) return;
    const interval = setInterval(fetchAgentBalance, 15000);
    return () => clearInterval(interval);
  }, [fetchAgentBalance, agentFunded, agentWallet]);

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

      // Use agent wallet (auto-sign, no popup) if available, otherwise Freighter
      if (agentWallet) {
        client.setPublicKey(agentWallet.publicKey);
        client.setSigner(agentWalletSigner(agentWallet.secretKey));
        client.setBudget(budget);
        client.setPaymentCallback((updatedBudget, payment) => {
          setBudget({ ...updatedBudget });
        });
      } else {
        client.setPublicKey(connectedWallet);
        client.setSigner(freighterSigner);
      }
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


      {/* MAIN DASHBOARD */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Wallet Sidebar + Agent Config */}
        <div className={`${agentConfig ? 'w-[300px]' : 'w-[420px]'} flex flex-col shrink-0 border-r border-slate-800 bg-slate-900/30 overflow-y-auto hidden md:flex transition-all duration-300`}>
          {/* Wallet Sidebar (top) */}
          <div className="shrink-0 border-b border-slate-800">
            <WalletSidebar
              onConnected={handleWalletConnected}
              onDisconnected={handleWalletDisconnected}
              onLockApp={handleLockApp}
              currentPublicKey={connectedWallet}
            />
          </div>

          {/* Agent Config or Active Session (bottom) */}
          <div className="flex-1">
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
            <ServiceCatalog
              walletConnected={!!connectedWallet}
              subscribedServiceIds={new Set(
                budget.payments
                  .filter(p => p.status === 'settled')
                  .map(p => {
                    const match = p.id.match(/^sub-(.+?)-\d+$/);
                    return match ? match[1] : '';
                  })
                  .filter(Boolean)
              )}
              onSubscribe={async (service: APIService) => {
                if (!agentFunded) {
                  alert('Fund your AgentPay card first (left panel).');
                  return;
                }

                const toastId = `sub-${service.id}-${Date.now()}`;
                addToast(toastId, `Subscribe: ${service.name}`);

                const renewDate = new Date();
                renewDate.setDate(renewDate.getDate() + 30);
                const paymentId = toastId;
                let txHash: string | undefined;

                if (agentWallet) {
                  try {
                    // Step 1: Build
                    await new Promise(r => setTimeout(r, 400));
                    updateStep(toastId, 'sign');

                    // Step 2: Agent sign
                    const { X402PaymentClient } = await import('@/lib/x402Client');
                    const client = new X402PaymentClient('testnet');
                    const serverAddr = process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS
                      || connectedWallet || '';
                    const signed = await client.buildAndSign({
                      sourcePublicKey: agentWallet.publicKey,
                      receiveSigningPublicKey: serverAddr,
                      destinationAddress: serverAddr,
                      amount: String(service.priceXLM),
                      assetContract: '',
                      price: service.price,
                    }, agentWallet.secretKey);
                    await new Promise(r => setTimeout(r, 300));
                    updateStep(toastId, 'submit');

                    // Step 3: Submit to Horizon
                    const res = await fetch('https://horizon-testnet.stellar.org/transactions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                      body: `tx=${encodeURIComponent(signed.transaction)}`,
                    });
                    if (res.ok) {
                      const result = await res.json();
                      txHash = result.hash;
                      updateStep(toastId, 'confirm', { txHash });
                    } else {
                      const err = await res.json().catch(() => ({}));
                      updateStep(toastId, 'error', { error: err?.extras?.result_codes?.operations?.join(', ') || 'Submission failed' });
                    }
                  } catch (err: any) {
                    updateStep(toastId, 'error', { error: err.message });
                  }
                }

                const payment: AutoPayment = {
                  id: paymentId,
                  service: service.name,
                  amount: String(service.priceXLM),
                  status: txHash ? 'settled' : 'failed',
                  timestamp: new Date().toISOString(),
                  txHash,
                  renewsAt: renewDate.toISOString(),
                };
                setBudget(prev => ({
                  ...prev,
                  spent: prev.spent + service.priceXLM,
                  payments: [...prev.payments, payment],
                }));
              }}
              onLaunchAgent={(presetId: string) => setLoadPresetId(presetId)}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
              <div className="bg-slate-900/80 px-4 py-2 flex items-center justify-between text-[11px] border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-slate-400 font-medium">AgentPay</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(100 - (budget.spent / budget.dailyLimit) * 100, 0)}%`,
                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                      }}
                    />
                  </div>
                  <span className="text-slate-500 tabular-nums font-mono">
                    {(budget.dailyLimit - budget.spent).toFixed(2)} XLM
                  </span>
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

        {/* RIGHT COLUMN: Agent Debit Card */}
        <div className="w-[380px] shrink-0 bg-slate-950 hidden lg:flex flex-col relative border-l border-slate-800">
          <ServicesPanel
            subscriptions={budget.payments.map((p): Subscription => ({
              id: p.id,
              service: p.service,
              plan: 'on-demand',
              price: `${p.amount} XLM`,
              totalSpent: parseFloat(p.amount) || 0,
              status: p.status === 'settled' ? 'active' : 'expired',
              lastUsed: p.timestamp,
              renewsAt: p.renewsAt,
              txHash: p.txHash,
            }))}
            onToggle={(id) => {
              setBudget(prev => ({
                ...prev,
                payments: prev.payments.map(p =>
                  p.id === id ? { ...p, status: p.status === 'settled' ? 'failed' : 'settled' } : p
                ),
              }));
            }}
            onCancel={(id) => {
              setBudget(prev => {
                const payment = prev.payments.find(p => p.id === id);
                const refund = payment ? parseFloat(payment.amount) || 0 : 0;
                return {
                  ...prev,
                  spent: Math.max(prev.spent - refund, 0),
                  payments: prev.payments.filter(p => p.id !== id),
                };
              });
            }}
            onRenew={() => {}}
            budgetLimit={budget.dailyLimit}
            budgetSpent={budget.spent}
            onChainBalance={onChainBalance}
            agentPublicKey={agentWallet?.publicKey}
            agentFunded={agentFunded}
            isFunding={isFunding}
            onBudgetChange={(limit) => setBudget(prev => ({
              ...prev,
              dailyLimit: limit,
              remaining: limit - prev.spent,
            }))}
            onFundAgent={handleFundAgent}
          />
        </div>
      </div>

      {/* Transaction Toasts */}
      <TransactionToast toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
