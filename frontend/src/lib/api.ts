import axios, { AxiosInstance } from 'axios';
import { X402PaymentClient, PaymentSignatureData } from './x402Client';
import {
  AgentQueryRequest,
  AgentQueryResponse,
  PaymentInstructions,
} from '@/types/agent';

export class AgentAPIClient {
  private client: AxiosInstance;
  private paymentClient: X402PaymentClient;
  private userKeypair: { publicKey: string; secret: string } | null = null;

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

  async queryAgent(
    query: string,
    sessionId?: string,
    destination?: string
  ): Promise<AgentQueryResponse> {
    try {
      const response = await this.client.post<AgentQueryResponse>(
        '/api/agent/query',
        { query, session_id: sessionId }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402) {
        const instructions = error.response.data as PaymentInstructions;

        if (!destination) {
          throw new Error(
            'Payment required. Please provide destination address.'
          );
        }

        const paymentHeader = await this.buildAndSignPayment(
          destination,
          '0.001',
          instructions.price
        );

        const retryResponse = await this.client.post<AgentQueryResponse>(
          '/api/agent/query',
          { query, session_id: sessionId },
          {
            headers: { 'Payment-Signature': paymentHeader },
          }
        );

        return retryResponse.data;
      }
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
