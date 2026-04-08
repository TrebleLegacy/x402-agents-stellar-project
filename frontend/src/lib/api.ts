import axios, { AxiosInstance } from 'axios';
import { X402PaymentClient, PaymentSignatureData } from './x402Client';
import {
  AgentTraceEvent,
  AgentQueryResponse,
  AgentDebugInfo,
  PaymentInstructions,
  InteractionLogEvent,
} from '@/types/agent';

export class AgentAPIClient {
  private client: AxiosInstance;
  private paymentClient: X402PaymentClient;
  private userKeypair: { publicKey: string; secret: string } | null = null;
  private onLog?: (event: InteractionLogEvent) => void;
  private budgetResolver?: (pubKey: string) => number | undefined;
  private paymentDeniedCallback?: (pubKey: string, amount: number, limit: number) => void;
  private engineConfig: { provider: 'forge' | 'byok'; apiKey?: string } = { provider: 'forge' };

  constructor(baseURL: string, network: 'testnet' | 'mainnet' = 'testnet') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.paymentClient = new X402PaymentClient(network);
  }

  setKeypair(publicKey: string, secret: string): void {
    this.userKeypair = { publicKey, secret };
  }

  setEngineConfig(provider: 'forge' | 'byok', apiKey?: string): void {
    this.engineConfig = { provider, apiKey };
  }

  setLogger(callback?: (event: InteractionLogEvent) => void): void {
    this.onLog = callback;
  }

  setBudgetResolver(resolver: (pubKey: string) => number | undefined): void {
    this.budgetResolver = resolver;
  }

  onPaymentDenied(callback: (pubKey: string, amount: number, limit: number) => void): void {
    this.paymentDeniedCallback = callback;
  }

  private emitLog(event: InteractionLogEvent): void {
    if (this.onLog) {
      this.onLog(event);
    }
  }

  private async buildAndSignPayment(
    destination: string,
    amount: string,
    price: string
  ): Promise<string> {
    if (!this.userKeypair) {
      throw new Error('Keypair not set. Call setKeypair first.');
    }

    const signatureData = this.paymentClient.buildAndSign(
      {
        sourcePublicKey: this.userKeypair.publicKey,
        receiveSigningPublicKey: destination,
        destinationAddress: destination,
        amount,
        assetContract: '',
        price,
      },
      this.userKeypair.secret
    );

    return this.paymentClient.createPaymentSignatureHeader(signatureData);
  }

  private normalizeAgentResponse(
    data: any,
    options?: {
      trace?: AgentTraceEvent[];
      paymentResponse?: Record<string, unknown>;
    }
  ): AgentQueryResponse {
    const isSuccess = data?.status === 'success' || data?.success === true;
    return {
      session_id: data?.session_id || '',
      response: data?.response || data?.message || '',
      messages: data?.messages || [],
      status: isSuccess ? 'success' : 'error',
      error: isSuccess ? undefined : data?.error || data?.message || 'Unknown error',
      trace: options?.trace || [],
      agentDebug: (data?.debug || undefined) as AgentDebugInfo | undefined,
      paymentResponse: options?.paymentResponse,
    };
  }

  private parsePriceToAmount(price: unknown): string {
    if (typeof price === 'number') {
      return String(price);
    }

    if (typeof price === 'string') {
      const trimmed = price.trim();
      if (/^\$\d+(\.\d+)?$/.test(trimmed)) {
        return trimmed.slice(1);
      }
      return trimmed;
    }

    if (price && typeof price === 'object' && 'amount' in (price as any)) {
      const amount = (price as any).amount;
      return typeof amount === 'string' ? amount : String(amount);
    }

    return '0.001';
  }

  async queryAgent(
    query: string,
    sessionId?: string,
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
      const headers: Record<string, string> = {
        'x-ai-provider': this.engineConfig.provider,
      };
      if (this.engineConfig.apiKey) {
        headers['x-api-key'] = this.engineConfig.apiKey;
      }

      const response = await this.client.post(
        '/api/agent/query',
        { query, session_id: sessionId },
        { headers }
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
          this.emitLog({
            at: new Date().toISOString(),
            source: 'agent',
            stage: 'request_failed',
            detail: 'Paywall missing destination',
          });
          throw new Error(
            'Payment required but no destination was provided by server.'
          );
        }

        const amount = this.parsePriceToAmount(instructions?.price);

        // --- Budget Interception (Cathedral Engine) ---
        if (this.budgetResolver) {
          const limit = this.budgetResolver(payTo);
          const requiredAmt = parseFloat(amount);
          
          if (limit === undefined) {
             console.warn(`[X402] No tracked API subscription found for ${payTo}.`);
          } else if (requiredAmt > limit) {
             trace.push({
               at: new Date().toISOString(),
               stage: 'request_failed',
               detail: `Payment denied: Required ${requiredAmt} XLM exceeds limit of ${limit} XLM`,
             });
             this.emitLog({
               at: new Date().toISOString(),
               source: 'agent',
               stage: 'request_failed',
               detail: 'Payment denied by policy',
               payload: { required: requiredAmt, limit }
             });

             if (this.paymentDeniedCallback) {
                this.paymentDeniedCallback(payTo, requiredAmt, limit);
             }

             throw new Error(`InsufficientBudgetError: The requested payment of ${requiredAmt} XLM exceeds the isolated budget limit of ${limit} XLM for ${payTo}`);
          }
        }
        // ----------------------------------------------

        trace.push({
          at: new Date().toISOString(),
          stage: 'payment_signing_started',
          detail: 'Building and signing Stellar payment transaction',
          payload: {
            destination: payTo,
            amount,
            network: instructions?.network,
            scheme: instructions?.scheme,
          },
        });
        this.emitLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'payment_signing_started',
          detail: 'Signing payment for paywall',
          payload: {
            destination: payTo,
            amount,
            network: instructions?.network,
            scheme: instructions?.scheme,
          },
        });

        const paymentHeader = await this.buildAndSignPayment(
          payTo,
          amount,
          typeof instructions?.price === 'string' ? instructions.price : amount
        );

        trace.push({
          at: new Date().toISOString(),
          stage: 'payment_signing_completed',
          detail: 'Payment transaction signed and encoded in Payment-Signature header',
          payload: { headerLength: paymentHeader.length },
        });
        this.emitLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'payment_signing_completed',
          detail: 'Payment signature created',
          payload: { headerLength: paymentHeader.length },
        });

        trace.push({
          at: new Date().toISOString(),
          stage: 'payment_retry_submitted',
          detail: 'Retrying agent query with payment headers',
        });
        this.emitLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'payment_retry_submitted',
          detail: 'Retrying agent query with payment',
        });

        try {
          const retryResponse = await this.client.post(
            '/api/agent/query',
            { query, session_id: sessionId },
            {
              headers: {
                'x-ai-provider': this.engineConfig.provider,
                ...(this.engineConfig.apiKey ? { 'x-api-key': this.engineConfig.apiKey } : {}),
                'Payment-Signature': paymentHeader,
                ...(instructions?.network
                  ? { 'X-402-Network': instructions.network }
                  : {}),
                ...(instructions?.scheme
                  ? { 'X-402-Scheme': instructions.scheme }
                  : {}),
                ...(instructions?.facilitatorUrl
                  ? { 'X-402-Facilitator': instructions.facilitatorUrl }
                  : {}),
              },
            }
          );

          const paymentResponseHeader = retryResponse.headers?.['payment-response'];
          const paymentResponse = paymentResponseHeader
            ? this.paymentClient.parsePaymentResponse(paymentResponseHeader)
            : undefined;

          trace.push({
            at: new Date().toISOString(),
            stage: 'payment_retry_succeeded',
            detail: 'Paywall payment accepted and protected agent response returned',
            payload: paymentResponse,
          });
          this.emitLog({
            at: new Date().toISOString(),
            source: 'agent',
            stage: 'payment_retry_succeeded',
            detail: 'Payment accepted by agent',
            payload: paymentResponse,
          });

          return this.normalizeAgentResponse(retryResponse.data, {
            trace,
            paymentResponse,
          });
        } catch (retryError: any) {
          trace.push({
            at: new Date().toISOString(),
            stage: 'payment_retry_failed',
            detail: 'Retry with payment failed',
            payload: retryError?.response?.data || retryError?.message,
          });
          this.emitLog({
            at: new Date().toISOString(),
            source: 'agent',
            stage: 'payment_retry_failed',
            detail: 'Payment retry failed',
            payload: retryError?.response?.data || retryError?.message,
          });
          throw retryError;
        }
      }

      trace.push({
        at: new Date().toISOString(),
        stage: 'request_failed',
        detail: 'Initial request failed before paywall handling',
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

  async createSession(agentConfig: any): Promise<string> {
    const response = await this.client.post<{ session_id: string }>(
      '/api/agent/session',
      agentConfig
    );
    return response.data.session_id;
  }

  async getSessionHistory(
    sessionId: string
  ): Promise<Array<{ role: string; content: string }>> {
    const response = await this.client.get<any[]>(
      `/api/agent/session/${sessionId}/history`
    );
    return response.data;
  }
}
