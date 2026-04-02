/**
 * x402 Service - Handles x402 Facilitator Integration
 * Connects to Built on Stellar facilitator on testnet
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface x402Config {
  facilitatorUrl: string;
  apiKey: string;
  network: 'stellar:testnet' | 'stellar:pubnet';
  payTo: string;
}

export interface PaymentRequirement {
  scheme: 'exact';
  price: string | { asset: string; amount: string };
  network: string;
  payTo: string;
  description: string;
}

export interface VerifyPaymentInput {
  transactionXdr: string;
  amount: string;
  asset: string;
  payerPublicKey: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  valid: boolean;
  transactionHash?: string;
  error?: string;
}

export class x402Service {
  private facilitatorClient: AxiosInstance;
  private config: x402Config;

  constructor(config: x402Config) {
    this.config = config;
    this.facilitatorClient = axios.create({
      baseURL: config.facilitatorUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info(`[x402] Initialized with facilitator: ${config.facilitatorUrl}`);
  }

  /**
   * Get supported payment methods
   */
  async getSupported(): Promise<any> {
    try {
      logger.info('[x402] Fetching supported payment methods');
      const response = await this.facilitatorClient.get('/supported');
      logger.debug(`[x402] Supported: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      logger.error(`[x402] Error fetching supported: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify payment on x402 facilitator
   */
  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResponse> {
    try {
      logger.info(
        `[x402] Verifying payment: ${input.amount} ${input.asset} from ${input.payerPublicKey}`
      );

      const response = await this.facilitatorClient.post('/verify', {
        transactionXdr: input.transactionXdr,
        amount: input.amount,
        asset: input.asset,
        payer: input.payerPublicKey,
        payTo: this.config.payTo,
        network: this.config.network,
      });

      logger.info(`[x402] Payment verified: ${response.data.valid}`);
      return {
        success: true,
        valid: response.data.valid,
        transactionHash: response.data.transactionHash,
      };
    } catch (error: any) {
      logger.error(`[x402] Verification failed: ${error.message}`);
      return {
        success: false,
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Settle payment on x402 facilitator
   */
  async settlePayment(transactionXdr: string): Promise<any> {
    try {
      logger.info('[x402] Settling payment transaction');

      const response = await this.facilitatorClient.post('/settle', {
        transactionXdr,
        network: this.config.network,
      });

      logger.info(`[x402] Payment settled: ${response.data.transactionHash}`);
      return {
        success: true,
        transactionHash: response.data.transactionHash,
        status: response.data.status,
      };
    } catch (error: any) {
      logger.error(`[x402] Settlement failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build payment requirement response (402 Required)
   */
  buildPaymentRequired(
    description: string,
    price: string | { asset: string; amount: string }
  ): PaymentRequirement {
    return {
      scheme: 'exact',
      price,
      network: this.config.network,
      payTo: this.config.payTo,
      description,
    };
  }

  /**
   * Parse payment signature from request headers
   */
  parsePaymentSignature(req: any): { xdr: string; signature: string } | null {
    const paymentSignature = req.headers['payment-signature'];
    if (!paymentSignature) return null;

    try {
      const parsed = JSON.parse(Buffer.from(paymentSignature, 'base64').toString());
      return {
        xdr: parsed.xdr,
        signature: parsed.signature,
      };
    } catch (error) {
      logger.error('[x402] Failed to parse payment signature header');
      return null;
    }
  }

  /**
   * Get x402 client config for agents
   */
  getClientConfig(): {
    facilitatorUrl: string;
    network: string;
    payTo: string;
  } {
    return {
      facilitatorUrl: this.config.facilitatorUrl,
      network: this.config.network,
      payTo: this.config.payTo,
    };
  }
}

/**
 * Initialize x402 service from environment variables
 */
export function initializeX402Service(): x402Service {
  const config: x402Config = {
    facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://channels.openzeppelin.com/x402/testnet',
    apiKey: process.env.X402_API_KEY || '',
    network: (process.env.X402_NETWORK || 'stellar:testnet') as 'stellar:testnet' | 'stellar:pubnet',
    payTo: process.env.X402_PAY_TO || '',
  };

  if (!config.apiKey) {
    logger.warn('[x402] X402_API_KEY not set - x402 payments will not work');
  }

  if (!config.payTo) {
    logger.warn('[x402] X402_PAY_TO not set - set to your server Stellar public key');
  }

  return new x402Service(config);
}
