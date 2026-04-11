'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AGENT_PRESETS } from '@/data/agentPresets';

interface PreMadeAgentsProps {
  onLoadPreset?: (presetId: string) => void;
}

export default function PreMadeAgents({
  onLoadPreset,
}: PreMadeAgentsProps) {
  const [selectedActor, setSelectedActor] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      <div className="border-b border-slate-700 bg-slate-950 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Actors
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {AGENT_PRESETS.map((actor) => (
          <div
            key={actor.id}
            className={`p-4 rounded-lg border transition-all cursor-pointer ${
              selectedActor === actor.id
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
            }`}
            onClick={() => setSelectedActor(selectedActor === actor.id ? null : actor.id)}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm">{actor.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{actor.description}</p>
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadPreset?.(actor.id);
                      setSelectedActor(actor.id);
                    }}
                    className="text-xs px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded border border-emerald-500/30 transition-colors"
                  >
                    Load Actor
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
