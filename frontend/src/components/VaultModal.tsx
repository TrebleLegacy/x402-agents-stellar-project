'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, Key, X, Loader2 } from 'lucide-react';
import { VaultManager, VaultPayload } from '../lib/vault';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: (password: string, payload: VaultPayload) => void;
}

export default function VaultModal({ isOpen, onClose, onUnlocked }: VaultModalProps) {
  const [mode, setMode] = useState<'loading' | 'setup' | 'unlock'>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setMode(VaultManager.hasVault() ? 'unlock' : 'setup');
    }
  }, [isOpen]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsProcessing(true);
    try {
      const initialPayload = VaultManager.createEmpty();
      await VaultManager.encryptAndSave(password, initialPayload);
      onUnlocked(password, initialPayload);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize vault.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      const payload = await VaultManager.decryptVault(password);
      onUnlocked(password, payload);
    } catch {
      setError('Incorrect password. Access denied.');
      setPassword('');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || mode === 'loading') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'setup' ? (
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6 mt-4">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-1">Create Master Password</h2>
              <p className="text-xs text-slate-400">
                This password will lock your local Forge vault. Remember it — there is no cloud recovery.
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
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  autoFocus
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate Vault'}
                {!isProcessing && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6 sm:p-8 flex flex-col items-center mt-4">
            <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-5 shadow-xl relative">
              <Lock className="w-6 h-6 text-slate-400" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border border-slate-900" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Unlock Vault</h2>
            <p className="text-sm text-slate-400 mb-8 text-center px-2">
              Enter your master password to restore your session.
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
                  className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:bg-slate-950 transition-all font-medium text-lg tracking-widest"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={password.length === 0 || isProcessing}
                className="w-full py-4 mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-2xl transition-all flex justify-center items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock Forge'}
              </button>
            </form>

            <p className="text-[10px] text-slate-600 mt-6 font-mono">
              WEB CRYPTO API (AES-GCM-256)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
