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

  constructor(baseURL: string, network: 'testnet' | 'mainnet' = 'testnet') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add global response logging interceptor
    this.client.interceptors.response.use(
      response => {
        console.log('[axios-interceptor] Response received:', {
          status: response.status,
          url: response.config.url,
          dataKeys: Object.keys(response.data || {}),
          hasMessage: !!response.data?.message,
          hasResponse: !!response.data?.response,
          dataPreview: JSON.stringify(response.data).slice(0, 200),
        });
        return response;
      },
      error => {
        console.log('[axios-interceptor] Error response:', {
          status: error.response?.status,
          url: error.config?.url,
          errorMessage: error.message,
        });
        return Promise.reject(error);
      }
    );
    
    this.paymentClient = new X402PaymentClient(network);
  }

  setKeypair(publicKey: string, secret: string): void {
    this.userKeypair = { publicKey, secret };
  }

  setLogger(callback?: (event: InteractionLogEvent) => void): void {
    this.onLog = callback;
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
    console.log('[normalizeAgentResponse] Input data structure:', {
      dataIsNull: data === null,
      dataIsUndefined: data === undefined,
      hasResponse: !!data?.response,
      hasMessage: !!data?.message,
      responseType: typeof data?.response,
      responseKeys: data?.response ? Object.keys(data.response) : [],
      dataKeys: Object.keys(data || {}),
      fullData: JSON.stringify(data).slice(0, 300),
    });

    const isSuccess = data?.status === 'success' || data?.success === true;
    const backendTrace = Array.isArray(data?.trace)
      ? (data.trace as AgentTraceEvent[])
      : [];
    const mergedTrace = [...(options?.trace || []), ...backendTrace];
    const responseValue = data?.response;
    let responseText = '';
    
    if (typeof responseValue === 'string') {
      console.log('[normalizeAgentResponse] Response is string');
      responseText = responseValue;
    } else if (responseValue?.message) {
      console.log('[normalizeAgentResponse] Response has .message property', { 
        messageLength: responseValue.message.length,
        messagePreview: responseValue.message.slice(0, 100)
      });
      responseText = responseValue.message;
    } else if (data?.message) {
      console.log('[normalizeAgentResponse] Using data.message fallback', {
        messageLength: data.message.length
      });
      responseText = data.message;
    } else if (data?.response) {
      console.log('[normalizeAgentResponse] JSON stringifying response');
      responseText = JSON.stringify(data.response);
    } else {
      console.log('[normalizeAgentResponse] NO RESPONSE FOUND - using fallback');
      responseText = '(No response returned from the backend)';
    }

    console.log('[normalizeAgentResponse] Final response text:', {
      length: responseText.length,
      preview: responseText.slice(0, 100),
      isEmpty: responseText.trim().length === 0,
      responseIfEmpty: responseText.trim().length === 0 ? 'EMPTY__RESPONSE' : 'HAS__CONTENT',
    });

    // CRITICAL: If response is empty but backend says success, generate fallback response
    if (responseText.trim().length === 0 && isSuccess) {
      console.log('[normalizeAgentResponse] FALLBACK: Empty response detected on success status, generating fallback');
      responseText = `[Agent processed your request successfully but returned no explicit response. Status: ${isSuccess ? 'Success' : 'Error'} | Trace events: ${mergedTrace.length}]`;
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
      
      console.log('[queryAgent] Raw response received:', {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        hasMessage: !!response.data?.message,
        hasResponse: !!response.data?.response,
        messageValue: response.data?.message?.slice?.(0, 100),
        responseValue: response.data?.response,
      });

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
      
      if (response.data.networkEvents && Array.isArray(response.data.networkEvents)) {
        response.data.networkEvents.forEach((ev: any) => this.emitLog(ev));
      }
      if (response.data.trace && Array.isArray(response.data.trace)) {
        response.data.trace.forEach((event: any) => {
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
      if (response.data.debug) {
        this.emitLog({
          at: new Date().toISOString(),
          source: 'agent',
          stage: 'agent_debug',
          detail: 'Agent reasoning snapshot',
          payload: response.data.debug,
        });
      }
      
      const normalized = this.normalizeAgentResponse(response.data, { trace });
      console.log('[queryAgent] Normalized response:', {
        responseLength: normalized.response.length,
        status: normalized.status,
        hasError: !!normalized.error,
        responsePreview: normalized.response.slice(0, 100),
      });
      return normalized;
  
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
            { query, session_id: sessionId, agent_config: agentConfig },
            {
              headers: {
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

          
          if (retryResponse.data.networkEvents && Array.isArray(retryResponse.data.networkEvents)) {
            retryResponse.data.networkEvents.forEach((ev: any) => this.emitLog(ev));
          }
          if (retryResponse.data.trace && Array.isArray(retryResponse.data.trace)) {
            retryResponse.data.trace.forEach((event: any) => {
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
          if (retryResponse.data.debug) {
            this.emitLog({
              at: new Date().toISOString(),
              source: 'agent',
              stage: 'agent_debug',
              detail: 'Agent reasoning snapshot',
              payload: retryResponse.data.debug,
            });
          }
          const normalizedRetry = this.normalizeAgentResponse(retryResponse.data, {
            trace,
            paymentResponse,
          });
          console.log('[queryAgent] Normalized RETRY response (after payment):', {
            responseLength: normalizedRetry.response.length,
            status: normalizedRetry.status,
            hasError: !!normalizedRetry.error,
            responsePreview: normalizedRetry.response.slice(0, 100),
          });
          return normalizedRetry;
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
   * Call the advanced orchestrator endpoint with full LLM reasoning
   * Returns streaming reasoning steps for each stage
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
        {
          task,
          agentName,
          budget,
          destinationAddress,
        },
        {
          responseType: 'stream',
        }
      );

      return new Promise((resolve, reject) => {
        let buffer = '';
        let stages: any[] = [];

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
                  payload: {
                    step: data.step,
                    cost: data.cost,
                    txHash: data.txHash,
                  },
                });
              } catch (e) {
                // Continue on parse error
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({
            status: 'success',
            stages,
            response: 'Orchestration complete',
          });
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
   * Call the enhanced Forge Oracle endpoint
   * Uses LLM-driven agent selection and real x402 payments
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
        {
          task,
          context,
          budget,
        },
        {
          responseType: 'stream',
        }
      );

      return new Promise((resolve, reject) => {
        let buffer = '';
        let stages: any[] = [];

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

                if (data.stage === 'agent-selection') {
                  this.emitLog({
                    at: new Date().toISOString(),
                    source: 'forge-oracle',
                    stage: 'agent-selection',
                    detail: data.reasoning || 'Selecting agent',
                    payload: {
                      selectedAgent: data.selectedAgent,
                      confidence: data.confidence,
                    },
                  });
                } else if (data.stage === 'agent-execution') {
                  this.emitLog({
                    at: new Date().toISOString(),
                    source: 'forge-oracle',
                    stage: 'agent-execution',
                    detail: data.reasoning || 'Executing agent',
                    payload: {
                      agent: data.agentName,
                      paymentTxHash: data.paymentTxHash,
                      cost: data.cost,
                    },
                  });
                }
              } catch (e) {
                // Continue on parse error
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({
            status: 'success',
            stages,
            response: 'Forge Oracle complete',
          });
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
