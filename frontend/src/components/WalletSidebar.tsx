'use client';

import React, { useState } from 'react';
import { Zap, Key, Wallet, LogOut, Copy, Settings, Lock } from 'lucide-react';
import WalletManager from './WalletManager';

interface WalletSidebarProps {
  onConnected: (publicKey: string, secretKey: string) => void;
  onDisconnected: () => void;
  onLockApp: () => void;
  monthlySpend?: number;
  activeServices?: number;
  onOpenSettings?: () => void;
  onOpenEngineSettings?: () => void;
  engineProvider?: 'forge' | 'byok';
  currentPublicKey?: string | null;
}

export default function WalletSidebar({
  onConnected,
  onDisconnected,
  onLockApp,
  monthlySpend = 0,
  activeServices = 0,
  onOpenSettings,
  onOpenEngineSettings,
  engineProvider = 'forge',
  currentPublicKey,
}: WalletSidebarProps) {
  const [copied, setCopied] = useState(false);

  const isConnected = !!currentPublicKey;

  const handleKeypairSelected = (keypair: { publicKey: string; secret: string }) => {
    onConnected(keypair.publicKey, keypair.secret);
  };

  const handleDisconnect = () => {
    onDisconnected();
  };

  const truncateId = (id: string) =>
    id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id;

  const copyAddress = () => {
    if (!currentPublicKey) return;
    navigator.clipboard.writeText(currentPublicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Unified Layout ───────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">FORGE</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-slate-800 text-emerald-500/70 hover:text-emerald-400 transition-colors"
            title="Limites X402"
          >
            <Wallet className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenEngineSettings}
            className="p-2 rounded-lg hover:bg-slate-800 text-indigo-500/70 hover:text-indigo-400 transition-colors"
            title="Configurações da Inteligência Artificial"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
          <button
            onClick={onLockApp}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
            title="Trancar Aplicativo (Lock App)"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Connection & Engine Badges */}
      <div className="flex flex-col gap-2 mb-4">
        {isConnected ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <Key className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">
              Connected Native Keypair
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={onOpenSettings}>
            <Wallet className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-medium">
              Nenhuma Conta Ativa
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
          <div className="w-4 h-4 rounded shadow bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400">
            LLM
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Motor: <span className={engineProvider === 'forge' ? 'text-emerald-400' : 'text-indigo-400'}>{engineProvider === 'forge' ? 'Forge Managed (X402)' : 'BYOK (Chave Própria)'}</span>
          </span>
        </div>
      </div>

      {/* Monthly Spend */}
      {isConnected && (
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
      )}

      {/* Contract/Wallet Address */}
      <div className="mt-auto">
        <button
          onClick={isConnected ? copyAddress : onOpenSettings}
          className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 hover:bg-slate-800/50 transition-colors group"
        >
          <div className="flex items-center gap-2">
            {isConnected ? (
               <>
                 <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                   <span className="text-[10px] text-emerald-400">W</span>
                 </div>
                 <code className="text-xs text-slate-400 font-mono">
                   {currentPublicKey ? truncateId(currentPublicKey) : ''}
                 </code>
               </>
            ) : (
                 <span className="text-xs text-slate-500 font-medium py-0.5 ml-1">Clique para iniciar</span>
            )}
          </div>
          {isConnected && <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />}
        </button>
        {copied && isConnected && (
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
