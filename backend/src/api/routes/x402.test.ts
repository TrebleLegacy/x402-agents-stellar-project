/**
 * x402 Test Endpoint - Testable agent interaction with x402 payments
 * Run: npm run dev
 * Test: curl -X POST http://localhost:8000/api/x402/test/payment \
 *   -H "Content-Type: application/json" \
 *   -d '{"publicKey":"GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJsu6CNZ4NZ4KEKJGQSTE7CWGX","amount":"0.001"}'
 */

import { Router, Request, Response, NextFunction } from 'express';
import { x402Service, initializeX402Service } from '../../services/x402Service';
import { x402Agent } from '../../agents/x402Agent';
import { StellarClient } from '../../stellar/client';
import { StellarVerify } from '../../stellar/verify';
import { logger } from '../../utils/logger';

const router = Router();

// Initialize x402 service
let x402ServiceInstance: x402Service | null = null;
let x402AgentInstance: x402Agent | null = null;

function getX402Service(): x402Service {
  if (!x402ServiceInstance) {
    x402ServiceInstance = initializeX402Service();
    x402AgentInstance = new x402Agent(x402ServiceInstance);
  }
  return x402ServiceInstance;
}

function getX402Agent(): x402Agent {
  if (!x402AgentInstance) {
    getX402Service(); // Initialize service first
  }
  return x402AgentInstance!;
}

/**
 * GET /api/x402/test/config
 * Get x402 testnet configuration and facilitator details
 */
