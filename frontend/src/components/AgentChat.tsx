'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, AlertCircle, Zap, Sparkles, Terminal } from 'lucide-react';
import { Message, AgentQueryResponse, InteractionLogEvent } from '@/types/agent';
import { renderRichAgentCard } from './AgentCards';

import AgentBiddingDisplay from './AgentBiddingDisplay';
import OrchestrationFlow from './OrchestrationFlow';

interface AgentChatProps {
  sessionId: string;
  agentName: string;
  onSendMessage: (query: string) => Promise<AgentQueryResponse>;
  isLoading: boolean;
  isPaying: boolean;
  autoMessage?: string;
  onAutoMessageSent?: () => void;
  logEvents?: InteractionLogEvent[];
  showInlineLogs?: boolean;
}

interface AgentBid {
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

interface StageStatus {
  stage: number;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
  duration?: number;
  cost?: number;
}

export default function AgentChat({
  sessionId,
  agentName,
  onSendMessage,
  isLoading,
  isPaying,
  autoMessage,
  onAutoMessageSent,
  logEvents,
  showInlineLogs,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [agentBids, setAgentBids] = useState<AgentBid[]>([]);
  const [orchestrationStages, setOrchestrationStages] = useState<StageStatus[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentBid | null>(null);
  const [devMode, setDevMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  // ── Timeline: merge messages + inline log events ──────────────
  const timeline = useMemo(() => {
    const messageItems = messages.map((message, index) => ({
      kind: 'message' as const,
      key: `msg-${index}-${message.timestamp || 'na'}`,
      at: message.timestamp || new Date(0).toISOString(),
      order: index,
      message,
    }));

    const hasAssistantMessage = messageItems.some(
      item => item.message.role === 'assistant' && item.message.content.trim().length > 0
    );
    const logItems =
      showInlineLogs !== false && logEvents?.length && hasAssistantMessage
        ? logEvents.map((log, index) => ({
            kind: 'log' as const,
            key: `log-${index}-${log.at}-${log.stage}`,
            at: log.at || new Date(0).toISOString(),
            order: index + messageItems.length,
            log,
          }))
        : [];

    return [...messageItems, ...logItems].sort((a, b) => {
      const timeA = Date.parse(a.at) || 0;
      const timeB = Date.parse(b.at) || 0;
      return timeA === timeB ? a.order - b.order : timeA - timeB;
    });
  }, [logEvents, messages, showInlineLogs]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    return iso.slice(11, 19) || iso;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, logEvents]);

  // ── Mock bid / orchestration generators ───────────────────────
  const generateMockBids = (): AgentBid[] => {
    const baseAgents = [
      { name: 'DeFiAnalyzer', caps: ['defi-metrics', 'protocol-analysis'] },
      { name: 'SecurityAuditor', caps: ['security-analysis', 'vulnerability-scan'] },
      { name: 'NewsAggregator', caps: ['news-retrieval', 'sentiment-analysis'] },
      { name: 'DataOracle', caps: ['price-feeds', 'on-chain-data'] },
      { name: 'ComplianceMonitor', caps: ['compliance-check', 'policy-enforcement'] },
    ];

    return baseAgents.map((agent, idx) => ({
      id: `agent-${idx}`,
      name: agent.name,
      capabilities: agent.caps,
      trustScore: Math.floor(Math.random() * 40) + 60,
      successRate: Math.random() * 0.4 + 0.6,
      totalInteractions: Math.floor(Math.random() * 150) + 50,
      basePrice: 0.05,
      finalPrice: 0.05 * (Math.random() * 0.6 + 0.8),
      reputationMultiplier: Math.random() * 0.4 + 0.8,
      demandMultiplier: Math.random() * 0.3 + 1.0,
      selectedForBid: idx === 0,
    }));
  };

  const generateOrchestrationStages = (): StageStatus[] => [
    { stage: 1, name: 'Task Decomposition', status: 'completed', detail: 'Query parsed into subtasks', duration: 120, cost: 0 },
    { stage: 2, name: 'Agent Discovery', status: 'completed', detail: '5 agents found via x402 registry', duration: 180, cost: 0.01 },
    { stage: 3, name: 'Bidding & Reputation', status: 'completed', detail: 'All agents evaluated', duration: 95, cost: 0 },
    { stage: 4, name: 'Auditor Verification', status: 'completed', detail: 'Reputation checks passed', duration: 142, cost: 0.03 },
    { stage: 5, name: 'Policy Validation', status: 'completed', detail: 'Safety constraints verified', duration: 67, cost: 0 },
    { stage: 6, name: 'Economic Decision', status: 'completed', detail: 'DeFiAnalyzer selected (rank 1)', duration: 156, cost: 0 },
    { stage: 7, name: 'Budget Verification', status: 'completed', detail: '0.96 USDC remaining', duration: 51, cost: 0 },
    { stage: 8, name: 'x402 Payment', status: 'completed', detail: 'Stellar transaction confirmed', duration: 2400, cost: 0.108 },
    { stage: 9, name: 'Agent Execution', status: 'completed', detail: 'DeFiAnalyzer executing task', duration: 3200, cost: 0 },
    { stage: 10, name: 'Output Audit', status: 'completed', detail: 'Result validated, +2 reputation', duration: 487, cost: 0 },
    { stage: 11, name: 'Reputation Update', status: 'completed', detail: 'Interaction recorded', duration: 89, cost: 0 },
    { stage: 12, name: 'Trace Recording', status: 'completed', detail: 'Complete audit trail saved', duration: 156, cost: 0 },
  ];

  // ── Submit: simple, clean, working ────────────────────────────
  const submitMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setError(null);

    try {
      const response = await onSendMessage(trimmed);

      const assistantContent =
        response.response || response.error || '(Empty response from agent)';

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        trace: response.trace,
        agentDebug: response.agentDebug,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.status !== 'success') {
        throw new Error(response.error || 'Unknown error');
      }

      // Trigger orchestration visuals
      const bids = generateMockBids();
      setAgentBids(bids);
      setOrchestrationStages(generateOrchestrationStages());
      setSelectedAgent(bids.find(b => b.selectedForBid) || bids[0]);
      setTotalCost(generateOrchestrationStages().reduce((s, st) => s + (st.cost || 0), 0));
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMessage(inputValue);
  };

  // ── Auto-message on first session ─────────────────────────────
  useEffect(() => {
    if (
      autoSentRef.current ||
      !autoMessage ||
      !sessionId ||
      messages.length > 0 ||
      isLoading ||
      isPaying
    ) {
      return;
    }
    autoSentRef.current = true;
    onAutoMessageSent?.();
    submitMessage(autoMessage);
  }, [autoMessage, isLoading, isPaying, messages.length, onAutoMessageSent, sessionId]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{agentName}</h2>
            <p className="text-xs text-slate-400">Session: {sessionId.slice(0, 12)}...</p>
          </div>
          <div className="flex items-center gap-2">
            {isPaying && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-900/30 rounded-full border border-amber-700/50">
                <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="text-xs text-amber-300 font-medium">Processing Payment</span>
              </div>
            )}
            <button
              onClick={() => setDevMode(prev => !prev)}
              className={`p-1.5 rounded-md transition-colors ${
                devMode
                  ? 'bg-emerald-800/60 text-emerald-300 border border-emerald-600/50'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
              title={devMode ? 'Hide dev logs' : 'Show dev logs'}
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
        {/* Messages Timeline */}
        {timeline.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col gap-4 text-slate-400">
            <Sparkles className="w-8 h-8 opacity-50" />
            <div className="text-center">
              <p className="text-sm">Ask me anything — I'll use paid x402 APIs to answer.</p>
              <p className="text-xs text-slate-500 mt-2">Each query is paid autonomously by your agent wallet</p>
            </div>
          </div>
        ) : (
          <>
            {/* Bidding display (dev mode only) */}
            {devMode && agentBids.length > 0 && messages.length > 0 && (
              <div className="mb-4">
                <AgentBiddingDisplay
                  agents={agentBids}
                  title="Agent Bidding Round"
                  onSelectAgent={(agent) => {
                    setAgentBids(prev =>
                      prev.map(a => ({ ...a, selectedForBid: a.id === agent.id }))
                    );
                    setSelectedAgent(agent);
                  }}
                />
              </div>
            )}

            {/* Orchestration flow (dev mode only) */}
            {devMode && orchestrationStages.length > 0 && messages.length > 0 && (
              <div className="mb-4">
                <OrchestrationFlow
                  stages={orchestrationStages}
                  selectedAgent={selectedAgent?.name}
                  totalCost={totalCost}
                  isProcessing={isLoading}
                />
              </div>
            )}

            {/* Messages */}
            {timeline.length > 0 && (
              <div className="space-y-3">
                {timeline.map((item) =>
                  item.kind === 'log' ? (
                    devMode ? (
                      <div key={item.key} className="pl-2 border-l-2 border-emerald-500/50">
                        <div className="px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">{item.log.source}</span>
                              <span className="text-[10px] text-emerald-600">·</span>
                              <span className="text-[10px] text-emerald-400 font-mono">
                                {formatTimestamp(item.log.at)}
                              </span>
                            </div>
                          </div>
                          <div className="pl-4">
                            <div className="text-emerald-100 font-semibold text-xs">{item.log.stage}</div>
                            <div className="text-emerald-300/80 text-xs leading-relaxed">{item.log.detail}</div>
                          </div>
                          {item.log.payload !== undefined && (
                            <details className="pl-4 mt-1">
                              <summary className="text-[10px] text-emerald-500/70 cursor-pointer hover:text-emerald-400 font-medium">→ payload details</summary>
                              <pre className="text-[9px] text-emerald-300/60 whitespace-pre-wrap break-words bg-slate-950/80 p-2 rounded border border-emerald-900/30 overflow-x-auto mt-1 font-mono">
                                {JSON.stringify(item.log.payload, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ) : null
                  ) : (
                    <div
                      key={item.key}
                      className={`flex ${item.message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          item.message.role === 'user'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-100'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {item.message.content}
                        </p>

                        {devMode && item.message.role === 'assistant' && (item.message.trace?.length || item.message.agentDebug) ? (
                          <div className="mt-3 pt-3 border-t border-slate-700/70 space-y-2">
                            {item.message.trace?.length ? (
                              <details className="bg-slate-900/60 rounded border border-slate-700">
                                <summary className="px-3 py-2 text-xs text-emerald-300 cursor-pointer font-medium">
                                  Execution Trace
                                </summary>
                                <div className="px-3 pb-3 space-y-2">
                                  {item.message.trace.map((event, traceIdx) => (
                                    <div
                                      key={traceIdx}
                                      className="text-xs text-slate-300 bg-slate-950/70 rounded border border-slate-800 p-2 space-y-1"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-emerald-400">
                                          {event.stage}
                                        </span>
                                        <span className="text-slate-500">
                                          {formatTimestamp(event.at)}
                                        </span>
                                      </div>
                                      <p>{event.detail}</p>
                                      {event.payload !== undefined && (
                                        <pre className="text-[11px] text-slate-400 whitespace-pre-wrap break-words bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                                          {JSON.stringify(event.payload, null, 2)}
                                        </pre>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ) : null}

                            {item.message.agentDebug && renderRichAgentCard(item.message.agentDebug)}

                            {item.message.agentDebug ? (
                              <details className="bg-slate-900/60 rounded border border-slate-700">
                                <summary className="px-3 py-2 text-xs text-blue-300 cursor-pointer font-medium">
                                  Agent Reasoning Snapshot
                                </summary>
                                <div className="px-3 pb-3">
                                  <pre className="text-[11px] text-slate-300 whitespace-pre-wrap break-words bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                                    {JSON.stringify(item.message.agentDebug, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {item.message.timestamp && (
                        <p className="text-xs mt-1 opacity-70">
                          {formatTimestamp(item.message.timestamp)}
                        </p>
                      )}
                    </div>
                  )
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-900/20 border-t border-red-900/50 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-4 bg-slate-900/50">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={isLoading || isPaying ? 'Processing...' : 'Type your message...'}
            disabled={isLoading || isPaying}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none disabled:bg-slate-700/50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || isPaying || !inputValue.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
