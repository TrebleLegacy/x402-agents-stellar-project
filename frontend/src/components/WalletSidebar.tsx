'use client';

import React, { useState } from 'react';
import { Zap, Key, Wallet, LogOut, Copy } from 'lucide-react';

interface WalletSidebarProps {
  onConnected: (publicKey: string, secretKey: string) => void;
  onDisconnected: () => void;
  monthlySpend?: number;
  activeServices?: number;
  onOpenSettings?: () => void;
}

export default function WalletSidebar({
  onConnected,
  onDisconnected,
  monthlySpend = 0,
  activeServices = 0,
  onOpenSettings,
}: WalletSidebarProps) {
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey.trim() || !secretKey.trim()) return;

    setIsConnected(true);
    onConnected(publicKey.trim(), secretKey.trim());
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setPublicKey('');
    setSecretKey('');
    onDisconnected();
  };

  const truncateId = (id: string) =>
    id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id;

  const copyAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Disconnected State ────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col h-full bg-slate-950 p-6">
        <div className="flex items-center gap-2 mb-8">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">FORGE</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Connect Identity
            </h2>
            <p className="text-xs text-slate-400">
              Provide your Stellar Keypair to initialize the X402 Payment Agent.
            </p>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                PUBLIC KEY
              </label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="G..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                SECRET KEY
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="S..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-600 mt-4">
          Secured by Stellar &middot; Local Storage Only
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

      <div className="mb-6 flex gap-2">
        <button 
          onClick={onOpenSettings}
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-emerald-400 transition-colors flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Débito Automático
        </button>
      </div>

      {/* Connection Badge */}
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
        <Key className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-emerald-300 font-medium">
          Connected Native Keypair
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

      {/* Contract/Wallet Address */}
      <div className="mt-auto">
        <button
          onClick={copyAddress}
          className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 hover:bg-slate-800/50 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-[10px] text-emerald-400">W</span>
            </div>
            <code className="text-xs text-slate-400 font-mono">
              {truncateId(publicKey)}
            </code>
          </div>
          <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </button>
        {copied && (
          <p className="text-[10px] text-emerald-400 text-center mt-1">
            Copied
          </p>
        )}

        <p className="text-center text-[10px] text-slate-600 mt-3">
          Stellar Testnet &middot; x402 Agent
        </p>
      </div>
    </div>
  );
}
