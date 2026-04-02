/**
 * x402 Payment Tool for React Agent
 * Enables the React Agent to build, sign, and submit x402 payments
 */

import { X402PaymentBuilder } from '../stellar/x402PaymentBuilder';
import { StellarClient } from '../stellar/client';
import { x402FacilitatorClient } from '../config/x402';
import { logger } from '../utils/logger';

/**
 * Tool: Make x402 Payment Request
 * Calls an API endpoint with x402 payment
 */
export const x402PaymentTool = {
  name: 'make_x402_payment',
  description: 'Make a request to a protected API endpoint that requires x402 payment. Handles building, signing, and submitting the payment.',
  parameters: {
    type: 'object',
    properties: {
      endpoint: {
        type: 'string',
        description: 'The API endpoint (e.g., /api/agent/query)',
      },
      clientPublicKey: {
        type: 'string',
        description: 'Client Stellar public key',
      },
      clientSecretKey: {
        type: 'string',
        description: 'Client Stellar secret key (for signing)',
      },
      requestData: {
        type: 'object',
        description: 'Data to send in the request',
      },
    },
    required: ['endpoint', 'clientPublicKey', 'clientSecretKey'],
  },
};

/**
 * Execute x402 Payment
 */
export async function executeX402Payment(input: any): Promise<string> {
  try {
    const {
      endpoint,
      clientPublicKey,
      clientSecretKey,
      requestData = {},
    } = input;

    if (!endpoint || !clientPublicKey || !clientSecretKey) {
      return JSON.stringify({
        success: false,
        error: 'Missing required parameters: endpoint, clientPublicKey, clientSecretKey',
      });
    }

    logger.info(`Executing x402 payment for endpoint: ${endpoint}`);

    // Step 1: Get payment instructions
    const paymentInstructions = {
      scheme: 'exact-v2',
      network: 'stellar:testnet',
      price: '$0.001', // Default price
      payTo: process.env.SERVER_STELLAR_ADDRESS || '',
    };

    logger.info(`Payment instructions: ${JSON.stringify(paymentInstructions)}`);

    // Step 2: Build and sign transaction
    const paymentInput = {
      sourcePublicKey: clientPublicKey,
      receiveSigningPublicKey: process.env.SERVER_STELLAR_ADDRESS || '',
      destinationAddress: paymentInstructions.payTo,
      amount: '1000', // 0.0001 XLM in stroops
      assetContract: '',
      price: '$0.001',
    };

    const signatureHeader = await X402PaymentBuilder.buildAndSign(
      paymentInput,
      clientSecretKey
    );

    logger.info('Payment signed successfully');

    // Step 3: Parse signature
    const signatureData = JSON.parse(
      Buffer.from(signatureHeader, 'base64').toString()
    );

    // Step 4: Verify with facilitator
    const verifyPayload = {
      transaction: signatureData.transaction,
      signature: signatureData.signature,
      network: 'stellar:testnet',
      scheme: 'exact-v2',
    };

    logger.info('Verifying payment with facilitator...');
    const verifyResult = await x402FacilitatorClient.verify(verifyPayload);

    if (!verifyResult.verified) {
      return JSON.stringify({
        success: false,
        error: `Payment verification failed: ${verifyResult.reason}`,
      });
    }

    logger.info('Payment verified successfully');

    // Step 5: Settle payment
    const settlePayload = {
      transaction: signatureData.transaction,
      network: 'stellar:testnet',
      scheme: 'exact-v2',
    };

    logger.info('Settling payment...');
    const settleResult = await x402FacilitatorClient.settle(settlePayload);

    if (!settleResult.settled) {
      return JSON.stringify({
        success: false,
        error: `Payment settlement failed: ${settleResult.reason}`,
      });
    }

    logger.info('Payment settled successfully');

    return JSON.stringify({
      success: true,
      message: 'x402 Payment successful',
      paymentHash: settleResult.transactionHash,
      endpoint,
      amount: paymentInstructions.price,
    });
  } catch (error: any) {
    logger.error(`x402 payment error: ${error.message}`);
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Tool: Build x402 Payment (without submitting)
 */
export const buildX402PaymentTool = {
  name: 'build_x402_payment',
  description: 'Build an unsigned x402 payment transaction for manual signing',
  parameters: {
    type: 'object',
    properties: {
      destinationAddress: {
        type: 'string',
        description: 'Payment destination Stellar address',
      },
      amount: {
        type: 'string',
        description: 'Amount to pay (in XLM or custom currency)',
      },
      assetCode: {
        type: 'string',
        description: 'Asset code (e.g., USDC) - defaults to XLM (native)',
      },
      assetIssuer: {
        type: 'string',
        description: 'Asset issuer public key (if not native)',
      },
    },
    required: ['destinationAddress', 'amount'],
  },
};

/**
 * Execute Build x402 Payment
 */
export async function executeBuildX402Payment(input: any): Promise<string> {
  try {
    const {
      destinationAddress,
      amount,
      assetCode,
      assetIssuer,
    } = input;

    if (!destinationAddress || !amount) {
      return JSON.stringify({
        success: false,
        error: 'Missing required parameters: destinationAddress, amount',
      });
    }

    logger.info(`Building x402 payment: ${amount} to ${destinationAddress}`);

    const paymentInput = {
      sourcePublicKey: process.env.SERVER_STELLAR_ADDRESS || '',
      receiveSigningPublicKey: process.env.SERVER_STELLAR_ADDRESS || '',
      destinationAddress,
      amount,
      assetContract: assetCode ? `contract_${assetCode}` : '',
      price: amount,
    };

    const unsignedXdr = await X402PaymentBuilder.buildUnsignedTransaction(
      paymentInput
    );

    return JSON.stringify({
      success: true,
      message: 'Unsigned transaction built',
      unsignedXdr,
      destinationAddress,
      amount,
      instructions: 'Sign this XDR with your secret key and submit with Payment-Signature header',
    });
  } catch (error: any) {
    logger.error(`Build payment error: ${error.message}`);
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
}
