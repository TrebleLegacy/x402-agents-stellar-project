'use client';

import React, { useState, useEffect } from 'react';
import { X, Wallet, Star, Plus, Trash2, ShieldCheck, FileKey2 } from 'lucide-react';
import { VaultManager, VaultPayload } from '../lib/vault';
import WalletManager from './WalletManager';

export interface WalletIdentity {
  alias: string;
  publicKey: string;
}

interface MultiWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletActivated: (publicKey: string, secretKey: string) => void;
  onWalletDisconnected?: () => void;
  activePublicKey?: string;
  requestVaultAccess: (callback: (pw: string, vault: VaultPayload) => void) => void;
}

export default function MultiWalletModal({
  isOpen,
  onClose,
  onWalletActivated,
  onWalletDisconnected,
  activePublicKey,
  requestVaultAccess,
}: MultiWalletModalProps) {
  const [wallets, setWallets] = useState<WalletIdentity[]>([]);
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadWallets();
      setMode('list');
      setErrorMsg(null);
    }
  }, [isOpen]);

  const loadWallets = () => {
    try {
      const stored = localStorage.getItem('forge_wallets');
      if (stored) {
         setWallets(JSON.parse(stored));
      }
    } catch {
       setWallets([]);
    }
  };

  const syncWallets = (updated: WalletIdentity[]) => {
    setWallets(updated);
    localStorage.setItem('forge_wallets', JSON.stringify(updated));
  };

  const handleWalletCreated = (keypair: { publicKey: string, secret: string }) => {
    requestVaultAccess(async (password, payload) => {
      try {
        if (!payload.wallets.find(w => w.publicKey === keypair.publicKey)) {
           payload.wallets.push({ alias: `Wallet ${payload.wallets.length + 1}`, publicKey: keypair.publicKey, secretKey: keypair.secret });
           await VaultManager.encryptAndSave(password, payload);
        }
        
        const updatedList = payload.wallets.map(w => ({ alias: w.alias, publicKey: w.publicKey }));
        syncWallets(updatedList);
        
        localStorage.setItem('forge_active_wallet', keypair.publicKey);
        onWalletActivated(keypair.publicKey, keypair.secret);
        setMode('list');
      } catch (err: any) {
        setErrorMsg('Falha ao blindar a conta: ' + err.message);
      }
    });
  };

  const handleActivate = (publicKey: string) => {
    setErrorMsg(null);
    requestVaultAccess((password, payload) => {
       const w = payload.wallets.find(x => x.publicKey === publicKey);
       if (!w) {
          setErrorMsg("Sessão Corrompida: Conta não existe no cofre.");
          return;
       }
       localStorage.setItem('forge_active_wallet', publicKey);
       onWalletActivated(publicKey, w.secretKey);
       onClose();
    });
  };

  const handleDelete = async (publicKey: string) => {
    const updated = wallets.filter(w => w.publicKey !== publicKey);
    syncWallets(updated);
    if (activePublicKey === publicKey) {
      localStorage.removeItem('forge_active_wallet');
      if (onWalletDisconnected) onWalletDisconnected();
    }
    
    if (VaultManager.hasVault()) {
       requestVaultAccess(async (password, payload) => {
          payload.wallets = payload.wallets.filter(w => w.publicKey !== publicKey);
          await VaultManager.encryptAndSave(password, payload);
       });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileKey2 className="w-5 h-5 text-emerald-400" />
              Gestão de Contas (Multi-Tenant)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Alterne entre perfis de Carteiras ou injete novas contas. As senhas são seladas isoladamente pelo MacOS.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-start gap-2 animate-in fade-in">
              <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {mode === 'list' && (
            <div className="space-y-4">
               {wallets.length === 0 ? (
                 <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                    <ShieldCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <h3 className="text-white font-medium">Nenhuma Conta Conectada</h3>
                    <p className="text-xs text-slate-500 mt-1">Sua máquina está completamente limpa.</p>
                 </div>
               ) : (
                 <div className="space-y-2">
                    {wallets.map((w) => (
                      <div 
                        key={w.publicKey}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          activePublicKey === w.publicKey 
                            ? 'border-emerald-500/50 bg-emerald-500/5' 
                            : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800'
                        }`}
                      >
                         <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleActivate(w.publicKey)}>
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                               <Wallet className={`w-4 h-4 ${activePublicKey === w.publicKey ? 'text-emerald-400' : 'text-slate-500'}`} />
                            </div>
                            <div>
                               <p className="text-sm font-bold text-white flex items-center gap-2">
                                  {w.alias}
                                  {activePublicKey === w.publicKey && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider">Active</span>}
                               </p>
                               <p className="text-xs text-slate-500 font-mono mt-0.5">
                                  {w.publicKey.slice(0, 8)}...{w.publicKey.slice(-8)}
                               </p>
                            </div>
                         </div>
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleDelete(w.publicKey); }}
                           className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                           title="Remover do Dispositivo"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    ))}
                 </div>
               )}

               <button
                 onClick={() => setMode('add')}
                 className="w-full py-4 mt-2 border border-dashed border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5 rounded-xl flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium transition-colors"
               >
                 <Plus className="w-4 h-4" />
                 Conectar Nova Conta
               </button>
            </div>
          )}

          {mode === 'add' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               <button 
                 onClick={() => setMode('list')}
                 className="text-xs text-slate-400 hover:text-white mb-4 flex items-center gap-1"
               >
                 ← Voltar para a Lista
               </button>
               <WalletManager 
                 isConfigured={false} 
                 onKeypairSelected={handleWalletCreated}
                 selectedKeypair={null}
               />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
