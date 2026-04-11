export interface SessionData {
  session_token: string;
  user_id: string;
  email: string;
  created_at: string;
  last_activity: string;
}

export interface AgentConfig {
  name?: string;
  description?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ---------------------------------------------------------
// FORGE v3: Core Production Feature Types
// ---------------------------------------------------------

/**
 * 1. Identity + Reputation Layer
 * Tracks on-chain metrics and reputation for economic ranking
 */
export interface AgentIdentity {
  stellarAddress: string;
  agentType: string;
  reputationScore: number;     // 0-100 scale (used in bidding)
  successRate: number;         // % of successful task completions
  avgLatencyMs: number;
  totalSlashedXlm: number;
  stakeAmount: number;
}

/**
 * 2. Payment Policy Engine
 * Programmable spending constraints enforced natively
 */
export interface PaymentPolicy {
  maxSpendPerRequest: number;  // Hard cap XLM
  maxSpendPerTask: number;
  allowedContractAddresses: string[];
  allowedAssets: ('XLM' | 'USDC')[];
  rateLimitPerMinute: number;
}

/**
 * 3 & 4. Escrow, Settlement & Staking Contracts
 * Data tracking the lifecycle of trustless settlements
 */
export interface EscrowContract {
  escrowId: string;
  lockedAmount: number;
  asset: string;
  stakedAmount: number;
  verifierAgent: string;       // Auditor Agent address
  status: 'locked' | 'released' | 'slashed' | 'disputed';
}

/**
 * 9. Real-Time Budget Management
 * Tracks orchestrator's budget context
 */
export interface TaskBudget {
  initialBudgetXlm: number;
  spentXlm: number;
  remainingXlm: number;
  allowFallback: boolean;      // Drop optional steps if budget runs low
}

export interface AgentState {
  session_id: string;
  session_data: SessionData | null;
  agent_config?: AgentConfig;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  current_input: string;
  detected_intent: IntentType;
  action_type: ActionType;
  action_params: Record<string, any>;
  response_message: string;
  success: boolean;
  networkEvents?: any[];
  error?: string;
  
  // FORGE v3 Integrated State
  budget?: TaskBudget;
  activeEscrows?: EscrowContract[];
}

export enum IntentType {
  DEFI = "defi",
  NEWS = "news",
  SECURITY = "security",
  GENERAL = "general",
}

export enum ActionType {
  GET_DEFI_DATA = "get_defi_data",
  GET_NEWS = "get_news",
  GET_SECURITY_AUDIT = "get_security_audit",
  NONE = "none",
}

export interface AgentResponse {
  message: string;
  task: string;
  params: Record<string, any>;
  success: boolean;
}
