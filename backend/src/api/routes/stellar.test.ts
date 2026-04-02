/**
 * Stellar Test Endpoint - Generate keypairs and test payments
 */

import { Router, Request, Response } from 'express';
import { StellarClient } from '../../stellar/client';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/stellar/test/generate-keypair
 * Generate a random Stellar keypair for testing
 */
router.post('/test/generate-keypair', async (req: Request, res: Response) => {
  try {
    logger.info('[stellar-test] Generating new keypair');

    const keypair = StellarClient.generateKeypair();

    logger.info(`[stellar-test] Keypair generated: ${keypair.publicKey}`);

    res.json({
      success: true,
      keypair: {
        publicKey: keypair.publicKey,
        secretKey: keypair.secret,
      },
      warning: 'Secret Key is sensitive - store securely and never commit to version control',
      nextSteps: [
        'Use this keypair to fund testnet account via Friendbot',
        'Test x402 payments with this keypair',
      ],
    });
  } catch (error: any) {
    logger.error(`[stellar-test] Keypair generation error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/stellar/test/fund-testnet
 * Fund a testnet account via Friendbot
 * Body: { publicKey }
 */
router.post('/test/fund-testnet', async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({
        success: false,
        error: 'publicKey required',
      });
    }

    logger.info(`[stellar-test] Funding testnet account: ${publicKey}`);

    try {
      const response = await fetch(
        `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`
      );
      
      if (!response.ok) {
        throw new Error(`Friendbot error: ${response.statusText}`);
      }

      logger.info(`[stellar-test] Testnet account funded: ${publicKey}`);

      res.json({
        success: true,
        message: 'Testnet account funded with 10,000 XLM',
        publicKey,
        balance: 10000,
        asset: 'XLM',
        network: 'stellar:testnet',
      });
    } catch (error: any) {
      logger.error(`[stellar-test] Friendbot error: ${error.message}`);
      throw error;
    }
  } catch (error: any) {
    logger.error(`[stellar-test] Funding error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
