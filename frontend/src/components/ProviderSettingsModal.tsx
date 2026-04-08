'use client';

import React, { useState, useEffect } from 'react';
import { X, Brain, Key, Shield, Info, Loader2 } from 'lucide-react';
import { VaultManager, VaultPayload } from '../lib/vault';

export type EngineProvider = 'forge' | 'byok';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProvider: EngineProvider;
  requestVaultAccess: (callback: (pw: string, vault: VaultPayload) => void) => void;
  onSave: (provider: EngineProvider, apiKey?: string) => void;
}

export default function ProviderSettingsModal({
  isOpen,
  onClose,
  currentProvider,
  requestVaultAccess,
  onSave,
}: ProviderSettingsModalProps) {
  const [selected, setSelected] = useState<EngineProvider>(currentProvider);
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(currentProvider);
      setError(null);
      // Fetch existing API Key se o usuário já configurou BYOK e a vault existe
      if (currentProvider === 'byok' && VaultManager.hasVault()) {
        setLoadingInitial(true);
        requestVaultAccess((password, payload) => {
           if (payload.apiKeys['openai']) {
              setApiKey(payload.apiKeys['openai']);
           }
           setLoadingInitial(false);
        });
      } else {
        setLoadingInitial(false);
      }
    }
  }, [isOpen, currentProvider, requestVaultAccess]);

  const handleSave = () => {
    setIsSaving(true);
    setError(null);
    try {
      if (selected === 'byok') {
        if (!apiKey.trim()) {
           setError('API Key é obrigatória para o modo BYOK.');
           setIsSaving(false);
           return;
        }
        
        requestVaultAccess(async (password, payload) => {
           try {
             payload.apiKeys['openai'] = apiKey.trim();
             await VaultManager.encryptAndSave(password, payload);
             onSave('byok', apiKey.trim());
             onClose();
           } catch (e: any) {
             setError('Falha ao blindar chave: ' + e.message);
           } finally {
             setIsSaving(false);
           }
        });
      } else {
        onSave('forge');
        onClose();
        setIsSaving(false);
      }
    } catch (e: any) {
      setError(e.toString());
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-400" />
              Engine da Inteligência Artificial
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Como você deseja custear a computação base do agente (LLM)?
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
          {error && (
             <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-medium text-center">
               {error}
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: Forge Managed */}
            <div 
              onClick={() => setSelected('forge')}
              className={`relative cursor-pointer border rounded-xl p-5 hover:bg-slate-800/50 transition-colors ${
                selected === 'forge' ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              {selected === 'forge' && (
                <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              )}
              <Shield className={`w-8 h-8 mb-4 ${selected === 'forge' ? 'text-emerald-400' : 'text-slate-600'}`} />
              <h3 className="text-lg font-bold text-white mb-2">Forge Managed (X402)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A opção Zero-Setup. Use a nossa própria OpenAI Engine através da sua carteira Stellar ativa. 
                Cada iteração no chat custará micro-centavos descontados perfeitamente pelo protocolo X402.
              </p>
            </div>

            {/* Option B: BYOK */}
            <div 
              onClick={() => setSelected('byok')}
              className={`relative cursor-pointer border rounded-xl p-5 hover:bg-slate-800/50 transition-colors ${
                selected === 'byok' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              {selected === 'byok' && (
                <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              )}
              <Key className={`w-8 h-8 mb-4 ${selected === 'byok' ? 'text-indigo-400' : 'text-slate-600'}`} />
              <h3 className="text-lg font-bold text-white mb-2">Traga sua Chave (BYOK)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Opção Gratuita para Devs. Insira a sua token pessoal da OpenAI. 
                Os pagamentos do Chat serão zerados ($0.00 USDC) pelo Forge e o custo vai direto para a sua fatura na gringa.
              </p>
            </div>
          </div>

          {/* Configuration Input for BYOK */}
          {selected === 'byok' && (
            <div className="mt-6 p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-semibold text-white">Apple Keychain Lock</h4>
              </div>
              
              {loadingInitial ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Descobrindo Apple Keychain...
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-400 mb-2">OpenAI API Key (sk-...)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    Criptografia de Nível OS. Esta chave nunca toca o LocalStorage do V8. Fica retida diretamente no cofre biométrico do Desktop via Rust IPC.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (selected === 'byok' && loadingInitial)}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center min-w-[120px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Motor'}
          </button>
        </div>
      </div>
    </div>
  );
}
