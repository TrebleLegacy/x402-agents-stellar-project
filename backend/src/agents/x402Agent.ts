/**
 * x402 Agent Handler - Processes x402 payments within agent context
 */

import { x402Service } from '../services/x402Service';
import { StellarClient } from '../stellar/client';
import { StellarVerify } from '../stellar/verify';
import { logger } from '../utils/logger';

export interface x402PaymentIntent {
  publicKey: string;
  secretKey?: string;
  resourcePath: string;
  price: string | { asset: string; amount: string };
  description?: string;
}

export interface x402AgentResponse {
  success: boolean;
  action: 'payment_required' | 'payment_submitted' | 'payment_settled' | 'error';
  data?: any;
  message?: string;
  error?: string;
}

export class x402Agent {
  constructor(private x402Service: x402Service) {}

  /**
   * Process x402 payment request from agent
   */
  async processPaymentRequest(intent: x402PaymentIntent): Promise<x402AgentResponse> {
    try {
      logger.info(
        `[x402Agent] Processing payment for: ${intent.resourcePath} by ${intent.publicKey}`
      );

      // Validate public key
      if (!StellarVerify.isValidPublicKey(intent.publicKey)) {
        logger.error('[x402Agent] Invalid public key format');
        return {
          success: false,
          action: 'error',
          error: 'Invalid public key format',
        };
      }

      // Get payment requirement
      const paymentRequired = this.x402Service.buildPaymentRequired(
        intent.description || `Payment for: ${intent.resourcePath}`,
        intent.price
      );

      logger.info(
        `[x402Agent] Payment required: ${JSON.stringify(intent.price)} for ${intent.resourcePath}`
      );

      return {
        success: true,
        action: 'payment_required',
        message: `Payment required for access to ${intent.resourcePath}`,
        data: {
          paymentRequired,
          facilitatorConfig: this.x402Service.getClientConfig(),
          instructions: {
            step1: 'Client requests resource',
            step2: 'Server responds with 402 Payment Required',
            step3: 'Client signs Soroban authorization entry',
            step4: 'Client resubmits with PAYMENT-SIGNATURE header',
            step5: 'Facilitator verifies and settles on-chain',
            step6: 'Server returns resource with PAYMENT-RESPONSE header',
          },
        },
      };
    } catch (error: any) {
      logger.error(`[x402Agent] Payment request error: ${error.message}`);
      return {
        success: false,
        action: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Verify signed x402 payment transaction
   */
  async verifySignedPayment(
    transactionXdr: string,
    amount: string,
    asset: string,
    payerPublicKey: string
  ): Promise<x402AgentResponse> {
    try {
      logger.info(`[x402Agent] Verifying signed payment: ${amount} ${asset}`);

      const verifyResult = await this.x402Service.verifyPayment({
        transactionXdr,
        amount,
        asset,
        payerPublicKey,
      });

      if (!verifyResult.valid) {
        logger.warn('[x402Agent] Payment verification failed');
        return {
          success: false,
          action: 'error',
          error: 'Payment verification failed',
          data: verifyResult,
        };
      }

      logger.info(`[x402Agent] Payment verified successfully: ${verifyResult.transactionHash}`);

      return {
        success: true,
        action: 'payment_settled',
        message: 'Payment verified and settled on-chain',
        data: {
          transactionHash: verifyResult.transactionHash,
          verified: true,
        },
      };
    } catch (error: any) {
      logger.error(`[x402Agent] Verification error: ${error.message}`);
      return {
        success: false,
        action: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Process test payment for agent demonstration
   */
  async processTestPayment(payerPublicKey: string, amount: string): Promise<x402AgentResponse> {
    try {
      logger.info(`[x402Agent] Processing test payment: ${amount} from ${payerPublicKey}`);

      if (!StellarVerify.isValidPublicKey(payerPublicKey)) {
        return {
          success: false,
          action: 'error',
          error: 'Invalid payer public key',
        };
      }

      if (!StellarVerify.isValidAmount(amount)) {
        return {
          success: false,
          action: 'error',
          error: 'Invalid payment amount',
        };
      }

      logger.info('[x402Agent] Test payment validated, returning payment requirement');

      return {
        success: true,
        action: 'payment_required',
        message: 'Test payment ready - sign transaction to proceed',
        data: {
          payerPublicKey,
          amount,
          asset: 'USDC',
          testInstructions: {
            description: 'This is a test x402 payment flow on Stellar testnet',
            payTo: this.x402Service.getClientConfig().payTo,
            facilitatorUrl: this.x402Service.getClientConfig().facilitatorUrl,
            network: this.x402Service.getClientConfig().network,
            steps: [
              '1. Create Soroban authorization entry with the transaction XDR',
              '2. Sign the authorization entry with your secret key',
              `3. Submit to facilitator: POST ${this.x402Service.getClientConfig().facilitatorUrl}/verify`,
              '4. Facilitator settles payment on-chain',
              '5. Agent receives settlement confirmation',
            ],
          },
        },
      };
    } catch (error: any) {
      logger.error(`[x402Agent] Test payment error: ${error.message}`);
      return {
        success: false,
        action: 'error',
        error: error.message,
      };
    }
  }
}
