/**
 * x402 Agent Payment Client
 * Uses React Agent to handle x402 payments and API requests
 * 
 * Usage:
 *   npx ts-node src/x402AgentClient.ts
 */

require('dotenv').config();

import axios from 'axios';
import { X402PaymentBuilder } from './stellar/x402PaymentBuilder';
import { StellarClient } from './stellar/client';
import { logger } from './utils/logger';

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

  constructor(config: X402PaymentConfig) {
    this.config = config;
  }

  /**
   * Request a protected endpoint and handle 402 Payment Required
   */
  async requestWithPayment(req_body: any = {}): Promise<any> {
    try {
      logger.info(`Requesting endpoint: ${this.config.endpoint}`);

      // Step 1: Make initial request (will get 402)
      let response;
      try {
        response = await axios.get(`${this.config.apiUrl}${this.config.endpoint}`, {
          data: req_body,
        });
        // If it succeeds without payment, return the result
        return response.data;
      } catch (error: any) {
        if (error.response?.status !== 402) {
          throw error;
        }
        // Expected 402 response
        response = error.response;
      }

      // Step 2: Parse payment instructions from 402 response
      logger.info('Received 402 Payment Required');
      const paymentInstructions = response.data.instructions;
      logger.info(`Payment instructions: ${JSON.stringify(paymentInstructions)}`);

      // Step 3: Build and sign the payment transaction
      logger.info('Building and signing x402 payment transaction...');
      
      const paymentInput = {
        sourcePublicKey: this.config.clientPublicKey,
        receiveSigningPublicKey: this.config.serverPublicKey,
        destinationAddress: paymentInstructions.payTo,
        amount: this.extractAmount(paymentInstructions.price),
        assetContract: paymentInstructions.asset || '', // USDC or custom
        price: paymentInstructions.price,
      };

      const paymentSignatureHeader = await X402PaymentBuilder.buildAndSign(
        paymentInput,
        this.config.clientSecretKey
      );

      logger.info('Payment transaction signed successfully');

      // Step 4: Resubmit request with Payment-Signature header
      logger.info('Submitting request with payment signature...');
      
      const retryResponse = await axios.get(
        `${this.config.apiUrl}${this.config.endpoint}`,
        {
          headers: {
            'Payment-Signature': paymentSignatureHeader,
          },
          data: req_body,
        }
      );

      logger.info('Payment accepted and request succeeded');

      // Step 5: Parse payment response if available
      if (retryResponse.headers['payment-response']) {
        const paymentResponse = X402PaymentBuilder.parsePaymentResponse(
          retryResponse.headers['payment-response']
        );
        logger.info(`Payment settled: ${JSON.stringify(paymentResponse)}`);
      }

      return retryResponse.data;
    } catch (error: any) {
      logger.error(`Request failed: ${error.message}`);
      throw error;
    }
  }

  private extractAmount(price: string): string {
    // Parse "$0.001" to "1000" (in stroops, where 1 XLM = 10,000,000 stroops)
    if (typeof price === 'string' && price.startsWith('$')) {
      const dollars = parseFloat(price.substring(1));
      // Assuming USDC with 7 decimals on Stellar
      return Math.floor(dollars * 10000000).toString();
    }
    return price;
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
