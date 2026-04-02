/**
 * Payment Agent - Handles payment execution within agent context
 */

import { PaymentService, PaymentRequest } from '../../services/paymentService';
import { OnboardingService } from '../../services/onboardingService';
import { StellarVerify } from '../../stellar/verify';
import { logger } from '../../utils/logger';

export interface AgentPaymentPayload {
  sourcePublicKey: string;
  destination: string;
  amount: string;
  assetCode?: string;
  description?: string;
  memo?: string;
  secretKey?: string;
}

export interface AgentPaymentResponse {
  success: boolean;
  action: 'build' | 'sign_required' | 'submitted';
  data?: any;
  error?: string;
}

export class PaymentAgent {
  /**
   * Handle payment intent from natural language
   */
  static async processPaymentIntent(intent: {
    sourcePublicKey?: string;
    destination?: string;
    amount?: string;
    secretKey?: string;
  }): Promise<AgentPaymentResponse> {
    try {
      // Ensure we have required fields
      if (!intent.sourcePublicKey || !intent.destination || !intent.amount) {
        return {
          success: false,
          action: 'build',
          error: 'Missing source, destination, or amount',
        };
      }

      // Build payment transaction
      const paymentReq: PaymentRequest = {
        sourcePublicKey: intent.sourcePublicKey,
        destination: intent.destination,
        amount: intent.amount,
        description: 'Agent-executed payment',
      };

      const { xdr, preview } = await PaymentService.buildPayment(paymentReq);

      logger.info(`Payment built by agent: ${preview.amount} XLM to ${preview.to}`);

      // If secret key provided, execute immediately
      if (intent.secretKey) {
        const result = await PaymentService.signAndSubmit(xdr, intent.secretKey);
        return {
          success: result.success,
          action: 'submitted',
          data: result,
          error: result.error,
        };
      }

      // Otherwise, return XDR for user signing
      return {
        success: true,
        action: 'sign_required',
        data: {
          xdr,
          preview,
          message: `Ready to send ${preview.amount} ${preview.asset} to ${preview.to}. Sign transaction to proceed.`,
        },
      };
    } catch (error: any) {
      logger.error(`Payment agent error: ${error.message}`);
      return {
        success: false,
        action: 'build',
        error: error.message,
      };
    }
  }

  /**
   * Handle wallet creation/import in agent context
   */
  static async processOnboarding(intent: {
    email?: string;
    phoneNumber?: string;
    publicKey?: string;
    secretKey?: string;
  }): Promise<AgentPaymentResponse> {
    try {
      const wallet = await OnboardingService.createOrImportWallet(intent);

      logger.info(
        `Onboarding ${wallet.isNew ? 'created' : 'imported'} wallet: ${wallet.publicKey}`
      );

      return {
        success: true,
        action: 'build',
        data: {
          publicKey: wallet.publicKey,
          secretKey: wallet.secretKey,
          balance: wallet.balance,
          isNew: wallet.isNew,
          message: wallet.isNew
            ? `Wallet created with ${wallet.balance} XLM for testing`
            : 'Wallet loaded successfully',
        },
      };
    } catch (error: any) {
      logger.error(`Onboarding agent error: ${error.message}`);
      return {
        success: false,
        action: 'build',
        error: error.message,
      };
    }
  }

  /**
   * Parse natural language payment request
   */
  static parsePaymentNL(text: string): Partial<AgentPaymentPayload> | null {
    // Pattern: "send 50 XLM to [contact/address]"
    const sendRegex = /(?:send|enviar)\s+([\d.]+)\s*(?:xlm)?\s*(?:to|para|pra)\s+(.+)/i;
    const match = text.match(sendRegex);

    if (!match) return null;

    return {
      amount: match[1],
      destination: match[2].trim(),
      description: `Payment from natural language: "${text}"`,
    };
  }
}
