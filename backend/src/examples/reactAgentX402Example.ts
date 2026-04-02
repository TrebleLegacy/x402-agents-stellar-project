/**
 * React Agent with x402 Payment Integration
 * Demonstrates AI agent reasoning about when and how to make payments
 * 
 * Usage:
 *   npx ts-node src/examples/reactAgentX402Example.ts
 */

require('dotenv').config();

import axios from 'axios';
import { ChatOpenAI } from '@langchain/openai';
import { logger } from '../utils/logger';
import { StellarClient } from '../stellar/client';
import { X402PaymentBuilder } from '../stellar/x402PaymentBuilder';

interface AgentRequest {
  action: string;
  endpoint: string;
  description: string;
  requiresPayment?: boolean;
  amount?: string;
}

/**
 * React Agent for x402 Payments
 * Reasons about payment requirements and executes transactions
 */
class X402ReactAgent {
  private model: ChatOpenAI;
  private publicKey: string;
  private secretKey: string;

  constructor(publicKey: string, secretKey: string) {
    this.publicKey = publicKey;
    this.secretKey = secretKey;
    this.model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o',
      temperature: 0,
    });
  }

  /**
   * Reasoning step: Analyze the request
   */
  private async reasonAboutRequest(request: AgentRequest): Promise<string> {
    const prompt = `
You are an AI agent that manages Stellar blockchain payments using the x402 protocol.

The user wants to: ${request.description}

Endpoint: ${request.endpoint}
Requires Payment: ${request.requiresPayment || false}
Price: ${request.amount || 'Not specified'}

Analyze this request and decide:
1. Is payment required?
2. What should be the strategy?
3. What confirmation should we get back?

Respond with a JSON object:
{
  "requiresPayment": boolean,
  "strategy": "description of strategy",
  "expectedPrice": "estimated price",
  "riskLevel": "low | medium | high"
}
    `;

    try {
      const response = await this.model.invoke(prompt);
      const content = response.content.toString();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      return content;
    } catch (error: any) {
      logger.error(`Reasoning failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Action step: Build and sign payment
   */
  private async buildAndSignPayment(endpoint: string, amount: string): Promise<string> {
    logger.info(`Building payment: ${amount} XLM for ${endpoint}`);

    const paymentInput = {
      sourcePublicKey: this.publicKey,
      receiveSigningPublicKey: process.env.SERVER_STELLAR_ADDRESS || '',
      destinationAddress: process.env.SERVER_STELLAR_ADDRESS || '',
      amount: this.extractAmount(amount),
      assetContract: '',
      price: amount,
    };

    return await X402PaymentBuilder.buildAndSign(paymentInput, this.secretKey);
  }

  /**
   * Action step: Submit request with payment
   */
  private async submitWithPayment(
    endpoint: string,
    paymentSignature: string
  ): Promise<any> {
    logger.info(`Submitting request to ${endpoint}`);

    const response = await axios.get(
      `http://localhost:8000${endpoint}`,
      {
        headers: {
          'Payment-Signature': paymentSignature,
        },
      }
    );

    return response.data;
  }

  /**
   * Main reasoning loop (think → act → observe)
   */
  async execute(request: AgentRequest): Promise<any> {
    logger.info(`\n=== REACT AGENT EXECUTION ===`);
    logger.info(`Task: ${request.description}`);

    // THOUGHT: Analyze the request
    logger.info('\n[THOUGHT] Analyzing request...');
    const analysis = JSON.parse(await this.reasonAboutRequest(request));
    logger.info(`Analysis: ${JSON.stringify(analysis, null, 2)}`);

    // Check if payment is required
    if (!analysis.requiresPayment && !request.requiresPayment) {
      logger.info('\n[ACT] Making request without payment...');
      const result = await axios.get(`http://localhost:8000${request.endpoint}`);
      logger.info(`[OBSERVATION] Response received`);
      return result.data;
    }

    // Payment required - build signature
    logger.info('\n[ACT] Building and signing x402 payment...');
    const amount = request.amount || analysis.expectedPrice;
    const paymentSignature = await this.buildAndSignPayment(request.endpoint, amount);
    logger.info(`[OBSERVATION] Payment signed successfully`);

    // Submit with payment
    logger.info('\n[ACT] Submitting request with payment...');
    try {
      const result = await this.submitWithPayment(request.endpoint, paymentSignature);
      logger.info(`[OBSERVATION] Request succeeded with payment`);
      return result;
    } catch (error: any) {
      if (error.response?.status === 402) {
        // Payment needed but signature failed
        logger.error(`[OBSERVATION] Payment was rejected: ${error.response.data.error}`);
        throw error;
      }
      throw error;
    }
  }

  private extractAmount(price: string): string {
    if (typeof price === 'string' && price.startsWith('$')) {
      const dollars = parseFloat(price.substring(1));
      return Math.floor(dollars * 10000000).toString();
    }
    return price;
  }
}

/**
 * Example scenarios matching ReAct pattern
 */
const exampleScenarios: AgentRequest[] = [
  {
    action: 'query_agent',
    endpoint: '/api/agent/query',
    description: 'Query the AI agent for account balance information',
    requiresPayment: true,
    amount: '$0.001',
  },
  {
    action: 'build_payment',
    endpoint: '/api/payments/build',
    description: 'Build an unsigned payment transaction',
    requiresPayment: true,
    amount: '$0.005',
  },
  {
    action: 'check_balance',
    endpoint: '/api/payments/balance/GBBD47RLZEWZGWFVFHZ6FCZZH4A2R5GBYAOA5ZQSPBJXVKPUQP4H2Y4M', // dummy
    description: 'Check account balance (no payment)',
    requiresPayment: false,
  },
];

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('=== x402 React Agent with Payment Integration ===\n');

    // Setup
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'SERVER_STELLAR_ADDRESS',
      'X402_API_KEY',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        logger.warn(`⚠️  Missing environment variable: ${envVar}`);
      }
    }

    // Generate test keypair
    logger.info('Generating test keypair...');
    const keypair = StellarClient.generateKeypair();
    logger.info(`Public Key: ${keypair.publicKey}`);
    logger.info(`Secret Key: ${keypair.secret}\n`);

    // Fund account
    logger.info('Funding account on testnet...');
    const fundedKeypair = await StellarClient.createTestAccount();
    logger.info(`Account funded: ${fundedKeypair.publicKey}\n`);

    // Initialize agent
    const agent = new X402ReactAgent(fundedKeypair.publicKey, fundedKeypair.secret);

    // Execute scenario
    const scenario = exampleScenarios[0]; // Query agent
    logger.info(`Executing scenario: ${scenario.description}\n`);

    try {
      const result = await agent.execute(scenario);
      logger.info(`\n=== RESULT ===`);
      logger.info(JSON.stringify(result, null, 2));
    } catch (error: any) {
      if (error.response?.status === 402) {
        logger.info(`Expected 402 response during testing`);
      } else {
        throw error;
      }
    }

    logger.info(`\n=== React Agent Execution Complete ===`);
  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`);
    if (error.response?.data) {
      logger.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    process.exit(1);
  }
}

main();
