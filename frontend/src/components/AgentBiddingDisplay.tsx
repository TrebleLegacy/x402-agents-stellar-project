'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Award, Target, AlertCircle } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  trustScore: number;
  successRate: number;
  totalInteractions: number;
  basePrice: number;
  finalPrice: number;
  reputationMultiplier: number;
  demandMultiplier: number;
  selectedForBid?: boolean;
}

interface AgentBiddingDisplayProps {
  agents: Agent[];
  isLoading?: boolean;
  title?: string;
  onSelectAgent?: (agent: Agent) => void;
}

export default function AgentBiddingDisplay({
  agents,
  isLoading,
  title = 'Available Agents - Bidding Round',
  onSelectAgent,
}: AgentBiddingDisplayProps) {
  const [sortBy, setSortBy] = useState<'trust' | 'price' | 'success'>('trust');

  const sortedAgents = [...agents].sort((a, b) => {
    if (sortBy === 'trust') return b.trustScore - a.trustScore;
    if (sortBy === 'price') return a.finalPrice - b.finalPrice;
    return b.successRate - a.successRate;
  });

  return (
    <div className="w-full space-y-3 rounded-lg bg-slate-900/30 border border-slate-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <div className="flex gap-1">
          {(['trust', 'price', 'success'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                sortBy === key
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {key === 'trust' ? 'Trust↓' : key === 'price' ? 'Price↑' : 'Success↓'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-800/50 rounded-lg" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">
          No agents available
        </div>
      ) : (
        <div className="grid gap-2 max-h-96 overflow-y-auto">
          {sortedAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent?.(agent)}
              className={`text-left p-3 rounded-lg border transition-all ${
                agent.selectedForBid
                  ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">{agent.name}</h4>
                    {agent.selectedForBid && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                        <Award className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs text-emerald-300 font-medium">Selected</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {agent.capabilities.slice(0, 2).map((cap, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 bg-slate-800/80 text-slate-300 rounded-full"
                      >
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 2 && (
                      <span className="text-[10px] px-2 py-0.5 text-slate-500">
                        +{agent.capabilities.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="text-lg font-bold text-emerald-400">
                    {agent.finalPrice.toFixed(4)}
                    <span className="text-[10px] text-slate-400 ml-0.5">USDC</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {agent.basePrice.toFixed(4)} base
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-700/50">
                {/* Trust Score */}
                <div className="flex items-center gap-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-medium">Trust</span>
                      <span className="text-[11px] font-bold text-emerald-400">
                        {agent.trustScore.toFixed(0)}/100
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${agent.trustScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="flex items-center gap-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-medium">Success</span>
                      <span className="text-[11px] font-bold text-blue-400">
                        {(agent.successRate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                        style={{ width: `${agent.successRate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Interactions */}
                <div className="flex items-center gap-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-medium">Proven</span>
                      <span className="text-[11px] font-bold text-amber-400">
                        {agent.totalInteractions}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                        style={{ width: `${Math.min((agent.totalInteractions / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Multipliers */}
              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-1 text-[10px] px-2 py-1 bg-slate-900/50 rounded">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-slate-300">
                    Rep: <span className="font-bold text-emerald-400">{agent.reputationMultiplier.toFixed(2)}x</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] px-2 py-1 bg-slate-900/50 rounded">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-slate-300">
                    Demand: <span className="font-bold text-amber-400">{agent.demandMultiplier.toFixed(2)}x</span>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
