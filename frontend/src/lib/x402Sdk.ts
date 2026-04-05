import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { X402PaymentClient } from './x402Client';
import { InteractionLogEvent } from '@/types/agent';

export type X402Network = 'testnet' | 'mainnet';

export interface X402Wallet {
  publicKey: string;
  secret: string;
}

export interface PayAndRequestOptions {
  method?: AxiosRequestConfig['method'];
  path: string;
  data?: any;
  params?: any;
  headers?: Record<string, string>;
}

interface PaymentInstructions {
  scheme?: string;
  price?: string | { asset: string; amount: string };
  network?: string;
  payTo?: string;
  facilitatorUrl?: string;
  asset?: string;
  assetIssuer?: string;
  memo?: string;
}

export class X402SdkClient {
  private client: AxiosInstance;
  private paymentClient: X402PaymentClient;
  private wallet: X402Wallet | null = null;
  private onLog?: (event: InteractionLogEvent) => void;

  constructor(private baseURL: string, private network: X402Network = 'testnet') {
    this.client = axios.create({
      baseURL,
      validateStatus: () => true,
    });
    this.paymentClient = new X402PaymentClient(network);
  }

  setWallet(wallet: X402Wallet): void {
    this.wallet = wallet;
  }

  setLogger(callback?: (event: InteractionLogEvent) => void): void {
    this.onLog = callback;
  }

  private emitLog(event: InteractionLogEvent): void {
    if (this.onLog) {
      this.onLog(event);
    }
  }

  getWallet(): X402Wallet | null {
    return this.wallet;
  }

  async payAndRequest<T = any>(options: PayAndRequestOptions): Promise<T> {
    const response = await this.client.request({
      method: options.method || 'post',
      url: options.path,
      data: options.data,
      params: options.params,
      headers: options.headers,
    });

    this.emitLog({
      at: new Date().toISOString(),
      source: 'specialist',
      stage: 'request_submitted',
      detail: 'Specialist request sent',
      payload: { path: options.path },
    });

    if (response.status !== 402) {
      if (response.status >= 400) {
        this.emitLog({
          at: new Date().toISOString(),
          source: 'specialist',
          stage: 'request_failed',
          detail: 'Specialist request failed',
          payload: response.data,
        });
        throw new Error(response.data?.error || 'Request failed');
      }
      this.emitLog({
        at: new Date().toISOString(),
        source: 'specialist',
        stage: 'request_succeeded',
        detail: 'Specialist request succeeded without payment',
      });
      return response.data as T;
    }

    if (!this.wallet) {
      throw new Error('Wallet not set');
    }

    const instructions = this.extractInstructions(response.data);
    if (!instructions?.payTo || !instructions?.price) {
      this.emitLog({
        at: new Date().toISOString(),
        source: 'specialist',
        stage: 'paywall_invalid',
        detail: 'Payment instructions missing from 402 response',
        payload: response.data,
      });
      throw new Error('Payment instructions missing');
    }

    this.emitLog({
      at: new Date().toISOString(),
      source: 'specialist',
      stage: 'paywall_received',
      detail: 'Received 402 payment instructions',
      payload: instructions,
    });

    const priceInfo = this.normalizePrice(instructions.price, instructions.asset);
    const signatureData = this.paymentClient.buildAndSign(
      {
        sourcePublicKey: this.wallet.publicKey,
        receiveSigningPublicKey: instructions.payTo,
        destinationAddress: instructions.payTo,
        amount: priceInfo.amount,
        assetContract: '',
        price: priceInfo.amount,
        assetCode: priceInfo.asset,
        assetIssuer: instructions.assetIssuer,
      },
      this.wallet.secret
    );

    this.emitLog({
      at: new Date().toISOString(),
      source: 'specialist',
      stage: 'payment_signed',
      detail: 'Payment signature created for specialist',
      payload: { destination: instructions.payTo, amount: priceInfo.amount },
    });

    const retryHeaders: Record<string, string> = {
      ...options.headers,
      'Payment-Signature': this.paymentClient.createPaymentSignatureHeader(signatureData),
    };

    if (instructions.network) retryHeaders['X-402-Network'] = instructions.network;
    if (instructions.scheme) retryHeaders['X-402-Scheme'] = instructions.scheme;
    if (instructions.facilitatorUrl) retryHeaders['X-402-Facilitator'] = instructions.facilitatorUrl;

    const retryResponse = await this.client.request({
      method: options.method || 'post',
      url: options.path,
      data: options.data,
      params: options.params,
      headers: retryHeaders,
    });

    if (retryResponse.status >= 400) {
      this.emitLog({
        at: new Date().toISOString(),
        source: 'specialist',
        stage: 'payment_retry_failed',
        detail: 'Specialist payment retry failed',
        payload: retryResponse.data,
      });
      throw new Error(retryResponse.data?.error || 'Payment request failed');
    }

    this.emitLog({
      at: new Date().toISOString(),
      source: 'specialist',
      stage: 'payment_retry_succeeded',
      detail: 'Payment accepted by specialist',
      payload: retryResponse.data,
    });

    return retryResponse.data as T;
  }

  private extractInstructions(payload: any): PaymentInstructions | null {
    if (!payload) return null;
    if (payload.instructions) return payload.instructions;
    if (payload.paymentRequired) return payload.paymentRequired;
    if (payload.payment?.instructions) return payload.payment.instructions;
    return null;
  }

  private normalizePrice(
    price: string | { asset: string; amount: string },
    fallbackAsset?: string
  ): { amount: string; asset?: string } {
    if (typeof price === 'string') {
      return { amount: price.replace('$', ''), asset: fallbackAsset };
    }
    return { amount: price.amount, asset: price.asset };
  }
}
