/**
 * x402 Agent Payment Client
 * Uses React Agent to handle x402 payments and API requests
 * 
 * Usage:
 *   npx ts-node src/x402AgentClient.ts
 */

require('dotenv').config();

import { StellarClient } from './stellar/client';
import { logger } from './utils/logger';
import { X402Client } from './sdk/x402/client';

interface X402PaymentConfig {
  apiUrl: string;
  endpoint: string;
  clientPublicKey: string;
  clientSecretKey: string;
  serverPublicKey: string;
}

/**
 * x402 Agent Payment Handler
 * Manages the full x402 payment flow with the API
 */
class X402AgentClient {
  private config: X402PaymentConfig;
  private sdkClient: X402Client;

  constructor(config: X402PaymentConfig) {
    this.config = config;
    this.sdkClient = new X402Client({
      baseURL: config.apiUrl,
      publicKey: config.clientPublicKey,
      secretKey: config.clientSecretKey,
      network: 'stellar:testnet',
    });
  }

  /**
   * Request a protected endpoint and handle 402 Payment Required
   */
  async requestWithPayment(req_body: any = {}): Promise<any> {
    try {
      logger.info(`Requesting endpoint: ${this.config.endpoint}`);
      const data = await this.sdkClient.payAndRequest({
        method: 'get',
        path: this.config.endpoint,
        data: req_body,
      });

      logger.info('Payment accepted and request succeeded');
      return data;
    } catch (error: any) {
      logger.error(`Request failed: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Example: Use ReAct agent with x402 payments
 */
async function runX402AgentExample() {
  try {
    // Check environment variables
    const requiredEnvVars = [
      'SERVER_STELLAR_ADDRESS',
      'X402_API_KEY',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        logger.warn(`Missing environment variable: ${envVar}`);
      }
    }

    // Generate a test client keypair
    logger.info('Generating test client keypair...');
    const clientKeypair = StellarClient.generateKeypair();
    logger.info(`Client public key: ${clientKeypair.publicKey}`);
    logger.info(`Client secret key: ${clientKeypair.secret} (KEEP SECRET!)`);

    // Create test account on friendbot
    logger.info('Funding test account on Stellar testnet...');
    const fundedAccount = await StellarClient.createTestAccount();
    logger.info(`Account funded: ${fundedAccount.publicKey}`);

    // Initialize the x402 payment client
    const serverAddress = process.env.SERVER_STELLAR_ADDRESS;
    if (!serverAddress) {
      logger.warn('SERVER_STELLAR_ADDRESS not set - using client address for demo');
    }

    const x402Client = new X402AgentClient({
      apiUrl: process.env.API_URL || 'http://localhost:8000',
      endpoint: '/api/agent/query',
      clientPublicKey: fundedAccount.publicKey,
      clientSecretKey: fundedAccount.secret,
      serverPublicKey: serverAddress || fundedAccount.publicKey, // Fallback to client for testing
    });

    // Make a request to a protected endpoint
    logger.info('\n=== Making x402 payment request ===');
    const result = await x402Client.requestWithPayment({
      query: 'What is the balance of my account?',
    });

    logger.info(`Response: ${JSON.stringify(result)}`);
    logger.info('\n=== x402 Payment Flow Complete ===');
  } catch (error: any) {
    logger.error(`Error in x402 agent example: ${error.message}`);
    if (error.response?.data) {
      logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    process.exit(1);
  }
}

// Run the example
runX402AgentExample().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