router.get('/test/config', (req: Request, res: Response) => {
  try {
    logger.info('[x402-test] GET /config - Fetching configuration');

    const x402Service = getX402Service();
    const config = x402Service.getClientConfig();

    logger.info(`[x402-test] Configuration retrieved: ${JSON.stringify(config)}`);

    res.json({
      success: true,
      message: 'x402 Testnet Configuration',
      config: {
        ...config,
        environment: process.env.NODE_ENV || 'development',
        apiKeySet: !!process.env.X402_API_KEY,
        payToSet: !!process.env.X402_PAY_TO,
      },
      documentation: {
        title: 'Built on Stellar x402 Facilitator',
        facilitatorUrl: config.facilitatorUrl,
        apiKeyGeneration: 'https://channels.openzeppelin.com/testnet/gen',
        x402Docs: 'https://www.x402.org/',
        stellar: 'https://developers.stellar.org',
      },
      requiredEnvVars: {
        X402_API_KEY: 'Generate at https://channels.openzeppelin.com/testnet/gen',
        X402_PAY_TO: 'Your server Stellar public key (G...)',
        X402_FACILITATOR_URL:
          'https://channels.openzeppelin.com/x402/testnet (default)',
        X402_NETWORK: 'stellar:testnet (default) or stellar:pubnet',
      },
    });
  } catch (error: any) {
    logger.error(`[x402-test] Config error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/x402/test/payment
 * Test agent handling of x402 payment request
 * Body: { publicKey, amount }
 */
router.post('/test/payment', (req: Request, res: Response) => {
  try {
    logger.info('[x402-test] POST /test/payment - Initiating test payment');
    logger.debug(`[x402-test] Request body: ${JSON.stringify(req.body)}`);

    const { publicKey, amount = '0.001' } = req.body;

    if (!publicKey) {
      logger.warn('[x402-test] Missing publicKey in request');
      return res.status(400).json({
        success: false,
        error: 'publicKey required',
        example: {
          publicKey: 'GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6CNZ4NZ4KEKJGQSTE7CWGX',
          amount: '0.001',
        },
      });
    }

    if (!StellarVerify.isValidPublicKey(publicKey)) {
      logger.warn(`[x402-test] Invalid public key format: ${publicKey}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid public key format (must start with G and be 56 characters)',
      });
    }

    if (!StellarVerify.isValidAmount(amount)) {
      logger.warn(`[x402-test] Invalid amount: ${amount}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid amount (must be > 0)',
      });
    }

    logger.info(
      `[x402-test] Payment initiated: ${amount} by ${publicKey.substring(0, 10)}...`
    );

    // Respond with 402 Payment Required as per x402 protocol
    res.status(402);

    const x402Service = getX402Service();
    const paymentRequired = x402Service.buildPaymentRequired(
      'Test x402 Payment via Agent',
      `$${amount}`
    );

    logger.info('[x402-test] Sending 402 Payment Required response');

    res.json({
      success: true,
      status: 402,
      message: 'Payment Required - x402 Protocol',
      paymentRequired,
      testFlow: {
        step: 1,
        description: 'Client received payment requirement',
        next: 'Client must sign transaction and send PAYMENT-SIGNATURE header',
        endpoint: '/api/x402/test/verify',
      },
      commands: {
        generateKeypair: 'POST /api/stellar/test/generate-keypair',
        buildPayment: 'POST /api/payments/build',
        submitPayment: 'POST /api/payments/submit',
      },
    });
  } catch (error: any) {
    logger.error(`[x402-test] Payment error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/x402/test/agent-intent
 * Process x402 payment intent through agent
 * Body: { publicKey, secretKey?, amount?, resourcePath }
 */
router.post('/test/agent-intent', async (req: Request, res: Response) => {
  try {
    logger.info('[x402-test] POST /test/agent-intent - Processing agent intent');
    logger.debug(`[x402-test] Intent: ${JSON.stringify(req.body)}`);

    const { publicKey, secretKey, amount = '0.001', resourcePath = '/api/data' } = req.body;

    if (!publicKey) {
      return res.status(400).json({
        success: false,
        error: 'publicKey required',
      });
    }

    const x402Agent = getX402Agent();

    logger.info(`[x402-test] Agent processing payment intent from ${publicKey}`);

    const agentResponse = await x402Agent.processTestPayment(publicKey, amount);

    logger.info(`[x402-test] Agent response: ${agentResponse.action}`);

    if (secretKey && StellarVerify.isValidSecretKey(secretKey)) {
      logger.info('[x402-test] Secret key provided - agent can auto-sign');
      agentResponse.data.canAutoSign = true;
    }

    res.json({
      success: true,
      agentResponse,
      testInstructions: {
        phase: 'x402 Payment Agent Test',
        publicKey,
        amount,
        resourcePath,
        hasSecretKey: !!secretKey && StellarVerify.isValidSecretKey(secretKey),
        agentCapabilities: {
          verifyPayment: 'Agent can verify signed payments',
          autoSign: secretKey ? 'Agent will auto-sign transactions' : 'Agent needs signed XDR',
          settlePayment: 'Agent coordinates settlement via x402 facilitator',
        },
      },
      nextSteps: [
        '1. Create Soroban authorization entry',
        '2. Sign with secret key if agent has access',
        '3. POST to /api/x402/test/verify with signed XDR',
        '4. Agent verifies with facilitator',
        '5. Facilitator settles on-chain',
      ],
    });
  } catch (error: any) {
    logger.error(`[x402-test] Agent intent error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/x402/test/verify
 * Verify x402 signed payment
 * Body: { publicKey, signedXdr, amount }
 */
router.post('/test/verify', async (req: Request, res: Response) => {
  try {
    logger.info('[x402-test] POST /test/verify - Verifying signed payment');

    const { publicKey, signedXdr, amount = '0.001' } = req.body;

    if (!publicKey || !signedXdr) {
      logger.warn('[x402-test] Missing publicKey or signedXdr');
      return res.status(400).json({
        success: false,
        error: 'publicKey and signedXdr required',
      });
    }

    logger.info(`[x402-test] Verifying payment from ${publicKey}`);

    const x402Agent = getX402Agent();

    // Verify through agent (which coordinates with facilitator)
    const verifyResult = await x402Agent.verifySignedPayment(
      signedXdr,
      amount,
      'USDC',
      publicKey
    );

    logger.info(`[x402-test] Verification result: ${verifyResult.action}`);

    res.json({
      success: verifyResult.success,
      verification: verifyResult,
      facilitatorFlow: {
        step: 2,
        description: 'Facilitator verified and settled payment',
        status: verifyResult.action,
        transactionHash: verifyResult.data?.transactionHash,
      },
    });
  } catch (error: any) {
    logger.error(`[x402-test] Verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/x402/test/logs
 * Get recent x402 and agent logs
 */
router.get('/test/logs', (req: Request, res: Response) => {
  try {
    logger.info('[x402-test] GET /logs - Retrieving x402 logs');

    res.json({
      success: true,
      message: 'x402 Test Endpoint - Check server console for detailed logs',
      logLocation: 'Server console (stdout)',
      logFormat: '[x402*] prefix for all x402-related operations',
      howToTest: {
        step1_config: 'GET /api/x402/test/config',
        step2_generateKey: 'POST /api/stellar/test/generate-keypair',
        step3_initPayment: 'POST /api/x402/test/payment { publicKey, amount }',
        step4_agentIntent: 'POST /api/x402/test/agent-intent { publicKey, amount }',
        step5_verify: 'POST /api/x402/test/verify { publicKey, signedXdr, amount }',
      },
      environmentSetup: {
        requiredEnvVars: [
          'X402_API_KEY (generate at https://channels.openzeppelin.com/testnet/gen)',
          'X402_PAY_TO (your server Stellar public key)',
        ],
        optional: [
          'X402_FACILITATOR_URL (default: https://channels.openzeppelin.com/x402/testnet)',
          'X402_NETWORK (default: stellar:testnet)',
        ],
      },
    });
  } catch (error: any) {
    logger.error(`[x402-test] Logs error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
