'use client';

import React from 'react';
import { Code2, Layers, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

const serverSnippet = `import { createX402ServerFromEnv } from './sdk/x402/server';
import { Router } from 'express';

const router = Router();
const x402 = createX402ServerFromEnv();

router.post('/demo/echo', x402.wrapEndpoint({
  price: '0.01',
  asset: 'XLM',
  description: 'SDK demo endpoint',
  handler: async (req) => ({ success: true, echo: req.body })
}));

export default router;`;

const clientSnippet = `import { X402SdkClient } from '@/lib/x402Sdk';

const sdk = new X402SdkClient('http://localhost:8000', 'testnet');

sdk.setWallet({ publicKey, secret });

const response = await sdk.payAndRequest({
  method: 'post',
  path: '/api/x402-sdk/demo/echo',
  data: { message: 'hello' }
});`;

const flowSteps = [
  'Request paid endpoint',
  'Receive 402 instructions',
  'Build and sign payment',
  'Retry with Payment-Signature',
  'Receive paid response',
];

export default function SdkDocs() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-emerald-500/10 blur-3xl" />
        <div className="relative space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-300" />
            <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Agent Payment SDK</p>
          </div>
          <h2 className="text-2xl font-semibold text-white">Stripe-style payments for agent APIs</h2>
          <p className="text-sm text-slate-400 max-w-xl">
            Wrap any endpoint with x402 paywalls and let agents pay automatically. No API keys, no manual signing, no blockchain plumbing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-200">
            <Code2 className="w-4 h-4 text-emerald-300" />
            <p className="text-xs font-semibold uppercase tracking-wider">Server Wrapper</p>
          </div>
          <pre className="text-[11px] text-slate-300 bg-slate-950/80 border border-slate-800 rounded-lg p-4 overflow-x-auto font-mono">
            {serverSnippet}
          </pre>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-200">
            <Code2 className="w-4 h-4 text-violet-300" />
            <p className="text-xs font-semibold uppercase tracking-wider">Client SDK</p>
          </div>
          <pre className="text-[11px] text-slate-300 bg-slate-950/80 border border-slate-800 rounded-lg p-4 overflow-x-auto font-mono">
            {clientSnippet}
          </pre>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-200">
            <Layers className="w-4 h-4 text-amber-300" />
            <p className="text-xs font-semibold uppercase tracking-wider">Architecture</p>
          </div>
          <ul className="text-xs text-slate-400 space-y-2">
            <li>Wrap endpoint with payment guard</li>
            <li>Verify Stellar payment + replay protection</li>
            <li>Optional facilitator settlement</li>
          </ul>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <p className="text-xs font-semibold uppercase tracking-wider">Guarantees</p>
          </div>
          <ul className="text-xs text-slate-400 space-y-2">
            <li>HTTP 402 when unpaid</li>
            <li>Automatic payment retry</li>
            <li>Wallet keys stay client-side</li>
          </ul>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-200">
            <Zap className="w-4 h-4 text-violet-300" />
            <p className="text-xs font-semibold uppercase tracking-wider">Config</p>
          </div>
          <ul className="text-xs text-slate-400 space-y-2">
            <li>Price per endpoint</li>
            <li>Asset + network selection</li>
            <li>Destination wallet</li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-slate-200 mb-3">
          <ArrowRight className="w-4 h-4 text-emerald-300" />
          <p className="text-xs font-semibold uppercase tracking-wider">End-to-End Flow</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {flowSteps.map((step, index) => (
            <div key={step} className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="text-emerald-300 font-semibold">{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
