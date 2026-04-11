'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Fingerprint, Copy, Wallet, LogOut, RefreshCw } from 'lucide-react';
import {
  createWallet,
  connectWallet,
  disconnectWallet,
  getContractId,
} from '@/lib/wallet';

interface WalletSidebarProps {
  onConnected: (contractId: string) => void;
  onDisconnected: () => void;
  monthlySpend?: number;
  activeServices?: number;
}

type WalletStatus = 'disconnected' | 'connecting' | 'creating' | 'connected';

export default function WalletSidebar({
  onConnected,
  onDisconnected,
  monthlySpend = 0,
  activeServices = 0,
}: WalletSidebarProps) {
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [contractId, setContractId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string>('—');

  // Attempt silent session restore on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const result = await connectWallet();
        if (result) {
          setContractId(result.contractId);
          setStatus('connected');
          onConnected(result.contractId);
        }
      } catch {
        // No stored session — that's fine
      }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    setStatus('creating');
    setError(null);
    try {
      const result = await createWallet('Forge User');
      setContractId(result.contractId);
      setStatus('connected');
      onConnected(result.contractId);
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
      setStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    setStatus('connecting');
    setError(null);
    try {
      const result = await connectWallet({ prompt: true });
      if (result) {
        setContractId(result.contractId);
        setStatus('connected');
        onConnected(result.contractId);
      } else {
        setStatus('disconnected');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setStatus('disconnected');
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    setContractId(null);
    setStatus('disconnected');
    setBalance('—');
    onDisconnected();
  };

  const copyAddress = () => {
    if (!contractId) return;
    navigator.clipboard.writeText(contractId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateId = (id: string) =>
    `${id.slice(0, 4)}...${id.slice(-4)}`;

  // ─── Disconnected State ────────────────────────────────
  if (status === 'disconnected') {
    return (
      <div className="flex flex-col h-full bg-slate-950 p-6">
        <div className="flex items-center gap-2 mb-8">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">FORGE</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Fingerprint className="w-10 h-10 text-emerald-400" />
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Connect your Wallet
            </h2>
            <p className="text-sm text-slate-400 max-w-[240px]">
              Use Touch ID to create or connect a smart wallet on Stellar
            </p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={handleCreate}
              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              Create Wallet
            </button>

            <button
              onClick={handleConnect}
              className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Connect Existing
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center max-w-[240px]">
              {error}
            </p>
          )}
        </div>

        <div className="text-center text-xs text-slate-600 mt-4">
          Secured by Stellar &middot; Passkey
        </div>
      </div>
    );
  }

  // ─── Loading State ─────────────────────────────────────
  if (status === 'creating' || status === 'connecting') {
    return (
      <div className="flex flex-col h-full bg-slate-950 p-6">
        <div className="flex items-center gap-2 mb-8">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">FORGE</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
            <Fingerprint className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-sm text-slate-400">
            {status === 'creating'
              ? 'Creating wallet with Touch ID...'
              : 'Connecting with passkey...'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Connected State ───────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">FORGE</h1>
        </div>
        <button
          onClick={handleDisconnect}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
          Balance
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{balance}</span>
          <span className="text-sm text-slate-400">USDC</span>
        </div>
      </div>

      {/* Connection Badge */}
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
        <Fingerprint className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-emerald-300 font-medium">
          Connected via Touch ID
        </span>
      </div>

      {/* Monthly Spend */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            This Month
          </p>
          <span className="text-xs text-slate-600">{activeServices} services</span>
        </div>
        <span className="text-lg font-semibold text-white">
          ${monthlySpend.toFixed(2)}
        </span>
      </div>

      {/* Contract Address */}
      <div className="mt-auto">
        {contractId && (
          <button
            onClick={copyAddress}
            className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-[10px] text-emerald-400">C</span>
              </div>
              <code className="text-xs text-slate-400 font-mono">
                {truncateId(contractId)}
              </code>
            </div>
            <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </button>
        )}
        {copied && (
          <p className="text-[10px] text-emerald-400 text-center mt-1">
            Copied
          </p>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-3">
          Stellar Testnet &middot; Smart Account &middot; x402
        </p>
      </div>
    </div>
  );
}
