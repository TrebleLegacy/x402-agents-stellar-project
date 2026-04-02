/**
 * Payment Endpoints
 * HTTP routes for payment operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PaymentService } from '../../services/paymentService';
import { requirePayment } from '../middlewares/requirePayment';
import { logger } from '../../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: { userId: string };
  payment?: any;
}

const router = Router();

/**
 * POST /api/payments/build
 * Build unsigned payment transaction (XDR)
 */
router.post('/build', requirePayment, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sourcePublicKey, destination, amount, assetCode, memo, description } = req.body;

    const result = await PaymentService.buildPayment({
      sourcePublicKey,
      destination,
      amount,
      assetCode,
      memo,
      description,
    });

    res.json({
      success: true,
      xdr: result.xdr,
      preview: result.preview,
      message: 'Payment transaction built successfully',
    });
  } catch (error: any) {
    logger.error(`Payment build failed: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/submit
 * Sign and submit payment transaction
 */
router.post('/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { xdr, secretKey } = req.body;

    if (!xdr || !secretKey) {
      return res.status(400).json({
        success: false,
        error: 'XDR and secret key required',
      });
    }

    const result = await PaymentService.signAndSubmit(xdr, secretKey);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      transactionHash: result.hash,
      message: 'Payment submitted successfully',
    });
  } catch (error: any) {
    logger.error(`Payment submit failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/balance/:publicKey
 * Get account balance
 */
router.get('/balance/:publicKey', async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.params;
    const balance = await PaymentService.getBalance(publicKey);

    res.json({
      success: true,
      publicKey,
      balance,
      asset: 'XLM',
    });
  } catch (error: any) {
    logger.error(`Balance fetch failed: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/account/:publicKey
 * Get full account details
 */
router.get('/account/:publicKey', async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.params;
    const details = await PaymentService.getAccountDetails(publicKey);

    res.json({
      success: true,
      account: details,
    });
  } catch (error: any) {
    logger.error(`Account details fetch failed: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
