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
  private logSource: InteractionLogEvent['source'] = 'specialist';

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

  setLogSource(source: InteractionLogEvent['source']): void {
    this.logSource = source;
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
    const result = await this.payAndRequestDetailed<T>(options);
    return result.data;
  }

  async payAndRequestDetailed<T = any>(options: PayAndRequestOptions): Promise<{
    data: T;
    paymentResponse?: any;
    status: number;
    headers: Record<string, any>;
  }> {
    const response = await this.client.request({
      method: options.method || 'post',
      url: options.path,
      data: options.data,
      params: options.params,
      headers: options.headers,
    });

    this.emitLog({
      at: new Date().toISOString(),
      source: this.logSource,
      stage: 'request_submitted',
      detail: 'x402 request sent',
      payload: { path: options.path },
    });

    if (response.status !== 402) {
      if (response.status >= 400) {
        this.emitLog({
          at: new Date().toISOString(),
          source: this.logSource,
          stage: 'request_failed',
          detail: 'x402 request failed',
          payload: response.data,
        });
        throw new Error(response.data?.error || 'Request failed');
      }
      this.emitLog({
        at: new Date().toISOString(),
        source: this.logSource,
        stage: 'request_succeeded',
        detail: 'x402 request succeeded without payment',
      });
      return {
        data: response.data as T,
        paymentResponse: this.parsePaymentResponse(response.headers),
        status: response.status,
        headers: response.headers,
      };
    }

    if (!this.wallet) {
      throw new Error('Wallet not set');
    }

    const instructions = this.extractInstructions(response.data);
    if (!instructions?.payTo || !instructions?.price) {
      this.emitLog({
        at: new Date().toISOString(),
        source: this.logSource,
        stage: 'paywall_invalid',
        detail: 'Payment instructions missing from 402 response',
        payload: response.data,
      });
      throw new Error('Payment instructions missing');
    }

    this.emitLog({
      at: new Date().toISOString(),
      source: this.logSource,
      stage: 'paywall_received',
      detail: 'Received 402 payment instructions',
      payload: instructions,
    });

    const priceInfo = this.normalizePrice(instructions.price, instructions.asset);
    const signatureData = await this.paymentClient.buildAndSign(
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
      source: this.logSource,
      stage: 'payment_signed',
      detail: 'Payment signature created for x402 request',
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
        source: this.logSource,
        stage: 'payment_retry_failed',
        detail: 'x402 payment retry failed',
        payload: retryResponse.data,
      });
      throw new Error(retryResponse.data?.error || 'Payment request failed');
    }

    this.emitLog({
      at: new Date().toISOString(),
      source: this.logSource,
      stage: 'payment_retry_succeeded',
      detail: 'x402 payment accepted',
      payload: retryResponse.data,
    });

    return {
      data: retryResponse.data as T,
      paymentResponse: this.parsePaymentResponse(retryResponse.headers),
      status: retryResponse.status,
      headers: retryResponse.headers,
    };
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

  private parsePaymentResponse(headers: Record<string, any>): any | undefined {
    const headerValue = headers?.['payment-response'] || headers?.['Payment-Response'];
    if (!headerValue || typeof headerValue !== 'string') return undefined;
    return this.paymentClient.parsePaymentResponse(headerValue);
  }
}
