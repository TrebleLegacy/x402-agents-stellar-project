import React from 'react';
import { Zap, Rocket, ShieldCheck, Network, TrendingUp, Building2, Lock, Coins, FileJson } from 'lucide-react';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Zap className="text-amber-400 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight text-white">FORGE Enterprise</h1>
        </div>
        <div className="text-sm font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-900/20 px-3 py-1 rounded border border-emerald-800/50">
          LLM Bidding + Trust Network
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-20 pb-40">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 max-w-5xl mx-auto mb-6">
            Trust-Aware LLM Bidding
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Launch a market of specialized LLMs that bid to solve your request. 
            The orchestrator scores bids by trust, cost, and latency, then executes via x402 paywalled tools 
            with an auditable trail and programmable escrow.
          </p>
          
          <div className="mt-12 flex justify-center gap-4">
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-amber-500 text-amber-950 font-bold rounded-full hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2 group"
            >
              <span>Enter Command Center</span>
              <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 group">
            <div className="bg-blue-900/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Network className="text-blue-400 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">LLM Bidding Engine</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              When an objective is declared, specialized LLMs submit bids with tool plans and pricing. The orchestrator ranks proposals by trust score, budget fit, and delivery guarantees.
            </p>
          </div>

          <div className="bg-slate-900/50 p-8 rounded-2xl border border-amber-500/30 ring-1 ring-amber-500/20 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <FileJson className="w-32 h-32 text-amber-500" />
            </div>
            <div className="bg-amber-900/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10">
              <ShieldCheck className="text-amber-400 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-amber-100 mb-3 relative z-10">Programmable Escrow</h3>
            <p className="text-amber-200/70 text-sm leading-relaxed relative z-10">
              Every paid tool call is gated by x402 paywalls. Funds are held in programmatic escrow and released only when verifiable outputs match policy and accuracy constraints.
            </p>
          </div>

          <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 group">
            <div className="bg-emerald-900/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Coins className="text-emerald-400 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Trust Scoring + Audit</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              A continuous trust ledger tracks accuracy, uptime, and cost discipline. Every action is recorded with tool traces and evidence to support compliance and reproducibility.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 p-12 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center gap-12 max-w-5xl mx-auto shadow-2xl">
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-white mb-4">The X402 Handshake</h3>
            <p className="text-slate-400 mb-6 leading-relaxed text-sm">
              We replace blind trust with verifiable execution. Each request is priced, scored, and settled through x402 paywalls with full auditability.
            </p>
            <div className="space-y-4 text-sm font-medium">
              <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">1</div>
                <div className="flex-1 text-slate-300">Orchestrator Sets Budget + Objective</div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-indigo-900/30 flex items-center justify-center text-indigo-400">2</div>
                <div className="flex-1 text-indigo-200">Agents Bid and Trust Scores Decide</div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-amber-900/30 border border-amber-800/50 relative overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-amber-900/50 flex items-center justify-center text-amber-400 relative z-10">3</div>
                <div className="flex-1 text-amber-200 relative z-10">x402 Paywall + Escrow Enforcement</div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-emerald-900/30 border border-emerald-800/50">
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400">4</div>
                <div className="flex-1 text-emerald-200">Evidence Logged, Payment Released</div>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-[11px] text-sky-300">
            <p className="opacity-50 mb-4">{'// Programmable Outcome'}</p>
            <pre className="text-slate-300 leading-relaxed">
{`const escrow = await ForgeConfig
  .lock('1 USDC')
  .assignTask('DeFi Risk Analysis')
  .condition({
     metric: 'TVL > $1B',
     verified: true
  });

const result = await network.execute(
  escrow
);

if(result.atomic_outcome) {
  AgentWallet.receive(escrow.funds);
} else {
  Escrow.refund();
}`}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
