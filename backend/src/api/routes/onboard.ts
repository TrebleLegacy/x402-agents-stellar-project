/**
 * Onboarding Endpoints
 * HTTP routes for user account creation and wallet management
 */

import { Router, Request, Response } from 'express';
import { OnboardingService } from '../../services/onboardingService';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/onboard
 * Create or import Stellar wallet
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber, publicKey, secretKey } = req.body;

    // Validate at least one identifier provided
    if (!email && !phoneNumber && !publicKey && !secretKey) {
      return res.status(400).json({
        success: false,
        error: 'Provide email, phoneNumber, publicKey, or secretKey',
      });
    }

    const wallet = await OnboardingService.createOrImportWallet({
      email,
      phoneNumber,
      publicKey,
      secretKey,
    });

    res.status(201).json({
      success: true,
      publicKey: wallet.publicKey,
      secretKey: wallet.secretKey,
      balance: wallet.balance,
      isNew: wallet.isNew,
      message: wallet.isNew
        ? `Wallet created with ${wallet.balance} XLM`
        : 'Wallet imported successfully',
    });
  } catch (error: any) {
    logger.error(`Onboarding failed: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
