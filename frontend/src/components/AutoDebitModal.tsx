import React, { useState } from 'react';
import { X, ShieldCheck, Fingerprint, Activity, Clock, Zap } from 'lucide-react';

interface AutoDebitModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string | null;
}

export default function AutoDebitModal({ isOpen, onClose, contractId }: AutoDebitModalProps) {
  const [limit, setLimit] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen || !contractId) return null;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Wallet de Débito Automático</h2>
              <p className="text-xs text-slate-400">Configuração do Agente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Permissão On-Chain</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você autoriza seu agente a debitar fundos desta smart account para 
                assinaturas de APIs externas, limitado à política em vigor.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/80 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl"></div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Limite Contratual Mensal</span>
              <span className="text-xl font-bold text-white">${limit}.00</span>
            </div>
            
            <input 
              type="range" 
              min="10" 
              max="500" 
              step="10" 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mb-2"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>$10</span>
              <span>$500</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
              <Activity className="w-4 h-4 text-emerald-400 mb-2" />
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
              <p className="text-xs text-emerald-300 font-medium">Ativo & Protegido</p>
            </div>
            <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
              <Clock className="w-4 h-4 text-blue-400 mb-2" />
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Ciclo Mensal</p>
              <p className="text-xs text-slate-300 font-medium whitespace-nowrap">Renova dia 1º</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800/80 bg-slate-900 flex flex-col gap-3">
          <button 
            onClick={handleSave}
            disabled={isSaving || saved}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 active:bg-emerald-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 relative overflow-hidden"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 animate-pulse" /> Assinando com Touch ID...
              </span>
            ) : saved ? (
              <span className="flex items-center gap-2 text-emerald-100">
                On-Chain Policy Atualizada
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4" /> Atualizar Limite Policy
              </span>
            )}
          </button>
          <p className="text-[10px] text-center text-slate-500 mt-2">
            Pode haver uma pequena taxa de rede (XLM) para submeter a transação.
          </p>
        </div>
      </div>
    </div>
  );
}
