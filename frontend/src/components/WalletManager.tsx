'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Copy, Eye, EyeOff, Plus, X, Wallet, Download, Upload, RefreshCw } from 'lucide-react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarUtil } from '@/lib/stellar';
import { invoke } from '@tauri-apps/api/core';

interface WalletManagerProps {
  onKeypairSelected: (keypair: { publicKey: string; secret: string }) => void;
  isConfigured: boolean;
  selectedKeypair?: { publicKey: string; secret: string } | null;
}

export default function WalletManager({
  onKeypairSelected,
  isConfigured,
  selectedKeypair,
}: WalletManagerProps) {
  const [mode, setMode] = useState<'menu' | 'generate' | 'import' | 'view'>('menu');
  const [generatedKeypair, setGeneratedKeypair] = useState<{
    publicKey: string;
    secret: string;
  } | null>(null);
  const [importedSecret, setImportedSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [stellarUtil] = useState(() => new StellarUtil('testnet'));

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // Keychain removido daqui (delegado ao MultiWalletModal)

  const generateNewWallet = () => {
    try {
      const newKeypair = StellarSdk.Keypair.random();
      const keypair = {
        publicKey: newKeypair.publicKey(),
        secret: newKeypair.secret(),
      };
      setGeneratedKeypair(keypair);
      setBalance(null);
      setMode('view');
      setError(null);
    } catch (err) {
      setError('Failed to generate wallet');
    }
  };

  const handleImportSecret = () => {
    try {
      if (!importedSecret.trim()) {
        setError('Please enter a secret key');
        return;
      }

      const keypair = StellarSdk.Keypair.fromSecret(importedSecret.trim());
      const walletKeypair = {
        publicKey: keypair.publicKey(),
        secret: keypair.secret(),
      };
      setGeneratedKeypair(walletKeypair);
      setBalance(null);
      setMode('view');
      setError(null);
    } catch (err) {
      setError('Invalid secret key. Please check and try again.');
    }
  };

  const handleConfirmKeypair = () => {
    if (generatedKeypair) {
      onKeypairSelected(generatedKeypair);
      setMode('menu'); // Return back to list / menu
    }
  };

  const loadBalance = async () => {
    if (!generatedKeypair) return;
    setIsLoadingBalance(true);
    try {
      const bal = await stellarUtil.getBalance(generatedKeypair.publicKey);
      setBalance(bal);
    } catch (err) {
      console.error('Failed to load balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (mode === 'view' && generatedKeypair && !balance) {
      loadBalance();
    }
  }, [mode, generatedKeypair]);

  useEffect(() => {
    if (selectedKeypair?.publicKey && selectedKeypair.secret) {
      setGeneratedKeypair(selectedKeypair);
    }
  }, [selectedKeypair]);

  const fundWalletWithFriendbot = async () => {
    if (!generatedKeypair) return;
    setIsFunding(true);
    setError(null);
    try {
      await stellarUtil.fundAccountWithFriendbot(generatedKeypair.publicKey);
      setError(null);
      setTimeout(() => loadBalance(), 2000);
    } catch (err: any) {
      setError(`Funding failed: ${err.message}`);
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-4 h-4 text-amber-400" />
        <label className="text-sm font-medium text-slate-200">Stellar Wallet</label>
        {isConfigured && (
          <div className="text-xs text-emerald-400 flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            Configured
          </div>
        )}
      </div>

      {mode === 'menu' && (
        <div className="space-y-2">
          {generatedKeypair && (
            <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg space-y-2">
              <p className="text-xs text-slate-400">Active wallet</p>
              <p className="text-xs font-mono text-emerald-400 break-all">
                {generatedKeypair.publicKey}
              </p>
              <button
                type="button"
                onClick={() => setMode('view')}
                className="w-full px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
              >
                View Wallet Details
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setMode('generate');
              setError(null);
            }}
            className="w-full px-4 py-2 border border-slate-700 hover:border-emerald-500 hover:bg-slate-900/50 text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Generate New Wallet
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('import');
              setError(null);
            }}
            className="w-full px-4 py-2 border border-slate-700 hover:border-emerald-500 hover:bg-slate-900/50 text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Import Wallet
          </button>
        </div>
      )}

      {mode === 'generate' && (
        <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
          <p className="text-sm text-slate-300">
            Generate a new Stellar wallet. Make sure to save the secret key securely!
          </p>

          <button
            type="button"
            onClick={generateNewWallet}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            Generate Wallet
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('menu');
              setError(null);
            }}
            className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {mode === 'import' && (
        <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
          <p className="text-sm text-slate-300">
            Paste your Stellar secret key (starts with 'S')
          </p>

          <textarea
            value={importedSecret}
            onChange={e => setImportedSecret(e.target.value)}
            placeholder="SDZA..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors font-mono text-sm resize-none"
          />

          {error && (
            <div className="flex gap-2 items-start p-2 bg-red-900/20 border border-red-800 rounded text-red-300 text-sm">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('menu');
                setImportedSecret('');
                setError(null);
              }}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImportSecret}
              disabled={!importedSecret.trim()}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {mode === 'view' && generatedKeypair && (
        <div className="space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
          <div className="bg-red-900/20 border border-red-800 rounded p-3">
            <p className="text-xs text-red-300 font-medium mb-1">⚠️ SAVE YOUR SECRET KEY</p>
            <p className="text-xs text-red-300">
              Keep this secret key safe. Anyone with this key can access your funds. Never share it!
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">Public Key (Account Address)</label>
            <div className="relative">
              <input
                type="text"
                value={generatedKeypair.publicKey}
                readOnly
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-emerald-400 font-mono text-xs pr-10"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(generatedKeypair.publicKey, 'public')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {copied === 'public' ? (
                  <span className="text-xs text-emerald-400">✓</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">Secret Key (Keep Private!)</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={generatedKeypair.secret}
                readOnly
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-mono text-xs pr-20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showSecret ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedKeypair.secret, 'secret')}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {copied === 'secret' ? (
                    <span className="text-xs text-emerald-400">✓</span>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-3 space-y-2">
            <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
              <span className="text-sm text-slate-400">Balance:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-emerald-400">
                  {balance !== null ? `${balance} XLM` : 'Loading...'}
                </span>
                <button
                  type="button"
                  onClick={loadBalance}
                  disabled={isLoadingBalance}
                  className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={fundWalletWithFriendbot}
              disabled={isFunding}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              {isFunding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Funding...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Fund with Friendbot (Testnet)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleConfirmKeypair}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              Use This Wallet
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('menu');
                setImportedSecret('');
                setError(null);
              }}
              className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
