import axios, { AxiosInstance } from 'axios';
import { X402PaymentClient } from './x402Client';

export class SpecialistAgentClient {
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

  async queryDeFiAgent(protocol: string, metric: string): Promise<any> {
    if (!this.userKeypair) {
      throw new Error('Keypair not set');
    }

    const destination = process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS || '';
    const paymentHeader = await this.buildAndSignPayment(
      destination,
      '0.15',
      '0.15'
    );

    const response = await this.client.post('/agents/defi/query', {
      query: { protocol, metric },
      publicKey: this.userKeypair.publicKey,
      'X-402-Payment': paymentHeader,
    });

    return response.data;
  }

  async querySecurity(target: string, scanType: string): Promise<any> {
    if (!this.userKeypair) {
      throw new Error('Keypair not set');
    }

    const destination = process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS || '';
    const paymentHeader = await this.buildAndSignPayment(
      destination,
      '0.20',
      '0.20'
    );

    const response = await this.client.post('/agents/security/scan', {
      query: { target, scanType },
      publicKey: this.userKeypair.publicKey,
      'X-402-Payment': paymentHeader,
    });

    return response.data;
  }

  async queryNews(category: string, limit: number = 5): Promise<any> {
    if (!this.userKeypair) {
      throw new Error('Keypair not set');
    }

    const destination = process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS || '';
    const paymentHeader = await this.buildAndSignPayment(
      destination,
      '0.03',
      '0.03'
    );

    const response = await this.client.post('/agents/news/feed', {
      query: { category, limit },
      publicKey: this.userKeypair.publicKey,
      'X-402-Payment': paymentHeader,
    });

    return response.data;
  }
}
