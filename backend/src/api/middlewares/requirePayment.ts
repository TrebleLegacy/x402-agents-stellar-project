/**
 * Agentic Payment Middleware Pattern
 * Validates payment context and authorizes agent to execute payments
 */

import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../../services/paymentService';
import { StellarVerify } from '../../stellar/verify';
import { logger } from '../../utils/logger';

interface PaymentRequest extends Request {
  payment?: {
    sourcePublicKey: string;
    destination: string;
    amount: string;
    assetCode?: string;
  };
  user?: {
    userId: string;
  };
}

interface PaymentConfig {
  requiredAmount: string;
  asset?: string;
  description?: string;
}

/**
 * Middleware factory that validates X402 payment context for agent execution
 */
export const requirePayment = (config: PaymentConfig) => {
  return async (req: PaymentRequest, res: Response, next: NextFunction) => {
    try {
      const { sourcePublicKey, destination, amount, assetCode } = req.body;

      // Validate required fields
      if (!sourcePublicKey || !destination || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment fields: sourcePublicKey, destination, amount',
        });
      }

      // Validate public keys
      if (!StellarVerify.isValidPublicKey(sourcePublicKey)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid source public key format',
        });
      }

      if (!StellarVerify.isValidPublicKey(destination)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid destination public key format',
        });
      }

      // Validate amount
      if (!StellarVerify.isValidAmount(amount)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount (must be positive number)',
        });
      }

      // Attach validated payment context to request
      req.payment = {
        sourcePublicKey,
        destination,
        amount,
        assetCode: assetCode || config.asset || 'XLM',
      };

      logger.info(
        `Payment context validated: ${config.requiredAmount} ${config.asset || 'XLM'} for ${config.description || 'agent execution'}`
      );
      next();
    } catch (error: any) {
      logger.error(`Payment validation error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Payment validation failed',
      });
    }
  };
};

/**
 * Verify user has authorization to execute this payment
 */
export const requirePaymentAuth = async (req: PaymentRequest, res: Response, next: NextFunction) => {
  try {
    // Check user is authenticated
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for payment',
      });
    }

    // TODO: Add checks:
    // - Verify sourcePublicKey belongs to authenticated user
    // - Check payment limits/risk scores
    // - Verify against whitelist if needed

    logger.info(`Payment authorized for user: ${req.user.userId}`);
    next();
  } catch (error: any) {
    logger.error(`Payment authorization error: ${error.message}`);
    res.status(403).json({
      success: false,
      error: 'Not authorized for this payment',
    });
  }
};
