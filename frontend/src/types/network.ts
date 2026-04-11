export interface ApiTool {
  id: string;
  name: string;
  category: string;
  description: string;
  endpoint: string;
  pricing: string;
  auth: string;
  callable: boolean;
  price: string;
  x402Path: string;
  params?: Record<string, string>;
  tags?: string[];
  examples?: string[];
}

export interface NetworkToolSelection {
  id: string;
  params: Record<string, any>;
  reason: string;
}

export interface NetworkPlan {
  reasoning: string;
  selectedTools: NetworkToolSelection[];
  skippedTools?: Array<{ id: string; reason: string }>;
}

export interface NetworkToolCall {
  id: string;
  name: string;
  status: 'success' | 'error';
  durationMs: number;
  data?: any;
  error?: string;
  payment?: any;
}

export interface NetworkPreprocess {
  normalizedQuery?: string;
  intent?: string;
  clarifyingQuestion?: string;
}

export interface NetworkExecutionResponse {
  success: boolean;
  query: string;
  analysis?: NetworkPreprocess;
  plan: NetworkPlan;
  toolCalls: NetworkToolCall[];
}
