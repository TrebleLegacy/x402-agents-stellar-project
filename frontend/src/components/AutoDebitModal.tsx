import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Fingerprint, Activity, Clock, Zap, Hash } from 'lucide-react';
import { Subscription } from './ServicesPanel';

interface AutoDebitModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  onSaveBudget: (id: string, budget: number) => void;
}

export default function AutoDebitModal({ isOpen, onClose, subscription, onSaveBudget }: AutoDebitModalProps) {
  const [limit, setLimit] = useState<string>('0');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (subscription) {
      setLimit(subscription.budgetLimit.toString());
      setSaved(false);
    }
  }, [subscription, isOpen]);

  if (!isOpen || !subscription) return null;

  const handleSave = () => {
    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit < 0) {
      alert('Please enter a valid positive limit.');
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      onSaveBudget(subscription.id, numLimit);
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{subscription.service}</h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                {subscription.pubKey}
              </p>
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
              <h3 className="text-sm font-semibold text-white mb-1">Permissão Isolada On-Chain</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure o teto financeiro exato que seu Agente X402 pode autorizar para este provedor específico. Valores acima disso exigirão uma nova assinatura manual.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/80 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl"></div>
            <div className="flex flex-col mb-2">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
                Teto de Orçamento (XLM)
              </span>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                <span className="pl-3 text-slate-500">XLM</span>
                <input 
                  type="number"
                  min="0"
                  step="1"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full px-3 py-3 bg-transparent text-lg font-bold text-white focus:outline-none focus:bg-slate-800 transition-colors"
                  placeholder="Ex: 50"
                />
              </div>
            </div>
            <p className="/text-[10px] text-slate-500 mt-2">
              Os gastos atuais deste serviço estão em: <span className="font-mono text-emerald-400">{subscription.totalSpent.toFixed(2)} XLM</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
              <Hash className="w-4 h-4 text-emerald-400 mb-2" />
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Status Interno</p>
              <p className={`text-xs font-medium capitalize ${subscription.status === 'denied' ? 'text-red-400' : 'text-emerald-300'}`}>
                {subscription.status}
              </p>
            </div>
            <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
              <Clock className="w-4 h-4 text-blue-400 mb-2" />
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Renovação API</p>
              <p className="text-xs text-slate-300 font-medium whitespace-nowrap">
                {subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : 'N/A'}
              </p>
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
                <Fingerprint className="w-4 h-4 animate-pulse" /> Assinando Atualização...
              </span>
            ) : saved ? (
              <span className="flex items-center gap-2 text-emerald-100">
                Política Limitada Salva
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4" /> Atualizar Orçamento desta API
              </span>
            )}
          </button>
          <p className="text-[10px] text-center text-slate-500 mt-2">
            O seu Agente avaliará o teto criptográfico nas requisições subsequentes.
          </p>
        </div>
      </div>
    </div>
  );
}
