'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Zap, ArrowRight, ShieldCheck, Key } from 'lucide-react';

interface VaultLockScreenProps {
  onUnlock: () => void;
}

// Helper: Basic SHA-256 purely for local UI lock validation.
// Real secrets are stored in the OS Keychain, so the entropy focus here is purely UX gating.
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function VaultLockScreen({ onUnlock }: VaultLockScreenProps) {
  const [mode, setMode] = useState<'loading' | 'setup' | 'unlock'>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if the vault has been established
    const savedHash = localStorage.getItem('forge_vault_hash');
    if (savedHash) {
      setMode('unlock');
    } else {
      setMode('setup');
    }
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 4) {
      setError('A senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    const hashed = await hashPassword(password);
    localStorage.setItem('forge_vault_hash', hashed);
    onUnlock(); // Vault initialized and unlocked
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const storedHash = localStorage.getItem('forge_vault_hash');
    const attemptedHash = await hashPassword(password);

    if (storedHash === attemptedHash) {
      onUnlock();
    } else {
      setError('Senha incorreta.');
      setPassword('');
    }
  };

  if (mode === 'loading') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
           <Zap className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
           FORGE
        </h1>
      </div>

      <div className="w-full max-w-sm">
        {mode === 'setup' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-6">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-1">Crie a Senha do App</h2>
              <p className="text-xs text-slate-400">
                Esta senha protegerá a interface contra acesso local. Lembre-se dela, o Forge não possui sistema de recuperação de senha por nuvem.
              </p>
            </div>

            <form onSubmit={handleSetup} className="space-y-4">
              {error && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-center text-xs text-red-400">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Nova Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  autoFocus
                />
                <input
                  type="password"
                  placeholder="Confirme a Senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                Ativar Cofre
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl relative">
              <Lock className="w-6 h-6 text-slate-400" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border border-slate-900" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-sm text-slate-400 mb-8 text-center px-4">
              Seu cofre Forge está trancado. Insira a senha mestre para acessar as chaves do sistema operacional.
            </p>

            <form onSubmit={handleUnlock} className="w-full space-y-4">
              {error && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-center text-xs text-red-400 animate-in fade-in">
                  {error}
                </div>
              )}
              
              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:bg-slate-900 transition-all font-medium text-lg tracking-widest text-center"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={password.length === 0}
                className="w-full py-4 mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-900/20"
              >
                Unlock Forge
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 text-[10px] text-slate-600 font-mono tracking-wider flex items-center justify-center w-full">
        <ShieldCheck className="w-3 h-3 mr-1" /> SECURED BY RUST ENCLAVE
      </div>
    </div>
  );
}
