'use client';

import React from 'react';
import {
  Search,
  Zap,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Brain,
  ShieldCheck,
  Database,
  Clock,
  LogOut,
} from 'lucide-react';

interface StageStatus {
  stage: number;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
  duration?: number;
  cost?: number;
}

interface OrchestrationFlowProps {
  stages: StageStatus[];
  selectedAgent?: string;
  totalCost?: number;
  isProcessing?: boolean;
}

const stageIcons = [
  Search,
  Search,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Brain,
  CreditCard,
  Zap,
  Database,
  CheckCircle,
  TrendingUp,
  LogOut,
];

export default function OrchestrationFlow({
  stages,
  selectedAgent,
  totalCost,
  isProcessing,
}: OrchestrationFlowProps) {
  const stageNames = [
    'Task Decomposition',
    'Agent Discovery',
    'Bidding & Reputation',
    'Auditor Verify',
    'Policy Check',
    'Economic Decision',
    'Budget Verify',
    'x402 Payment',
    'Agent Execute',
    'Output Audit',
    'Reputation Update',
    'Trace Record',
  ];

  return (
    <div className="w-full space-y-3 rounded-lg bg-slate-900/30 border border-slate-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Orchestration Pipeline</h3>
        </div>
        {totalCost !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-amber-400">{totalCost.toFixed(4)} XLM</span>
          </div>
        )}
      </div>

      {selectedAgent && (
        <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-xs text-emerald-300">
            <span className="font-semibold">Selected Agent:</span> {selectedAgent}
          </p>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {stages.map((stage, idx) => {
          const Icon = stageIcons[stage.stage - 1] || AlertCircle;
          const statusColors = {
            pending: 'bg-slate-800 border-slate-700 text-slate-400',
            active: 'bg-blue-500/10 border-blue-500/30 text-blue-300 animate-pulse',
            completed: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
            error: 'bg-red-500/10 border-red-500/30 text-red-300',
          };

          const statusIcons = {
            pending: '○',
            active: '◐',
            completed: '✓',
            error: '✕',
          };

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${statusColors[stage.status]}`}
            >
              {/* Status Indicator */}
              <div className="flex-shrink-0 mt-0.5 text-lg font-bold">
                {statusIcons[stage.status]}
              </div>

              {/* Icon */}
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {stage.stage}. {stage.name}
                    </p>
                    {stage.detail && (
                      <p className="text-xs mt-0.5 opacity-80">{stage.detail}</p>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {stage.duration !== undefined && (
                      <div className="text-right">
                        <p className="text-xs font-mono text-slate-400">
                          {stage.duration.toFixed(0)}ms
                        </p>
                      </div>
                    )}
                    {stage.cost !== undefined && (
                      <div className="text-right px-2 py-1 bg-black/20 rounded">
                        <p className="text-xs font-mono font-bold">
                          {stage.cost.toFixed(4)} Ⓧ
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50 text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <span className="text-lg">○</span>
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">◐</span>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">✓</span>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">✕</span>
          <span>Error</span>
        </div>
      </div>
    </div>
  );
}
