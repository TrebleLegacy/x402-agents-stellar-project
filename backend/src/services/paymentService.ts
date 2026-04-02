/**
 * Payment Service - Business Logic for Payment Processing
 * Orchestrates Stellar client + verification + logging
 */

import { StellarClient } from '../stellar/client';
import { StellarVerify } from '../stellar/verify';
import { logger } from '../utils/logger';

export interface PaymentRequest {
  sourcePublicKey: string;
  destination: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  hash?: string;
  error?: string;
  timestamp: string;
}

export class PaymentService {
  static async validatePayment(request: PaymentRequest): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!StellarVerify.isValidPublicKey(request.sourcePublicKey)) {
      errors.push('Invalid source public key');
    }

    if (!StellarVerify.isValidPublicKey(request.destination)) {
      errors.push('Invalid destination public key');
    }

    if (!StellarVerify.isValidAmount(request.amount)) {
      errors.push('Invalid amount (must be positive number)');
    }

    if (request.sourcePublicKey === request.destination) {
      errors.push('Source and destination cannot be the same');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static async buildPayment(request: PaymentRequest): Promise<{ xdr: string; preview: any }> {
    logger.info(`Building payment: ${request.amount} XLM to ${request.destination}`);

    const validation = await this.validatePayment(request);
    if (!validation.valid) {
      throw new Error(`Payment validation failed: ${validation.errors.join(', ')}`);
    }

    const xdr = await StellarClient.buildPaymentXdr({
      sourcePublicKey: request.sourcePublicKey,
      destination: request.destination,
      amount: request.amount,
      assetCode: request.assetCode,
      assetIssuer: request.assetIssuer,
      memoText: request.memo,
    });

    return {
      xdr,
      preview: {
        from: request.sourcePublicKey,
        to: request.destination,
        amount: request.amount,
        asset: request.assetCode || 'XLM',
        description: request.description,
      },
    };
  }

  static async signAndSubmit(xdr: string, secretKey: string): Promise<PaymentResult> {
    try {
      logger.info('Signing and submitting payment transaction');

      if (!StellarVerify.isValidSecretKey(secretKey)) {
        throw new Error('Invalid secret key format');
      }

      const signedXdr = StellarClient.signTransaction(xdr, secretKey);
      const hash = await StellarClient.submitTransaction(signedXdr);

      logger.info(`Payment submitted successfully: ${hash}`);

      return {
        success: true,
        hash,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error(`Payment submission failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  static async getBalance(publicKey: string): Promise<string> {
    if (!StellarVerify.isValidPublicKey(publicKey)) {
      throw new Error('Invalid public key');
    }
    return await StellarClient.getBalance(publicKey);
  }

  static async getAccountDetails(publicKey: string): Promise<any> {
    if (!StellarVerify.isValidPublicKey(publicKey)) {
      throw new Error('Invalid public key');
    }
    const account = await StellarClient.getAccount(publicKey);
    return {
      publicKey,
      balances: account.balances,
      sequence: account.sequence,
      signers: account.signers,
      created_at: account.created_at,
    };
  }
}
