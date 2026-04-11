'use client';

import React, { useState } from 'react';
import { ChevronDown, Brain, Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface ReasoningStep {
  step: number;
  stage: string;
  reasoning: string;
  decision: string;
  cost?: number;
  txHash?: string;
}

interface ReasoningDisplayProps {
  steps: ReasoningStep[];
  totalCost?: number;
  isProcessing?: boolean;
}

export default function ReasoningDisplay({
  steps,
  totalCost,
  isProcessing,
}: ReasoningDisplayProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleExpanded = (stepNum: number) => {
    const newSet = new Set(expandedSteps);
    if (newSet.has(stepNum)) {
      newSet.delete(stepNum);
    } else {
      newSet.add(stepNum);
    }
    setExpandedSteps(newSet);
  };

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-purple-300">Agent Reasoning Chain</h3>
        {isProcessing && (
          <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full bg-purple-900/30 border border-purple-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
            <span className="text-xs text-purple-300">Processing</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.step}
            className="border border-purple-800/40 rounded-lg bg-purple-950/20 overflow-hidden hover:border-purple-700/60 transition-colors"
          >
            <button
              onClick={() => toggleExpanded(step.step)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-900/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {step.stage.includes('Payment') && step.txHash ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : step.reasoning.includes('error') || step.reasoning.includes('Error') ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Brain className="w-4 h-4 text-purple-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-purple-200">
                      Step {step.step}: {step.stage}
                    </span>
                    {step.cost !== undefined && (
                      <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
                        {step.cost} XLM
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-300/70 truncate">{step.decision}</p>
                </div>

                {step.txHash && (
                  <span className="text-xs text-emerald-400 font-mono flex-shrink-0">
                    {step.txHash.substring(0, 8)}...
                  </span>
                )}
              </div>

              <ChevronDown
                className={`w-4 h-4 text-purple-400 flex-shrink-0 transition-transform ${
                  expandedSteps.has(step.step) ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSteps.has(step.step) && (
              <div className="px-4 py-3 bg-purple-900/20 border-t border-purple-800/40 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-purple-300 mb-1.5 uppercase tracking-wider">
                    📊 Reasoning
                  </h4>
                  <p className="text-xs text-purple-200/80 leading-relaxed whitespace-pre-wrap">
                    {step.reasoning}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-purple-300 mb-1.5 uppercase tracking-wider">
                    ✓ Decision
                  </h4>
                  <p className="text-xs text-purple-200/80 leading-relaxed">{step.decision}</p>
                </div>

                {step.txHash && (
                  <div className="pt-2 border-t border-purple-800/40">
                    <h4 className="text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-wider">
                      🔐 Stellar Transaction
                    </h4>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${step.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 font-mono break-all hover:underline"
                    >
                      {step.txHash}
                    </a>
                  </div>
                )}

                {step.cost !== undefined && (
                  <div className="pt-2 border-t border-purple-800/40">
                    <h4 className="text-xs font-semibold text-amber-300 mb-1.5 uppercase tracking-wider">
                      💰 Cost
                    </h4>
                    <p className="text-xs text-amber-200/80">{step.cost} XLM</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalCost !== undefined && (
        <div className="mt-4 p-3 rounded-lg bg-purple-900/40 border border-purple-700/60">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-200">Total Reasoning Cost:</span>
            <span className="text-lg font-bold text-amber-400">{totalCost} XLM</span>
          </div>
        </div>
      )}
    </div>
  );
}
