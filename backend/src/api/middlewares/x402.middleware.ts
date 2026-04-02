/**
 * x402 Payment Middleware
 * Handles x402 payment verification and settlement flow
 */

import { Request, Response, NextFunction } from 'express';
import { x402FacilitatorClient, x402Config } from '../../config/x402';
import { logger } from '../../utils/logger';

interface X402Request extends Request {
  paymentSignature?: string;
  paymentData?: any;
}

export const x402PaymentMiddleware = (priceMap: Record<string, string>) => {
  return async (req: X402Request, res: Response, next: NextFunction) => {
    const route = `${req.method} ${req.path}`;
    const price = priceMap[route];

    // Route not protected by x402
    if (!price) {
      return next();
    }

    // Check for payment signature header
    const paymentSignature = req.headers['payment-signature'] as string;
    const paymentRequired = req.headers['payment-required'] as string;

    // First request - return 402 with payment instructions
    if (!paymentSignature) {
      const paymentInstructions = {
        scheme: x402Config.scheme,
        price,
        network: x402Config.network,
        payTo: process.env.SERVER_STELLAR_ADDRESS || '',
        facilitatorUrl: x402Config.facilitatorUrl,
      };

      return res.status(402).json({
        status: 'payment_required',
        instructions: paymentInstructions,
        message: 'Payment required for this endpoint',
      });
    }

    try {
      // Parse signature data
      const signatureData = JSON.parse(
        Buffer.from(paymentSignature, 'base64').toString()
      );

      // Verify payment with facilitator
      logger.info(`Verifying x402 payment for route: ${route}`);
      
      const verifyPayload = {
        transaction: signatureData.transaction,
        signature: signatureData.signature,
        network: x402Config.network,
        scheme: x402Config.scheme,
      };

      const verifyResult = await x402FacilitatorClient.verify(verifyPayload);

      if (!verifyResult.verified) {
        return res.status(402).json({
          success: false,
          error: 'Payment verification failed',
          details: verifyResult.reason,
        });
      }

      // Settle payment
      logger.info(`Settling x402 payment for route: ${route}`);
      
      const settlePayload = {
        transaction: signatureData.transaction,
        network: x402Config.network,
        scheme: x402Config.scheme,
      };

      const settleResult = await x402FacilitatorClient.settle(settlePayload);

      if (!settleResult.settled) {
        return res.status(500).json({
          success: false,
          error: 'Payment settlement failed',
          details: settleResult.reason,
        });
      }

      // Payment successful - attach to request and continue
      req.paymentData = settleResult;
      
      // Add payment response header
      res.setHeader('payment-response', Buffer.from(
        JSON.stringify({
          status: 'settled',
          hash: settleResult.transactionHash,
          timestamp: new Date().toISOString(),
        })
      ).toString('base64'));

      logger.info(`Payment settled successfully for route: ${route}`);
      next();
    } catch (error: any) {
      logger.error(`x402 payment error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Payment processing failed',
        details: error.message,
      });
    }
  };
};
