import { X402SdkClient } from './x402Sdk';
import { InteractionLogEvent } from '@/types/agent';

export class SpecialistAgentClient {
  private paymentClient: X402SdkClient;
  private userKeypair: { publicKey: string; secret: string } | null = null;
  private network: 'testnet' | 'mainnet';

  constructor(baseURL: string, network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
    this.paymentClient = new X402SdkClient(baseURL, network);
  }

  setLogger(callback?: (event: InteractionLogEvent) => void): void {
    this.paymentClient.setLogger(callback);
  }

  setKeypair(publicKey: string, secret: string): void {
    this.userKeypair = { publicKey, secret };
    this.paymentClient.setWallet({ publicKey, secret });
  }
  private requireKeypair(): { publicKey: string; secret: string } {
    if (!this.userKeypair) {
      throw new Error('Keypair not set');
    }
    return this.userKeypair;
  }

  async queryDeFiAgent(protocol: string, metric: string): Promise<any> {
    const keypair = this.requireKeypair();

    try {
      return await this.paymentClient.payAndRequest({
        method: 'post',
        path: '/api/agents/defi/query',
        data: {
          query: { protocol, metric },
          publicKey: keypair.publicKey,
        },
      });
    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Payment required: ' + (error.response?.data?.error || 'Unknown error'));
      }
      throw error;
    }
  }

  async querySecurity(target: string, scanType: string): Promise<any> {
    const keypair = this.requireKeypair();

    try {
      return await this.paymentClient.payAndRequest({
        method: 'post',
        path: '/api/agents/security/scan',
        data: {
          query: { target, scanType },
          publicKey: keypair.publicKey,
        },
      });
    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Payment required: ' + (error.response?.data?.error || 'Unknown error'));
      }
      throw error;
    }
  }

  async queryNews(category: string, limit: number = 5): Promise<any> {
    const keypair = this.requireKeypair();

    try {
      return await this.paymentClient.payAndRequest({
        method: 'post',
        path: '/api/agents/news/feed',
        data: {
          query: { category, limit },
          publicKey: keypair.publicKey,
        },
      });
    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Payment required: ' + (error.response?.data?.error || 'Unknown error'));
      }
      throw error;
    }
  }
}
