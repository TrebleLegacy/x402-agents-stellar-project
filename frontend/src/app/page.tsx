'use client';

import React, { useState, useCallback } from 'react';
import WalletSidebar from '@/components/WalletSidebar';
import AgentChat from '@/components/AgentChat';
import ServicesPanel, { Subscription } from '@/components/ServicesPanel';
import { AgentQueryResponse } from '@/types/agent';
import { AgentAPIClient } from '@/lib/api';
import AutoDebitModal from '@/components/AutoDebitModal';
import ProviderSettingsModal, { EngineProvider } from '@/components/ProviderSettingsModal';
import MultiWalletModal from '@/components/MultiWalletModal';
import VaultModal from '@/components/VaultModal';
import { VaultPayload } from '@/lib/vault';
import { invoke } from '@tauri-apps/api/core';

export default function Home() {
  const [contractId, setContractId] = useState<string | null>(null);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiClient, setApiClient] = useState<AgentAPIClient | null>(null);
  const [isAutoDebitModalOpen, setIsAutoDebitModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  
  // AES-256 Vault InMemory State
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultPassword, setVaultPassword] = useState<string | null>(null);
  const [activeVault, setActiveVault] = useState<VaultPayload | null>(null);
  const [pendingVaultCallback, setPendingVaultCallback] = useState<((p: string, v: VaultPayload) => void) | null>(null);

  const [engineProvider, setEngineProvider] = useState<EngineProvider>('forge');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Cathedral Engine: Subscriptions with cryptographic identifiers
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    {
      id: 'sub_1',
      pubKey: process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS || 'GDXKV7L...', 
      service: 'Forge Native Agent',
      plan: 'on-demand',
      price: '$5.00',
      budgetLimit: 2, // Rigorous Limit
      totalSpent: 0,
      status: 'active',
    },
    {
      id: 'sub_2',
      pubKey: 'GBBD47R6M...', 
      service: 'Midjourney Image API',
      plan: 'monthly',
      price: '$30.00',
      budgetLimit: 15, // Test limit
      totalSpent: 12.50,
      status: 'active',
      renewsAt: new Date(Date.now() + 15 * 24 * 3600000).toISOString(),
    }
  ]);

  // Keep a mutable ref for callbacks to evade stale closures
  const subscriptionsRef = React.useRef(subscriptions);
  React.useEffect(() => {
    subscriptionsRef.current = subscriptions;
  }, [subscriptions]);

  const getActiveLimits = () => {
    return subscriptionsRef.current.reduce((acc, s) => ({ ...acc, [s.pubKey]: s.budgetLimit }), {} as Record<string, number>);
  };

  const handleWalletConnected = useCallback(async (publicKey: string, secretKey: string) => {
    setContractId(publicKey); 
    localStorage.setItem('forge_active_wallet', publicKey);

    // Initialize API client
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const client = new AgentAPIClient(apiUrl, 'testnet');
    client.setKeypair(publicKey, secretKey);

    // Setup Cathedral Interceptors
    client.setBudgetResolver((pubKey) => {
      const activeLimits = getActiveLimits();
      return activeLimits[pubKey];
    });

    client.onPaymentDenied((pubKey, amount, limit) => {
      setSubscriptions((prev) => 
        prev.map((s) => s.pubKey === pubKey ? { ...s, status: 'denied' } : s)
      );
    });

    setApiClient(client);
  }, []);

  React.useEffect(() => {
    // 1. Instantiate the single API Client globally for all requests
    const client = new AgentAPIClient(
      process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000',
      'testnet'
    );
    
    // Setup Cathedral Interceptors
    client.setBudgetResolver((pubKey) => {
      const activeLimits = getActiveLimits();
      return activeLimits[pubKey];
    });

    client.onPaymentDenied((pubKey, amount, limit) => {
      setSubscriptions((prev) => 
        prev.map((s) => s.pubKey === pubKey ? { ...s, status: 'denied' } : s)
      );
    });

    setApiClient(client);
  }, []);

  const requestVaultAccess = useCallback((callback: (pw: string, vault: VaultPayload) => void) => {
     if (vaultPassword && activeVault) {
        callback(vaultPassword, activeVault);
     } else {
        setPendingVaultCallback(() => callback);
        setIsVaultModalOpen(true);
     }
  }, [vaultPassword, activeVault]);

  const handleWalletDisconnected = useCallback(() => {
    setContractId(null);
    setApiClient(null);
    setSubscriptions([]);
  }, []);

  const handleSendMessage = async (
    query: string
  ): Promise<AgentQueryResponse> => {
    if (!apiClient) {
      throw new Error('Wallet not connected');
    }

    setIsPaying(true);
    try {
      const destination =
        process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS || '';
      const response = await apiClient.queryAgent(
        query,
        sessionId,
        destination
      );
      return response;
    } finally {
      setIsPaying(false);
    }
  };

  const handleToggleSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status:
                s.status === 'active'
                  ? ('paused' as const)
                  : ('active' as const),
            }
          : s
      )
    );
  };

  const handleRenewSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'active' as const,
              renewsAt: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
            }
          : s
      )
    );
  };

  const handleSaveBudget = (id: string, budget: number) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              budgetLimit: budget,
              status: s.status === 'denied' && budget > s.budgetLimit ? 'active' : s.status,
            }
          : s
      )
    );
  };

  const monthlySpend = subscriptions.reduce(
    (sum, s) => sum + s.totalSpent,
    0
  );

  const activeServices = subscriptions.filter(
    (s) => s.status === 'active'
  ).length;

  // Render Core App sem travas (UX Livre)

  return (
    <div className="h-full flex overflow-hidden bg-transparent">
      {/* Left: Wallet Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-slate-800 relative z-20">
        <WalletSidebar
          onConnected={handleWalletConnected}
          onDisconnected={handleWalletDisconnected}
          onLockApp={() => {
             // Wipe memory RAM
             setVaultPassword(null);
             setActiveVault(null);
             handleWalletDisconnected();
          }}
          currentPublicKey={contractId}
          monthlySpend={monthlySpend}
          activeServices={activeServices}
          onOpenSettings={() => setIsWalletModalOpen(true)}
          onOpenEngineSettings={() => setIsProviderModalOpen(true)}
          engineProvider={engineProvider}
        />
      </aside>

      {/* Center: Chat */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {contractId ? (
          <AgentChat
            sessionId={sessionId}
            agentName="Forge Agent"
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isPaying={isPaying}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-lg text-slate-400">
                Connect your wallet to start
              </p>
              <p className="text-sm text-slate-600 max-w-sm">
                Connect your Stellar Keypair, then ask
                your agent to find and subscribe to APIs automatically.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Right: Services Panel */}
      <aside className="w-80 flex-shrink-0 flex border-l border-slate-800">
        <ServicesPanel
          subscriptions={subscriptions}
          onToggle={handleToggleSubscription}
          onRenew={handleRenewSubscription}
          onOpenLimit={(sub) => {
            setSelectedSubscription(sub);
            setIsAutoDebitModalOpen(true);
          }}
        />
      </aside>

      <AutoDebitModal 
        isOpen={isAutoDebitModalOpen} 
        onClose={() => {
          setIsAutoDebitModalOpen(false);
          setTimeout(() => setSelectedSubscription(null), 200);
        }} 
        subscription={selectedSubscription}
        onSaveBudget={handleSaveBudget}
      />

      <ProviderSettingsModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        currentProvider={engineProvider}
        requestVaultAccess={requestVaultAccess}
        onSave={(provider, apiKey) => {
          setEngineProvider(provider);
          if (apiClient) {
            apiClient.setEngineConfig(provider, apiKey);
          }
        }}
      />

      <MultiWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        requestVaultAccess={requestVaultAccess}
        onWalletActivated={(pub, sec) => {
           handleWalletConnected(pub, sec);
           setIsWalletModalOpen(false);
        }}
        onWalletDisconnected={() => {
           handleWalletDisconnected();
        }}
        activePublicKey={contractId || undefined}
      />
      
      <VaultModal
        isOpen={isVaultModalOpen}
        onClose={() => {
           setIsVaultModalOpen(false);
           setPendingVaultCallback(null);
        }}
        onUnlocked={(password, payload) => {
           setVaultPassword(password);
           setActiveVault(payload);
           setIsVaultModalOpen(false);
           if (pendingVaultCallback) {
              pendingVaultCallback(password, payload);
              setPendingVaultCallback(null);
           }
        }}
      />
    </div>
  );
}
