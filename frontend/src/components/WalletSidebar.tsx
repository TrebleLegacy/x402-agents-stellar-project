'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Wallet, Copy, LogOut, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { connectFreighter, isFreighterAvailable } from '@/lib/freighter';

interface WalletSidebarProps {
  onConnected: (publicKey: string) => void;
  onDisconnected: () => void;
  onLockApp: () => void;
  currentPublicKey?: string | null;
  monthlySpend?: number;
  activeServices?: number;
}

export default function WalletSidebar({
  onConnected,
  onDisconnected,
  onLockApp,
  currentPublicKey,
  monthlySpend = 0,
  activeServices = 0,
}: WalletSidebarProps) {
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freighterReady, setFreighterReady] = useState<boolean | null>(null);

  const isConnected = !!currentPublicKey;

  useEffect(() => {
    isFreighterAvailable().then(setFreighterReady);
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const pubKey = await connectFreighter();
      onConnected(pubKey);
    } catch (err: any) {
      setError(err.message || 'Failed to connect Freighter');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onDisconnected();
  };

  const truncateKey = (key: string) =>
    key.length > 10 ? `${key.slice(0, 6)}...${key.slice(-4)}` : key;

  const copyAddress = () => {
    if (!currentPublicKey) return;
    navigator.clipboard.writeText(currentPublicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">FORGE</h1>
        </div>
        <button
          onClick={onLockApp}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
          title="Lock Vault"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>

      {/* Connection Status */}
      {isConnected ? (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-300 font-medium">
            Freighter Connected
          </span>
        </div>
      ) : (
        <div className="mb-4 space-y-3">
          {freighterReady === false && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300">
                Freighter extension not detected.{' '}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-200"
                >
                  Install it
                </a>
              </span>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting || freighterReady === false}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            {isConnecting ? 'Connecting...' : 'Connect Freighter'}
          </button>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
        </div>
      )}

      {/* Monthly Spend */}
      {isConnected && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Session Spend
            </p>
            <span className="text-xs text-slate-600">{activeServices} services</span>
          </div>
          <span className="text-lg font-semibold text-white">
            {monthlySpend.toFixed(4)} XLM
          </span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Wallet Address Footer */}
      <div>
        {isConnected ? (
          <>
            <button
              onClick={copyAddress}
              className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-[10px] text-emerald-400">W</span>
                </div>
                <code className="text-xs text-slate-400 font-mono">
                  {truncateKey(currentPublicKey!)}
                </code>
              </div>
              <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>
            {copied && (
              <p className="text-[10px] text-emerald-400 text-center mt-1">Copied</p>
            )}

            <button
              onClick={handleDisconnect}
              className="w-full mt-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Disconnect
            </button>
          </>
        ) : (
          <p className="text-center text-[10px] text-slate-600">
            Connect Freighter to begin
          </p>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-3">
          Stellar Testnet &middot; x402 Agent
        </p>
      </div>
    </div>
  );
}
