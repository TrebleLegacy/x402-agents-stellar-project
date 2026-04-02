/**
 * Agent Orchestrator - Routes agent requests to appropriate handlers
 */

import { PaymentAgent } from './paymentAgent';
import { x402Agent } from './x402Agent';
import { x402Service, initializeX402Service } from '../services/x402Service';
import { StellarVerify } from '../stellar/verify';
import { logger } from '../utils/logger';

export interface AgentRequest {
  intent: string; // 'payment', 'onboard', 'balance', etc.
  context: Record<string, any>;
  sessionId: string;
  userId?: string;
}

export interface AgentResponse {
  success: boolean;
  intent: string;
  action?: string;
  data?: any;
  message?: string;
  error?: string;
}

export class AgentOrchestrator {
  private static x402ServiceInstance: x402Service | null = null;
  private static x402AgentInstance: x402Agent | null = null;

  private static getX402Service(): x402Service {
    if (!this.x402ServiceInstance) {
      this.x402ServiceInstance = initializeX402Service();
      this.x402AgentInstance = new x402Agent(this.x402ServiceInstance);
    }
    return this.x402ServiceInstance;
  }

  private static getX402Agent(): x402Agent {
    if (!this.x402AgentInstance) {
      this.getX402Service(); // Initialize service first
    }
    return this.x402AgentInstance!;
  }

  /**
   * Main entry point for agent requests
   */
  static async process(request: AgentRequest): Promise<AgentResponse> {
    logger.info(`[Agent] Processing intent: ${request.intent}`);

    try {
      switch (request.intent.toLowerCase()) {
        case 'payment':
        case 'send_payment':
          return await this.handlePaymentIntent(request);

        case 'onboard':
        case 'create_wallet':
          return await this.handleOnboardingIntent(request);

        case 'balance':
        case 'check_balance':
          return await this.handleBalanceIntent(request);

        case 'x402_payment':
        case 'x402':
          return await this.handleX402Intent(request);

        case 'parse_nl':
          return this.handleNLParse(request);

        default:
          return {
            success: false,
            intent: request.intent,
            error: `Unknown agent intent: ${request.intent}`,
          };
      }
    } catch (error: any) {
      logger.error(`[Agent] Error processing intent: ${error.message}`);
      return {
        success: false,
        intent: request.intent,
        error: error.message,
      };
    }
  }

  private static async handlePaymentIntent(request: AgentRequest): Promise<AgentResponse> {
    const result = await PaymentAgent.processPaymentIntent(request.context);

    return {
      success: result.success,
      intent: 'payment',
      action: result.action,
      data: result.data,
      error: result.error,
    };
  }

  private static async handleOnboardingIntent(request: AgentRequest): Promise<AgentResponse> {
    const result = await PaymentAgent.processOnboarding(request.context);

    return {
      success: result.success,
      intent: 'onboard',
      action: result.action,
      data: result.data,
      error: result.error,
    };
  }

  private static async handleX402Intent(request: AgentRequest): Promise<AgentResponse> {
    const { publicKey, amount, resourcePath, description } = request.context;

    if (!publicKey) {
      return {
        success: false,
        intent: 'x402_payment',
        error: 'publicKey required for x402 payment',
      };
    }

    if (!StellarVerify.isValidPublicKey(publicKey)) {
      return {
        success: false,
        intent: 'x402_payment',
        error: 'Invalid public key format',
      };
    }

    const x402Agent = this.getX402Agent();

    const result = await x402Agent.processPaymentRequest({
      publicKey,
      resourcePath: resourcePath || '/api/resource',
      price: amount || '0.001',
      description,
    });

    return {
      success: result.success,
      intent: 'x402_payment',
      action: result.action,
      data: result.data,
      message: result.message,
      error: result.error,
    };
  }

  private static async handleBalanceIntent(request: AgentRequest): Promise<AgentResponse> {
    const { publicKey } = request.context;

    if (!publicKey || !StellarVerify.isValidPublicKey(publicKey)) {
      return {
        success: false,
        intent: 'balance',
        error: 'Invalid public key',
      };
    }

    // TODO: Integrate with PaymentService.getAccountDetails()

    return {
      success: true,
      intent: 'balance',
      data: {
        publicKey,
        message: 'Balance check would be executed here',
      },
    };
  }

  private static handleNLParse(request: AgentRequest): AgentResponse {
    const { text } = request.context;

    if (!text) {
      return {
        success: false,
        intent: 'parse_nl',
        error: 'No text provided to parse',
      };
    }

    const parsed = PaymentAgent.parsePaymentNL(text);

    return {
      success: !!parsed,
      intent: 'parse_nl',
      data: parsed,
      message: parsed
        ? `Parsed payment: ${parsed.amount} XLM to ${parsed.destination}`
        : 'Could not parse payment intent from text',
    };
  }
}
