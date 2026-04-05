export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt?: string;
  model: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  temperature: number;
  maxTokens: number;
}

export interface SessionData {
  session_id: string;
  agent_config: AgentConfig;
  created_at: string;
  last_activity: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  trace?: AgentTraceEvent[];
  agentDebug?: AgentDebugInfo;
}

export interface AgentTraceEvent {
  at: string;
  stage:
    | 'request_started'
    | 'paywall_received'
    | 'payment_signing_started'
    | 'payment_signing_completed'
    | 'payment_retry_submitted'
    | 'payment_retry_succeeded'
    | 'payment_retry_failed'
    | 'request_succeeded'
    | 'request_failed';
  detail: string;
  payload?: unknown;
}

export interface AgentDebugInfo {
  intent?: string;
  action?: string;
  success?: boolean;
  waiting_for_wallet_input?: boolean;
  pending_payment?: {
    destination?: string;
    amount?: string;
    asset_code?: string;
    destination_name?: string;
  };
  error?: string;
}

export interface AgentQueryRequest {
  query: string;
  session_id?: string;
}

export interface AgentQueryResponse {
  session_id: string;
  response: string;
  messages: Message[];
  status: 'success' | 'error';
  error?: string;
  trace?: AgentTraceEvent[];
  agentDebug?: AgentDebugInfo;
  paymentResponse?: Record<string, unknown>;
}

export interface PaymentSignatureHeader {
  transaction: string;
  signed: boolean;
  publicKey: string;
  timestamp: number;
}

export interface PaymentInstructions {
  scheme: string;
  price: string;
  network: string;
  payTo: string;
  facilitatorUrl: string;
}

export interface InteractionLogEvent {
  at: string;
  source: 'agent' | 'specialist' | 'forge' | 'sdk';
  stage: string;
  detail: string;
  payload?: unknown;
}
