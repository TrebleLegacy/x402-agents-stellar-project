'use client';

import React from 'react';
import { InteractionLogEvent } from '@/types/agent';
import { Activity, ShieldAlert } from 'lucide-react';

interface InteractionLogProps {
  events: InteractionLogEvent[];
  onClear?: () => void;
}

const sourceColor: Record<InteractionLogEvent['source'], string> = {
  agent: 'text-emerald-300',
  specialist: 'text-sky-300',
  forge: 'text-amber-300',
  sdk: 'text-violet-300',
  network: 'text-sky-200',
  orchestrator: 'text-purple-300',
  'forge-oracle': 'text-orange-300',
};

export default function InteractionLog({ events, onClear }: InteractionLogProps) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Live Interaction Log</p>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="text-[11px] text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldAlert className="w-3 h-3" />
          <span>No activity yet. Run an agent call to see events.</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {events.map((event, index) => (
            <div key={`${event.at}-${index}`} className="bg-slate-950/60 border border-slate-800 rounded p-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${sourceColor[event.source]}`}>{event.source.toUpperCase()}</span>
                <span className="text-slate-500">{new Date(event.at).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{event.stage}: {event.detail}</p>
              {event.payload !== undefined && (
                <pre className="text-[11px] text-slate-400 mt-2 whitespace-pre-wrap break-words bg-slate-950 rounded border border-slate-800 p-2">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
