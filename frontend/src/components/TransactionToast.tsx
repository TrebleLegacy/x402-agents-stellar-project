'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Loader2, ExternalLink, XCircle, X, Bot } from 'lucide-react';

export type TxStep = 'build' | 'sign' | 'submit' | 'confirm' | 'error';

export interface TxToastData {
  id: string;
  label: string;
  step: TxStep;
  txHash?: string;
  error?: string;
}

const STEP_CONFIG: Record<TxStep, { label: string; icon: React.ReactNode; color: string }> = {
  build:   { label: 'Agent building transaction',    icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400' },
  sign:    { label: 'Agent signing autonomously',    icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-amber-400' },
  submit:  { label: 'Agent submitting to Stellar',   icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-purple-400' },
  confirm: { label: 'Confirmed on-chain ✓',           icon: <CheckCircle2 className="w-4 h-4" />,        color: 'text-emerald-400' },
  error:   { label: 'Transaction failed',             icon: <XCircle className="w-4 h-4" />,             color: 'text-red-400' },
};

const ALL_STEPS: TxStep[] = ['build', 'sign', 'submit', 'confirm'];

function StepDot({ step, currentStep }: { step: TxStep; currentStep: TxStep }) {
  const currentIdx = ALL_STEPS.indexOf(currentStep);
  const stepIdx = ALL_STEPS.indexOf(step);
  const isComplete = currentStep === 'confirm' ? true : stepIdx < currentIdx;
  const isCurrent = step === currentStep && currentStep !== 'confirm' && currentStep !== 'error';

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
        isComplete ? 'bg-emerald-400 scale-100' :
        isCurrent ? 'bg-amber-400 animate-pulse scale-125' :
        'bg-slate-700 scale-100'
      }`} />
      <span className={`text-[10px] transition-colors duration-300 ${
        isComplete ? 'text-emerald-400' :
        isCurrent ? 'text-amber-400' :
        'text-slate-600'
      }`}>
        {STEP_CONFIG[step].label}
      </span>
    </div>
  );
}

function SingleToast({ toast, onDismiss }: { toast: TxToastData; onDismiss: (id: string) => void }) {
  const config = STEP_CONFIG[toast.step];
  const explorerUrl = toast.txHash
    ? `https://stellar.expert/explorer/testnet/tx/${toast.txHash}`
    : null;

  // Auto-dismiss confirmed toasts after 6s
  useEffect(() => {
    if (toast.step === 'confirm' || toast.step === 'error') {
      const timer = setTimeout(() => onDismiss(toast.id), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast.step, toast.id, onDismiss]);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl p-5 shadow-2xl shadow-black/50 w-[380px] animate-slide-in">
      {/* Agent Working Badge */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Bot className={`w-4.5 h-4.5 ${toast.step === 'confirm' ? 'text-emerald-400' : 'text-amber-400'}`} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {toast.step === 'confirm' ? '✓ Agent Completed' : toast.step === 'error' ? 'Agent Error' : 'Agent Working…'}
          </p>
          <p className="text-[11px] text-slate-400">{toast.label}</p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="ml-auto p-1 hover:bg-slate-800 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* Step progress */}
      {toast.step !== 'error' && (
        <div className="space-y-1.5 mb-3">
          {ALL_STEPS.map(s => (
            <StepDot key={s} step={s} currentStep={toast.step} />
          ))}
        </div>
      )}

      {/* Error message */}
      {toast.step === 'error' && toast.error && (
        <p className="text-xs text-red-400/80 mb-2">{toast.error}</p>
      )}

      {/* Explorer link */}
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors mt-1"
        >
          <ExternalLink className="w-3 h-3" />
          View on Stellar Expert
        </a>
      )}

      {/* Progress bar */}
      {toast.step !== 'confirm' && toast.step !== 'error' && (
        <div className="mt-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((ALL_STEPS.indexOf(toast.step) + 1) / ALL_STEPS.length) * 100}%`,
              background: 'linear-gradient(90deg, #3b82f6, #f59e0b, #a855f7)',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Hook for managing toasts ──────────────────────────────────────
export function useTxToast() {
  const [toasts, setToasts] = useState<TxToastData[]>([]);

  const addToast = useCallback((id: string, label: string) => {
    setToasts(prev => [...prev, { id, label, step: 'build' }]);
  }, []);

  const updateStep = useCallback((id: string, step: TxStep, extra?: { txHash?: string; error?: string }) => {
    setToasts(prev => prev.map(t =>
      t.id === id ? { ...t, step, ...extra } : t
    ));
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, updateStep, dismiss };
}

// ── Toast Container (rendered once at app level) ──────────────────
export default function TransactionToast({ toasts, onDismiss }: {
  toasts: TxToastData[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
      {toasts.map(toast => (
        <SingleToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
      </div>
    </div>
  );
}
