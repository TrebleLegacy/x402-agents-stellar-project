import axios, { AxiosInstance } from 'axios';
import { X402PaymentClient, PaymentSignatureData } from './x402Client';
import {
  AgentTraceEvent,
  AgentQueryResponse,
  AgentDebugInfo,
  PaymentInstructions,
  InteractionLogEvent,
} from '@/types/agent';

/** A single auto-payment record */
export interface AutoPayment {
  id: string;
  service: string;
  amount: string;
  txHash?: string;
  timestamp: string;
  status: 'settled' | 'failed';
}

/** Budget state for autonomous payments */
export interface BudgetState {
  dailyLimit: number;
  spent: number;
  remaining: number;
  payments: AutoPayment[];
}

/**
 * Signing function type — allows pluggable signers (Freighter, raw keypair, etc.)
 * Takes unsigned XDR + network passphrase, returns signed XDR.
 */
export type TransactionSigner = (xdr: string, networkPassphrase: string) => Promise<string>;

export class AgentAPIClient {
  private client: AxiosInstance;
  private paymentClient: X402PaymentClient;
  private publicKey: string | null = null;
  private signer: TransactionSigner | null = null;
  private onLog?: (event: InteractionLogEvent) => void;
  private budget: BudgetState | null = null;
  private onPaymentMade?: (budget: BudgetState, payment: AutoPayment) => void;

