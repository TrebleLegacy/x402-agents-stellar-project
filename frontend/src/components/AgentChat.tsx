'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle, Zap } from 'lucide-react';
import { Message, AgentQueryResponse } from '@/types/agent';

interface AgentChatProps {
  sessionId: string;
  agentName: string;
  onSendMessage: (query: string) => Promise<AgentQueryResponse>;
  isLoading: boolean;
  isPaying: boolean;
}

export default function AgentChat({
  sessionId,
  agentName,
  onSendMessage,
  isLoading,
  isPaying,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setError(null);

    try {
      const response = await onSendMessage(inputValue);

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
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col gap-4 text-slate-400">
            <div className="text-center">
              <p className="text-sm">Start a conversation with {agentName}</p>
              <p className="text-xs text-slate-500 mt-2">Type a message below to begin</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>

                  {msg.role === 'assistant' && (msg.trace?.length || msg.agentDebug) ? (
                    <div className="mt-3 pt-3 border-t border-slate-700/70 space-y-2">
                      {msg.trace?.length ? (
                        <details className="bg-slate-900/60 rounded border border-slate-700">
                          <summary className="px-3 py-2 text-xs text-emerald-300 cursor-pointer font-medium">
                            Execution Trace
                          </summary>
                          <div className="px-3 pb-3 space-y-2">
                            {msg.trace.map((event, traceIdx) => (
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

                      {msg.agentDebug ? (
                        <details className="bg-slate-900/60 rounded border border-slate-700">
                          <summary className="px-3 py-2 text-xs text-blue-300 cursor-pointer font-medium">
                            Agent Reasoning Snapshot
                          </summary>
                          <div className="px-3 pb-3">
                            <pre className="text-[11px] text-slate-300 whitespace-pre-wrap break-words bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                              {JSON.stringify(msg.agentDebug, null, 2)}
                            </pre>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ) : null}

                  {msg.timestamp && (
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
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
