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
