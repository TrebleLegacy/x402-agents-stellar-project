import axios, { AxiosInstance } from 'axios';
import * as StellarSdk from '@stellar/stellar-sdk';
import { X402PaymentClient } from './x402Client';

export class SpecialistAgentClient {
  private client: AxiosInstance;
  private paymentClient: X402PaymentClient;
  private userKeypair: { publicKey: string; secret: string } | null = null;
  private network: 'testnet' | 'mainnet';

  constructor(baseURL: string, network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
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

  private getDestinationOrThrow(): string {
    const destination = (process.env.NEXT_PUBLIC_SERVER_STELLAR_ADDRESS || '').trim();

    if (!destination) {
      throw new Error(
        'Quick Agents payment destination is not configured. Set NEXT_PUBLIC_SERVER_STELLAR_ADDRESS in frontend/.env'
      );
    }

    if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
      throw new Error(
        'NEXT_PUBLIC_SERVER_STELLAR_ADDRESS is invalid. Expected a Stellar public key starting with G'
      );
    }

    return destination;
  }

  /**
   * Build and sign payment for x402 protocol (exact-v2 scheme)
   * Complies with Built on Stellar x402 facilitator specification
   */
  private async buildAndSignPayment(
    destination: string,
    price: string
  ): Promise<{
    header: string;
    network: string;
    scheme: string;
    facilitatorUrl: string;
  }> {
    if (!this.userKeypair) {
      throw new Error('Keypair not set. Call setKeypair first.');
    }

    const facilitatorUrl = this.network === 'testnet'
      ? 'https://channels.openzeppelin.com/x402/testnet'
      : 'https://channels.openzeppelin.com/x402';

    const signatureData = this.paymentClient.buildAndSign(
      {
        sourcePublicKey: this.userKeypair.publicKey,
        receiveSigningPublicKey: destination,
        destinationAddress: destination,
        amount: price,
        assetContract: '',
        price,
      },
      this.userKeypair.secret
    );

    return {
      header: this.paymentClient.createPaymentSignatureHeader(signatureData),
      network: `stellar:${this.network}`,
      scheme: 'exact-v2',
      facilitatorUrl,
    };
  }

  async queryDeFiAgent(protocol: string, metric: string): Promise<any> {
    if (!this.userKeypair) {
      throw new Error('Keypair not set');
    }

    const amount = '0.15';
    const destination = this.getDestinationOrThrow();
    const { header, network, scheme, facilitatorUrl } = await this.buildAndSignPayment(
      destination,
      amount
    );

    try {
      const response = await this.client.post(
        '/api/agents/defi/query',
        {
          query: { protocol, metric },
          publicKey: this.userKeypair.publicKey,
          sourcePublicKey: this.userKeypair.publicKey,
          destination,
          amount,
          assetCode: 'USDC',
        },
        {
          headers: {
            'PAYMENT-SIGNATURE': header,
            'X-402-Network': network,
            'X-402-Scheme': scheme,
            'X-402-Facilitator': facilitatorUrl,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Payment required: ' + (error.response?.data?.error || 'Unknown error'));
      }
      throw error;
    }
  }

  async querySecurity(target: string, scanType: string): Promise<any> {
    if (!this.userKeypair) {
      throw new Error('Keypair not set');
    }

    const amount = '0.20';
    const destination = this.getDestinationOrThrow();
    const { header, network, scheme, facilitatorUrl } = await this.buildAndSignPayment(
      destination,
      amount
    );

    try {
      const response = await this.client.post(
        '/api/agents/security/scan',
        {
          query: { target, scanType },
          publicKey: this.userKeypair.publicKey,
          sourcePublicKey: this.userKeypair.publicKey,
          destination,
          amount,
          assetCode: 'USDC',
        },
        {
          headers: {
            'PAYMENT-SIGNATURE': header,
            'X-402-Network': network,
            'X-402-Scheme': scheme,
            'X-402-Facilitator': facilitatorUrl,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Payment required: ' + (error.response?.data?.error || 'Unknown error'));
      }
      throw error;
    }
  }

  async queryNews(category: string, limit: number = 5): Promise<any> {
    if (!this.userKeypair) {
      throw new Error('Keypair not set');
    }

    const amount = '0.03';
    const destination = this.getDestinationOrThrow();
    const { header, network, scheme, facilitatorUrl } = await this.buildAndSignPayment(
      destination,
      amount
    );

    try {
      const response = await this.client.post(
        '/api/agents/news/feed',
        {
          query: { category, limit },
          publicKey: this.userKeypair.publicKey,
          sourcePublicKey: this.userKeypair.publicKey,
          destination,
          amount,
          assetCode: 'USDC',
        },
        {
          headers: {
            'PAYMENT-SIGNATURE': header,
            'X-402-Network': network,
            'X-402-Scheme': scheme,
            'X-402-Facilitator': facilitatorUrl,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 402) {
        throw new Error('Payment required: ' + (error.response?.data?.error || 'Unknown error'));
      }
      throw error;
    }
  }
}
