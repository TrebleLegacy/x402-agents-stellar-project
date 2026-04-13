'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, AlertCircle, Zap, Sparkles } from 'lucide-react';
import { Message, AgentQueryResponse, InteractionLogEvent } from '@/types/agent';
import { renderRichAgentCard } from './AgentCards';
import AgentTemplates, { AgentTemplate } from './AgentTemplates';
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
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [agentBids, setAgentBids] = useState<AgentBid[]>([]);
  const [orchestrationStages, setOrchestrationStages] = useState<StageStatus[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentBid | null>(null);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  const [pendingResponse, setPendingResponse] = useState<{ id: string; content: string; trace?: any[]; debug?: any } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);
  const messageCounterRef = useRef(0);
  const messagesRefForDirectUpdate = useRef<Message[]>([]);
  const placeholderTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const nextMessageId = () => {
    messageCounterRef.current += 1;
    return `msg-${Date.now()}-${messageCounterRef.current}`;
  };

  const setMessagesWithRef = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages(prevMessages => {
      const newMessages = typeof updater === 'function' ? updater(prevMessages) : updater;
      messagesRefForDirectUpdate.current = newMessages;
      
      // Log all message updates
      const assistantMessages = newMessages.filter(m => m.role === 'assistant');
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      
      console.log('[setMessagesWithRef] Messages updated', {
        totalMessages: newMessages.length,
        totalAssistantMessages: assistantMessages.length,
        lastAssistantContent: lastAssistant?.content?.slice(0, 100) || 'EMPTY',
        lastAssistantId: lastAssistant?.id || 'NO_ID',
        forceCounter: forceUpdateCounter
      });
      return newMessages;
    });
    // CRITICAL: Always increment force counter to guarantee re-render
    setForceUpdateCounter(c => c + 1);
  };

  const timeline = useMemo(() => {
    console.log('[timeline] Recalculating timeline', { 
      messageCount: messages.length, 
      forceCounter: forceUpdateCounter,
      hasPendingResponse: !!pendingResponse,
      firstMsg: messages[0]?.content?.slice(0, 30)
    });
    
    let messageItems = messages.map((message, index) => ({
      kind: 'message' as const,
      key: message.id || `msg-${index}-${message.timestamp || 'na'}`,
      at: message.timestamp || new Date(0).toISOString(),
      order: index,
      message,
    }));

    // If there's a pending response, merge it into the last assistant message
    if (pendingResponse) {
      messageItems = messageItems.map(item => {
        if (item.message.id === pendingResponse.id && item.message.role === 'assistant') {
          console.log('[timeline] Merging pending response into message');
          return {
            ...item,
            message: {
              ...item.message,
              content: pendingResponse.content,
              trace: pendingResponse.trace,
              agentDebug: pendingResponse.debug,
            }
          };
        }
        return item;
      });
    }

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
      if (timeA === timeB) {
        return a.order - b.order;
      }
      return timeA - timeB;
    });
  }, [logEvents, messages, showInlineLogs, forceUpdateCounter, pendingResponse]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    const time = iso.slice(11, 19);
    return time || iso;
  };

  const coerceMessageContent = (value: unknown) => {
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (value === null || value === undefined) {
      console.warn('[coerceMessageContent] Null/undefined value received');
      return '';
    }
    // If it's an empty string, explicitly log it
    if (typeof value === 'string' && value.trim().length === 0) {
      console.warn('[coerceMessageContent] Empty string value received');
      return '';
    }
    try {
      const stringified = JSON.stringify(value, null, 2);
      if (stringified.trim().length === 0 || stringified === '{}' || stringified === '[]') {
        console.warn('[coerceMessageContent] JSON stringified to empty/bare object');
        return '';
      }
      return stringified;
    } catch (e) {
      console.warn('[coerceMessageContent] JSON stringify failed', e);
      const fallback = String(value);
      if (fallback.trim().length === 0) {
        console.warn('[coerceMessageContent] String() produced empty result');
      }
      return fallback;
    }
  };

  useEffect(() => {
    console.log('[useEffect messages changed] Current messages:', {
      count: messages.length,
      lastMessage: messages[messages.length - 1]?.content?.slice(0, 50),
      hasAssistant: messages.some(m => m.role === 'assistant'),
    });
    scrollToBottom();
  }, [messages, logEvents]);

  useEffect(() => {
    scrollToBottom();
  }, [forceUpdateCounter]);

  useEffect(() => {
    if (pendingResponse) {
      console.log('[useEffect pendingResponse] Pending response state changed', {
        id: pendingResponse.id,
        contentLength: pendingResponse.content.length,
        hasTrace: !!pendingResponse.trace?.length,
      });
      // Ensure the pending response is merged into timeline immediately
      console.log('[useEffect pendingResponse] Current messages snapshot:', {
        totalMessages: messages.length,
        messageIds: messages.map(m => m.id).slice(-3), // Last 3
      });
      
      // Force a re-render by incrementing counter
      requestAnimationFrame(() => {
        console.log('[uEffect pendingResponse] Triggering force-update via requestAnimationFrame');
        setForceUpdateCounter(c => c + 1);
      });
    }
  }, [pendingResponse, messages.length]);

  const generateMockBids = (): AgentBid[] => {
    const baseAgents = [
      { name: 'DeFiAnalyzer', icon: '📊', caps: ['defi-metrics', 'protocol-analysis'] },
      { name: 'SecurityAuditor', icon: '🛡️', caps: ['security-analysis', 'vulnerability-scan'] },
      { name: 'NewsAggregator', icon: '📰', caps: ['news-retrieval', 'sentiment-analysis'] },
      { name: 'DataOracle', icon: '🔮', caps: ['price-feeds', 'on-chain-data'] },
      { name: 'ComplianceMonitor', icon: '✓', caps: ['compliance-check', 'policy-enforcement'] },
    ];

    return baseAgents.map((agent, idx) => ({
      id: `agent-${idx}`,
      name: agent.name,
      capabilities: agent.caps,
      trustScore: Math.floor(Math.random() * 40) + 60, // 60-100
      successRate: Math.random() * 0.4 + 0.6, // 60-100%
      totalInteractions: Math.floor(Math.random() * 150) + 50, // 50-200
      basePrice: 0.05,
      finalPrice: 0.05 * (Math.random() * 0.6 + 0.8), // 0.04-0.08
      reputationMultiplier: Math.random() * 0.4 + 0.8, // 0.8-1.2
      demandMultiplier: Math.random() * 0.3 + 1.0, // 1.0-1.3
      selectedForBid: idx === 0, // First one selected
    }));
  };

  const generateOrchestrationStages = (): StageStatus[] => [
    { stage: 1, name: 'Task Decomposition', status: 'completed', detail: 'Query parsed into subtasks', duration: 120, cost: 0 },
    { stage: 2, name: 'Agent Discovery', status: 'completed', detail: '5 agents found via x402 registry', duration: 180, cost: 0.01 },
    { stage: 3, name: 'Bidding & Reputation', status: 'completed', detail: 'All agents evaluated', duration: 95, cost: 0 },
    { stage: 4, name: 'Auditor Verification', status: 'completed', detail: 'Reputation checks passed', duration: 142, cost: 0.03 },
    { stage: 5, name: 'Policy Validation', status: 'completed', detail: 'Safety constraints verified', duration: 67, cost: 0 },
    { stage: 6, name: 'Economic Decision', status: 'completed', detail: 'DeFiAnalyzer selected (rank 1)', duration: 156, cost: 0 },
    { stage: 7, name: 'Budget Verification', status: 'completed', detail: '0.96 XLM remaining', duration: 51, cost: 0 },
    { stage: 8, name: 'x402 Payment', status: 'completed', detail: 'Stellar transaction confirmed', duration: 2400, cost: 0.108 },
    { stage: 9, name: 'Agent Execution', status: 'completed', detail: 'DeFiAnalyzer executing task', duration: 3200, cost: 0 },
    { stage: 10, name: 'Output Audit', status: 'completed', detail: 'Result validated, +2 reputation', duration: 487, cost: 0 },
    { stage: 11, name: 'Reputation Update', status: 'completed', detail: 'Interaction recorded', duration: 89, cost: 0 },
    { stage: 12, name: 'Trace Recording', status: 'completed', detail: 'Complete audit trail saved', duration: 156, cost: 0 },
  ];

  const submitMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const now = Date.now();
    const userTimestamp = new Date(now).toISOString();
    const placeholderTimestamp = new Date(now + 1).toISOString();
    const userId = nextMessageId();
    const placeholderId = nextMessageId();
    
    console.log('[SubmitMessage] Creating user and placeholder messages', { userId, placeholderId });
    
    const userMessage: Message = {
      id: userId,
      role: 'user',
      content: trimmed,
      timestamp: userTimestamp,
    };
    const placeholderMessage: Message = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      timestamp: placeholderTimestamp,
    };

    setMessagesWithRef(prev => {
      const newMessages = [...prev, userMessage, placeholderMessage];
      console.log('[SubmitMessage] Messages state updated with placeholder', { 
        newMessagesCount: newMessages.length,
        lastMessage: newMessages[newMessages.length - 1]
      });
      return newMessages;
    });
    
    setInputValue('');
    setError(null);

    // SAFETY NET: If placeholder isn't filled in 3 seconds, inject fallback response
    const timeout = setTimeout(() => {
      console.warn('[SubmitMessage SAFETY] Placeholder message timeout - checking if filled');
      setMessages(current => {
        const placeholder = current.find(m => m.id === placeholderId);
        if (placeholder && (!placeholder.content || placeholder.content.trim().length === 0)) {
          console.warn('[SubmitMessage SAFETY] Placeholder still empty after 3s - injecting fallback');
          const fallbackContent = '[Agent response is being processed. The response may appear on the next page refresh, or contact support if this persists.]';
          return current.map(m => 
            m.id === placeholderId 
              ? { ...m, content: fallbackContent }
              : m
          );
        }
        return current;
      });
      placeholderTimeoutsRef.current.delete(placeholderId);
    }, 3000);

    placeholderTimeoutsRef.current.set(placeholderId, timeout);

    try {
      console.log('[SubmitMessage] Calling onSendMessage', { query: trimmed.slice(0, 50) });
      const response = await onSendMessage(trimmed);
      
      console.log('[SubmitMessage] Response received', { 
        responseText: response.response?.slice(0, 100) || 'EMPTY',
        hasTrace: !!response.trace?.length,
        hasDebug: !!response.agentDebug,
        status: response.status
      });

      const assistantContent = coerceMessageContent(response.response) || response.error || '(Empty response from agent)';
      
      console.log('[SubmitMessage] Coerced assistant content', { 
        contentLength: assistantContent.length,
        contentPreview: assistantContent.slice(0, 100)
      });

      setPendingResponse({
        id: placeholderId,
        content: assistantContent,
        trace: response.trace,
        debug: response.agentDebug,
      });

      console.log('[SubmitMessage] Pending response set immediately', {
        id: placeholderId,
        contentLength: assistantContent.length
      });

      setMessagesWithRef(prev => {
        const updated = prev.map(msg => {
          if (msg.id === placeholderId) {
            console.log('[SubmitMessage] UPDATING PLACEHOLDER MESSAGE', { 
              oldContent: msg.content,
              newContent: assistantContent.slice(0, 100),
              willHaveTrace: !!response.trace?.length
            });
            return {
              ...msg,
              content: assistantContent,
              trace: response.trace,
              agentDebug: response.agentDebug,
            };
          }
          return msg;
        });
        console.log('[SubmitMessage] Messages updated with response', {
          totalMessages: updated.length,
          assistantMessages: updated.filter(m => m.role === 'assistant').length,
          placeholderFound: updated.some(m => m.id === placeholderId),
          updatedMessageContent: updated.find(m => m.id === placeholderId)?.content?.slice?.(0, 50)
        });
        return updated;
      });

      // Clear pending response after merging into permanent state
      setPendingResponse(null);

      // Cancel the safety net timeout since response arrived
      const existingTimeout = placeholderTimeoutsRef.current.get(placeholderId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        placeholderTimeoutsRef.current.delete(placeholderId);
        console.log('[SubmitMessage] Cancelled placeholder safety timeout');
      }

      if (response.status !== 'success') {
        throw new Error(response.error || 'Unknown error');
      }

      // Trigger orchestration flow visually
      const bids = generateMockBids();
      setAgentBids(bids);

      const stages = generateOrchestrationStages();
      setOrchestrationStages(stages);

      const selected = bids.find(b => b.selectedForBid);
      setSelectedAgent(selected || bids[0]);

      const cost = stages.reduce((sum, s) => sum + (s.cost || 0), 0);
      setTotalCost(cost);
    } catch (err: any) {
      console.error('[SubmitMessage] Error occurred', { error: err.message });
      setError(err.message || 'Failed to get response');
      const errorContent = `Error: ${err.message}`;
      
      // Show error in pending response immediately
      setPendingResponse({
        id: placeholderId,
        content: errorContent,
      });

      // Also persist to messages for consistency
      setMessagesWithRef(prev => 
        prev.map(msg => 
          msg.id === placeholderId
            ? { ...msg, content: errorContent }
            : msg
        )
      );

      // Clear pending response after a delay to let messages take over
      setTimeout(() => {
        setPendingResponse(null);
      }, 100);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMessage(inputValue);
  };

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

  // Cleanup function to clear any pending timeouts on unmount
  useEffect(() => {
    return () => {
      console.log('[AgentChat unmount] Clearing placeholder timeouts');
      placeholderTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      placeholderTimeoutsRef.current.clear();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{agentName}</h2>
            <p className="text-xs text-slate-400">Session: {sessionId.slice(0, 12)}...</p>
          </div>
          {isPaying && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-900/30 rounded-full border border-amber-700/50">
              <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-xs text-amber-300 font-medium">Processing Payment</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
        {/* Agent Templates Selector */}
        {messages.length === 0 && (
          <div className="mb-6">
            <AgentTemplates 
              onSelectTemplate={setSelectedTemplate}
              selectedId={selectedTemplate?.id}
            />
          </div>
        )}

        {/* Messages Timeline */}
        {timeline.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col gap-4 text-slate-400">
            <Sparkles className="w-8 h-8 opacity-50" />
            <div className="text-center">
              <p className="text-sm">Select an agent template above to begin</p>
              <p className="text-xs text-slate-500 mt-2">Then type a message to trigger the full orchestration flow</p>
            </div>
          </div>
        ) : (
          <>
            {/* Show bidding after message sent */}
            {agentBids.length > 0 && messages.length > 0 && (
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

            {/* Show orchestration flow */}
            {orchestrationStages.length > 0 && messages.length > 0 && (
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
                          {item.message.content ? (
                            item.message.content
                          ) : item.message.role !== 'user' ? (
                            <span className="text-slate-400 italic animate-pulse">⚡ Waiting for response...</span>
                          ) : null}
                        </p>

                        {item.message.role === 'assistant' && (item.message.trace?.length || item.message.agentDebug) ? (
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