  constructor(baseURL: string, network: 'testnet' | 'mainnet' = 'testnet') {
    this.client = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
    });
    this.paymentClient = new X402PaymentClient(network);
  }

  /** Set the budget for autonomous payments */
  setBudget(budget: BudgetState): void {
    this.budget = budget;
  }

  /** Callback fired after each auto-payment for UI updates */
  setPaymentCallback(cb: (budget: BudgetState, payment: AutoPayment) => void): void {
    this.onPaymentMade = cb;
  }

  /** Set the connected wallet's public key (from Freighter) */
  setPublicKey(publicKey: string): void {
    this.publicKey = publicKey;
  }

  /** Set the transaction signer (Freighter's signTransaction wrapper) */
  setSigner(signer: TransactionSigner): void {
    this.signer = signer;
  }

  /** @deprecated Use setPublicKey + setSigner instead */
  setKeypair(publicKey: string, secret: string): void {
    this.publicKey = publicKey;
    // Create a local signer from the raw secret key for backwards compat
    this.signer = async (xdr: string) => {
      const signatureData = this.paymentClient.signTransaction(xdr, secret);
      return signatureData.transaction;
    };
  }

  setLogger(callback?: (event: InteractionLogEvent) => void): void {
    this.onLog = callback;
  }

  private emitLog(event: InteractionLogEvent): void {
    this.onLog?.(event);
  }

  // ── Payment signing (supports Freighter or raw keypair) ───────
  private async buildAndSignPayment(
    destination: string,
    amount: string,
    price: string
  ): Promise<string> {
    if (!this.publicKey || !this.signer) {
      throw new Error('Wallet not connected. Call setPublicKey + setSigner first.');
    }

    // Budget check: reject if over limit
    const amountNum = parseFloat(amount) || 0;
    if (this.budget) {
      if (amountNum > this.budget.remaining) {
        throw new Error(
          `Budget exceeded. Payment: ${amount} XLM, remaining: ${this.budget.remaining.toFixed(4)} XLM`
        );
      }
    }

    // Build unsigned transaction (async — fetches real sequence from Horizon)
    const unsignedXdr = await this.paymentClient.buildUnsignedTransaction({
      sourcePublicKey: this.publicKey,
      receiveSigningPublicKey: destination,
      destinationAddress: destination,
      amount,
      assetContract: '',
      price,
    });

    // Sign via the pluggable signer (agent wallet auto-sign, or Freighter popup)
    const signedXdr = await this.signer(unsignedXdr, this.paymentClient.getNetworkPassphrase());

    const signatureData: PaymentSignatureData = {
      transaction: signedXdr,
      signed: true,
      publicKey: this.publicKey,
      timestamp: Date.now(),
    };

    return this.paymentClient.createPaymentSignatureHeader(signatureData);
  }

  /** Track an auto-payment in the budget and notify UI */
  private trackPayment(amount: string, txHash?: string): void {
    if (!this.budget) return;

    const payment: AutoPayment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      service: 'Agent API call',
      amount,
      txHash,
      timestamp: new Date().toISOString(),
      status: txHash ? 'settled' : 'failed',
    };

    const amountNum = parseFloat(amount) || 0;
    this.budget.spent += amountNum;
    this.budget.remaining = Math.max(0, this.budget.dailyLimit - this.budget.spent);
    this.budget.payments.push(payment);

    this.onPaymentMade?.(this.budget, payment);
  }

  // ── Response normalization ────────────────────────────────────
  private normalizeAgentResponse(
    data: any,
    options?: {
      trace?: AgentTraceEvent[];
      paymentResponse?: Record<string, unknown>;
    }
  ): AgentQueryResponse {
    const isSuccess = data?.status === 'success' || data?.success === true;
    const backendTrace = Array.isArray(data?.trace)
      ? (data.trace as AgentTraceEvent[])
      : [];
    const mergedTrace = [...(options?.trace || []), ...backendTrace];
    const responseValue = data?.response;
    let responseText = '';

    if (typeof responseValue === 'string') {
      responseText = responseValue;
    } else if (responseValue?.message) {
      responseText = responseValue.message;
    } else if (data?.message) {
      responseText = data.message;
    } else if (data?.response) {
      responseText = JSON.stringify(data.response);
    } else {
      responseText = '(No response returned from the backend)';
    }

    // Fallback for empty success responses
    if (responseText.trim().length === 0 && isSuccess) {
      responseText = `[Agent processed your request but returned no response. Trace events: ${mergedTrace.length}]`;
    }

    return {
      session_id: data?.session_id || '',
      response: responseText,
      messages: data?.messages || [],
      status: isSuccess ? 'success' : 'error',
      error: isSuccess ? undefined : data?.error || data?.message || 'Unknown error',
      trace: mergedTrace,
      agentDebug: (data?.debug || undefined) as AgentDebugInfo | undefined,
      paymentResponse: options?.paymentResponse,
    };
  }

  private parsePriceToAmount(price: unknown): string {
    if (typeof price === 'number') return String(price);
    if (typeof price === 'string') {
      const trimmed = price.trim();
      return /^\$\d+(\.\d+)?$/.test(trimmed) ? trimmed.slice(1) : trimmed;
    }
    if (price && typeof price === 'object' && 'amount' in (price as any)) {
      const amount = (price as any).amount;
      return typeof amount === 'string' ? amount : String(amount);
    }
    return '0.001';
  }

  // ── Emit backend trace/network events to the log ──────────────
  private emitBackendEvents(data: any): void {
    if (data.networkEvents && Array.isArray(data.networkEvents)) {
      data.networkEvents.forEach((ev: any) => this.emitLog(ev));
    }
    if (data.trace && Array.isArray(data.trace)) {
      data.trace.forEach((event: any) => {
        const source = ['agent', 'specialist', 'forge', 'sdk', 'network'].includes(event?.source)
          ? event.source
          : 'agent';
        this.emitLog({
          at: event?.at || new Date().toISOString(),
          source,
          stage: event?.stage || 'trace',
          detail: event?.detail || 'Trace event',
          payload: event?.payload,
        });
      });
    }
    if (data.debug) {
      this.emitLog({
        at: new Date().toISOString(),
        source: 'agent',
        stage: 'agent_debug',
        detail: 'Agent reasoning snapshot',
        payload: data.debug,
      });
    }
  }

  // ── Main query endpoint ───────────────────────────────────────
  async queryAgent(
    query: string,
    sessionId?: string,
    agentConfig?: any,
    destination?: string
  ): Promise<AgentQueryResponse> {
    const trace: AgentTraceEvent[] = [
      {
        at: new Date().toISOString(),
        stage: 'request_started',
        detail: 'Sending initial agent query request',
        payload: { sessionId, queryPreview: query.slice(0, 120) },
      },
    ];

    this.emitLog({
      at: new Date().toISOString(),
      source: 'agent',
      stage: 'request_started',
      detail: 'Agent query submitted',
      payload: { sessionId, queryPreview: query.slice(0, 120) },
    });

    try {
      const response = await this.client.post(
        '/api/agent/query',
        { query, session_id: sessionId, agent_config: agentConfig }
      );

      trace.push({
        at: new Date().toISOString(),
        stage: 'request_succeeded',
        detail: 'Agent query completed without paywall challenge',
      });
      this.emitLog({
        at: new Date().toISOString(),
        source: 'agent',
        stage: 'request_succeeded',
        detail: 'Agent query succeeded without payment',
      });

      this.emitBackendEvents(response.data);
      return this.normalizeAgentResponse(response.data, { trace });

    } catch (error: any) {
      if (error.response?.status === 402) {
        const instructions = (error.response.data?.instructions ||
          error.response.data) as PaymentInstructions;
        const payTo = instructions?.payTo || destination;

        trace.push({
          at: new Date().toISOString(),
          stage: 'paywall_received',
          detail: 'Received x402 paywall challenge (402 Payment Required)',
          payload: instructions,
        });
        this.emitLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'paywall_received',
          detail: 'Received 402 paywall instructions',
          payload: instructions,
        });

        if (!payTo) {
          trace.push({
            at: new Date().toISOString(),
            stage: 'request_failed',
            detail: 'Paywall did not provide destination address',
          });
          throw new Error('Payment required but no destination was provided by server.');
        }

        const amount = this.parsePriceToAmount(instructions?.price);

        this.emitLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'payment_signing_started',
          detail: 'Signing payment for paywall',
          payload: { destination: payTo, amount },
        });

        const paymentHeader = await this.buildAndSignPayment(
          payTo,
          amount,
          typeof instructions?.price === 'string' ? instructions.price : amount
        );

        this.emitLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'payment_signing_completed',
          detail: 'Payment signature created',
        });

        try {
          const retryResponse = await this.client.post(
            '/api/agent/query',
            { query, session_id: sessionId, agent_config: agentConfig },
            {
              headers: {
                'Payment-Signature': paymentHeader,
                ...(instructions?.network ? { 'X-402-Network': instructions.network } : {}),
                ...(instructions?.scheme ? { 'X-402-Scheme': instructions.scheme } : {}),
                ...(instructions?.facilitatorUrl ? { 'X-402-Facilitator': instructions.facilitatorUrl } : {}),
              },
            }
          );

          const paymentResponseHeader = retryResponse.headers?.['payment-response'];
          const paymentResponse = paymentResponseHeader
            ? this.paymentClient.parsePaymentResponse(paymentResponseHeader)
            : undefined;

          // Track the auto-payment in budget
          const txHash = (paymentResponse?.hash as string) || undefined;
          this.trackPayment(amount, txHash);

          trace.push({
            at: new Date().toISOString(),
            stage: 'payment_retry_succeeded',
            detail: 'Paywall payment accepted',
            payload: paymentResponse,
          });
          this.emitLog({
            at: new Date().toISOString(),
            source: 'agent',
            stage: 'payment_retry_succeeded',
            detail: `Auto-payment settled: ${amount} XLM${txHash ? ` (tx: ${txHash.slice(0, 8)}...)` : ''}`,
            payload: paymentResponse,
          });

          this.emitBackendEvents(retryResponse.data);
          return this.normalizeAgentResponse(retryResponse.data, { trace, paymentResponse });
        } catch (retryError: any) {
          trace.push({
            at: new Date().toISOString(),
            stage: 'payment_retry_failed',
            detail: 'Retry with payment failed',
            payload: retryError?.response?.data || retryError?.message,
          });
          throw retryError;
        }
      }

      trace.push({
        at: new Date().toISOString(),
        stage: 'request_failed',
        detail: 'Initial request failed',
        payload: error?.response?.data || error?.message,
      });
      this.emitLog({
        at: new Date().toISOString(),
        source: 'agent',
        stage: 'request_failed',
        detail: 'Agent query failed',
        payload: error?.response?.data || error?.message,
      });
      throw error;
    }
  }

  async createSession(agentConfig: any): Promise<{ sessionId: string; bootMessage?: string }> {
    const response = await this.client.post<{ session_id: string; boot_message?: string }>(
      '/api/agent/session',
      agentConfig
    );
    return {
      sessionId: response.data.session_id,
      bootMessage: response.data.boot_message,
    };
  }

  async getSessionHistory(
    sessionId: string
  ): Promise<Array<{ role: string; content: string }>> {
    const response = await this.client.get<any[]>(
      `/api/agent/session/${sessionId}/history`
    );
    return response.data;
  }

  async chat(
    config: any,
    query: string,
    sessionId?: string
  ): Promise<AgentQueryResponse> {
    return this.queryAgent(query, sessionId, config);
  }

  /**
   * Advanced orchestrator with SSE streaming
   */
  async executeAdvancedOrchestrator(
    task: string,
    agentName: string,
    budget: number = 1.0,
    destinationAddress?: string,
    onStage?: (stage: any) => void
  ): Promise<any> {
    this.emitLog({
      at: new Date().toISOString(),
      source: 'orchestrator',
      stage: 'init',
      detail: `Starting advanced orchestrator for "${task}"`,
    });

    try {
      const response = await this.client.post(
        '/api/orchestrator/execute',
        { task, agentName, budget, destinationAddress },
        { responseType: 'stream' }
      );

      return new Promise((resolve, reject) => {
        let buffer = '';
        const stages: any[] = [];

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n\n');
          buffer = lines[lines.length - 1];

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onStage?.(data);
                stages.push(data);
                this.emitLog({
                  at: new Date().toISOString(),
                  source: 'orchestrator',
                  stage: data.stage || `stage-${data.step}`,
                  detail: data.reasoning || data.decision,
                  payload: { step: data.step, cost: data.cost, txHash: data.txHash },
                });
              } catch {
                // Continue on parse error
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({ status: 'success', stages, response: 'Orchestration complete' });
        });
        response.data.on('error', reject);
      });
    } catch (error: any) {
      this.emitLog({
        at: new Date().toISOString(),
        source: 'orchestrator',
        stage: 'error',
        detail: `Orchestrator error: ${error.message}`,
      });
      throw error;
    }
  }

  /**
   * Forge Oracle with LLM-driven agent selection
   */
  async forgeOracleWithReasoning(
    task: string,
    context?: string,
    budget: number = 1.0,
    onStage?: (stage: any) => void
  ): Promise<any> {
    this.emitLog({
      at: new Date().toISOString(),
      source: 'forge-oracle',
      stage: 'init',
      detail: `Forge Oracle initiated for "${task}"`,
    });

    try {
      const response = await this.client.post(
        '/api/forge/v2/oracle',
        { task, context, budget },
        { responseType: 'stream' }
      );

      return new Promise((resolve, reject) => {
        let buffer = '';
        const stages: any[] = [];

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n\n');
          buffer = lines[lines.length - 1];

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onStage?.(data);
                stages.push(data);
                if (data.stage === 'agent-selection' || data.stage === 'agent-execution') {
                  this.emitLog({
                    at: new Date().toISOString(),
                    source: 'forge-oracle',
                    stage: data.stage,
                    detail: data.reasoning || `Processing ${data.stage}`,
                    payload: {
                      selectedAgent: data.selectedAgent,
                      confidence: data.confidence,
                      agent: data.agentName,
                      paymentTxHash: data.paymentTxHash,
                      cost: data.cost,
                    },
                  });
                }
              } catch {
                // Continue on parse error
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({ status: 'success', stages, response: 'Forge Oracle complete' });
        });
        response.data.on('error', reject);
      });
    } catch (error: any) {
      this.emitLog({
        at: new Date().toISOString(),
        source: 'forge-oracle',
        stage: 'error',
        detail: `Forge Oracle error: ${error.message}`,
      });
      throw error;
    }
  }
}
