import React from 'react';
import { CreditCard, Rocket, Bot, Zap, ArrowRight, Radio } from 'lucide-react';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <CreditCard className="text-emerald-400 w-7 h-7" />
          <h1 className="text-xl font-bold tracking-tight text-white">AgentPay</h1>
        </div>
        <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-900/20 px-3 py-1 rounded border border-emerald-800/50">
          x402 Protocol · Stellar
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-20 pb-40">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300 font-medium">Live on Stellar Testnet</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-500 max-w-4xl mx-auto mb-6">
            The Pre-Paid Card for AI Agents
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Fund an autonomous wallet. Your agent discovers paid APIs, subscribes,
            and pays — all on-chain, all without you signing.
            You just watch the money move.
          </p>

          <div className="mt-12 flex justify-center">
            <button
              onClick={onStart}
              className="px-8 py-4 bg-emerald-500 text-emerald-950 font-bold rounded-full hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 group"
            >
              <span>Launch Demo</span>
              <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* How it works — 3 steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 group">
            <div className="bg-emerald-900/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <CreditCard className="text-emerald-400 w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">1. Fund the Card</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Top up an agent-controlled sub-wallet with XLM from your Freighter wallet.
              The agent gets its own keypair — you stay in control of the budget.
            </p>
          </div>

          <div className="bg-slate-900/50 p-8 rounded-2xl border border-amber-500/30 ring-1 ring-amber-500/10 group">
            <div className="bg-amber-900/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Bot className="text-amber-400 w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-amber-100 mb-2">2. Agent Subscribes & Pays</h3>
            <p className="text-amber-200/70 text-sm leading-relaxed">
              The agent autonomously signs Stellar transactions to pay for API services.
              No Freighter popup. No human in the loop. Pure x402 protocol.
            </p>
          </div>

          <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 group">
            <div className="bg-blue-900/30 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Radio className="text-blue-400 w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">3. Watch It Live</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Open the Receiver Dashboard to see payments arrive in real-time via
              Horizon streaming. Every transaction verified on-chain.
            </p>
          </div>
        </div>

        {/* The x402 handshake — simplified */}
        <div className="bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 p-10 rounded-3xl border border-slate-800 max-w-4xl mx-auto shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-3">The x402 Flow</h3>
              <p className="text-slate-400 mb-6 leading-relaxed text-sm">
                HTTP 402 "Payment Required" — reimagined for autonomous agents on Stellar.
              </p>
              <div className="space-y-3 text-sm font-medium">
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 text-xs font-bold">1</div>
                  <div className="flex-1 text-slate-300">Agent requests a paid API endpoint</div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-amber-800/40">
                  <div className="w-7 h-7 rounded-full bg-amber-900/50 flex items-center justify-center text-amber-400 text-xs font-bold">2</div>
                  <div className="flex-1 text-amber-200">Server responds with <code className="bg-amber-900/30 px-1.5 py-0.5 rounded text-[11px]">HTTP 402</code> + price in headers</div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 text-xs font-bold">3</div>
                  <div className="flex-1 text-slate-300">Agent auto-signs XLM payment on Stellar</div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-emerald-800/40">
                  <div className="w-7 h-7 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 text-xs font-bold">4</div>
                  <div className="flex-1 text-emerald-200">Payment verified → data returned → on-chain receipt</div>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-[11px] text-emerald-300">
              <p className="opacity-50 mb-3">{'// x402 Agent Payment'}</p>
              <pre className="text-slate-300 leading-relaxed">
{`const card = AgentPay.fund({
  from: freighterWallet,
  budget: '10 XLM'
});

// Agent acts autonomously
const data = await agent.query(
  'Get Aave TVL'
);

// Under the hood:
// → 402 received
// → agent signs payment
// → Stellar tx confirmed
// → data returned`}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
