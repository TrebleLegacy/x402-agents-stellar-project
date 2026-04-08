'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, AlertCircle, Zap } from 'lucide-react';
import { Message, AgentQueryResponse, InteractionLogEvent } from '@/types/agent';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  const timeline = useMemo(() => {
    const messageItems = messages.map((message, index) => ({
      kind: 'message' as const,
      key: `msg-${index}-${message.timestamp || 'na'}`,
      at: message.timestamp || new Date(0).toISOString(),
      order: index,
      message,
    }));
    const logItems =
      showInlineLogs !== false && logEvents?.length
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
  }, [logEvents, messages, showInlineLogs]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, logEvents]);

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

      if (response.status === 'success') {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
          trace: response.trace,
          agentDebug: response.agentDebug,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
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
    void submitMessage(autoMessage);
  }, [autoMessage, isLoading, isPaying, messages.length, onAutoMessageSent, sessionId]);

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
        {timeline.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col gap-4 text-slate-400">
            <div className="text-center">
              <p className="text-sm">Start a conversation with {agentName}</p>
              <p className="text-xs text-slate-500 mt-2">Type a message below to begin</p>
            </div>
          </div>
        ) : (
          <>
            {timeline.map((item) => (
              item.kind === 'log' ? (
                <div key={item.key} className="flex justify-center">
                  <div className="w-full max-w-md px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 uppercase">{item.log.source}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.log.at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-200 font-medium">{item.log.stage}</div>
                    <div className="text-slate-400">{item.log.detail}</div>
                    {item.log.payload !== undefined && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-slate-500 cursor-pointer">payload</summary>
                        <pre className="text-[10px] text-slate-400 whitespace-pre-wrap break-words bg-slate-950/60 p-2 rounded border border-slate-800 overflow-x-auto">
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
                      {item.message.content}
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
                                      {new Date(event.at).toLocaleTimeString()}
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

                    {item.message.timestamp && (
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(item.message.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            ))}
            <div ref={messagesEndRef} />
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
