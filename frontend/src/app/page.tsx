'use client';

import React, { useState, useCallback } from 'react';
import WalletSidebar from '@/components/WalletSidebar';
import AgentChat from '@/components/AgentChat';
import ServicesPanel, { Subscription } from '@/components/ServicesPanel';
import { AgentQueryResponse } from '@/types/agent';
import { AgentAPIClient } from '@/lib/api';

export default function Home() {
  const [contractId, setContractId] = useState<string | null>(null);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiClient, setApiClient] = useState<AgentAPIClient | null>(null);

  // Demo subscriptions — will be managed by subscription-manager in Phase 2
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const handleWalletConnected = useCallback((id: string) => {
    setContractId(id);

    // Initialize API client with the smart account
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const client = new AgentAPIClient(apiUrl, 'testnet');
    setApiClient(client);
  }, []);

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

  const monthlySpend = subscriptions.reduce(
    (sum, s) => sum + s.totalSpent,
    0
  );

  const activeServices = subscriptions.filter(
    (s) => s.status === 'active'
  ).length;

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      {/* Left: Wallet Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-slate-800">
        <WalletSidebar
          onConnected={handleWalletConnected}
          onDisconnected={handleWalletDisconnected}
          monthlySpend={monthlySpend}
          activeServices={activeServices}
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
                Create or connect a smart wallet using Touch ID, then ask
                your agent to find and subscribe to APIs automatically.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Right: Services Panel */}
      <aside className="w-80 flex-shrink-0 hidden lg:flex">
        <ServicesPanel
          subscriptions={subscriptions}
          onToggle={handleToggleSubscription}
          onRenew={handleRenewSubscription}
        />
      </aside>
    </div>
  );
}
