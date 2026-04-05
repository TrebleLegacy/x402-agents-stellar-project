import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { X402PaymentBuilder } from '../../stellar/x402PaymentBuilder';

export type X402Network = 'stellar:testnet' | 'stellar:pubnet';

export interface X402ClientConfig {
  baseURL: string;
  publicKey: string;
  secretKey: string;
  network?: X402Network;
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
  network?: X402Network;
  payTo?: string;
  facilitatorUrl?: string;
  asset?: string;
  assetIssuer?: string;
  memo?: string;
}

export class X402Client {
  private client: AxiosInstance;
  private network: X402Network;

  constructor(private config: X402ClientConfig) {
    this.network = config.network || 'stellar:testnet';
    this.client = axios.create({
      baseURL: config.baseURL,
      validateStatus: () => true,
    });
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
    const instructionsResult = await this.requestPaymentInstructions(options);
    if (!instructionsResult) {
      const response = await this.client.request({
        method: options.method || 'post',
        url: options.path,
        data: options.data,
        params: options.params,
        headers: options.headers,
      });
      return {
        data: response.data as T,
        paymentResponse: this.parsePaymentResponse(response.headers),
        status: response.status,
        headers: response.headers,
      };
    }

    return this.payWithInstructions<T>(options, instructionsResult.instructions);
  }

  async requestPaymentInstructions(
    options: PayAndRequestOptions
  ): Promise<{ instructions: PaymentInstructions; status: number; headers: Record<string, any>; data: any } | null> {
    const response = await this.client.request({
      method: options.method || 'post',
      url: options.path,
      data: options.data,
      params: options.params,
      headers: options.headers,
    });

    if (response.status !== 402) {
      if (response.status >= 400) {
        throw new Error(response.data?.error || 'Request failed');
      }
      return null;
    }

    const instructions = this.extractInstructions(response.data);
    if (!instructions?.payTo || !instructions?.price) {
      throw new Error('Payment instructions missing');
    }

    return {
      instructions,
      status: response.status,
      headers: response.headers,
      data: response.data,
    };
  }

  async payWithInstructions<T = any>(
    options: PayAndRequestOptions,
    instructions: PaymentInstructions
  ): Promise<{ data: T; paymentResponse?: any; status: number; headers: Record<string, any> }> {
    if (!instructions.price) {
      throw new Error('Payment instructions missing');
    }

    const priceInfo = this.normalizePrice(instructions.price, instructions.asset);
    const paymentHeader = await X402PaymentBuilder.buildAndSign(
      {
        sourcePublicKey: this.config.publicKey,
        receiveSigningPublicKey: instructions.payTo || this.config.publicKey,
        destinationAddress: instructions.payTo || this.config.publicKey,
        amount: priceInfo.amount,
        assetContract: '',
        price: priceInfo.amount,
        assetCode: priceInfo.asset,
        assetIssuer: instructions.assetIssuer,
      },
      this.config.secretKey
    );

    const retryHeaders: Record<string, string> = {
      ...options.headers,
      'Payment-Signature': paymentHeader,
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
      throw new Error(retryResponse.data?.error || 'Payment request failed');
    }

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
    try {
      const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return undefined;
    }
  }
}
