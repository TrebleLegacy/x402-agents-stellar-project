/**
 * Simple x402 Payment Test
 * Demonstrates building and signing x402 transactions without requiring server
 */

require('dotenv').config({ path: '.env' });

import { X402PaymentBuilder } from '../stellar/x402PaymentBuilder';
import { StellarClient } from '../stellar/client';
import { logger } from '../utils/logger';

async function runTest() {
  try {
    logger.info('=== x402 Payment Builder Test ===\n');

    // Step 1: Generate keypairs
    logger.info('Step 1: Generate keypairs');
    const clientKeypair = StellarClient.generateKeypair();
    const serverKeypair = StellarClient.generateKeypair();
    logger.info(`Client: ${clientKeypair.publicKey}`);
    logger.info(`Server: ${serverKeypair.publicKey}\n`);

    // Step 2: Fund client account
    logger.info('Step 2: Funding client account on testnet...');
    const fundedClient = await StellarClient.createTestAccount();
    logger.info(`Funded: ${fundedClient.publicKey}\n`);

    // Step 3: Build unsigned transaction
    logger.info('Step 3: Building unsigned x402 transaction...');
    const unsignedXdr = await X402PaymentBuilder.buildUnsignedTransaction({
      sourcePublicKey: fundedClient.publicKey,
      receiveSigningPublicKey: serverKeypair.publicKey,
      destinationAddress: serverKeypair.publicKey,
      amount: '0.001', // 0.001 XLM
      assetContract: '',
      price: '$0.001',
    });
    logger.info('✓ Transaction built\n');

    // Step 4: Sign transaction
    logger.info('Step 4: Signing transaction...');
    const signatureData = X402PaymentBuilder.signTransaction(unsignedXdr, fundedClient.secret);
    logger.info(`✓ Signed by ${signatureData.publicKey}\n`);

    // Step 5: Create Payment-Signature header
    logger.info('Step 5: Creating Payment-Signature header...');
    const paymentHeader = X402PaymentBuilder.createPaymentSignatureHeader(signatureData);
    logger.info(`✓ Header created (length: ${paymentHeader.length})\n`);

    // Step 6: Display results
    logger.info('=== Results ===');
    logger.info(`\nTransaction XDR (first 100 chars):`);
    logger.info(signatureData.transaction.substring(0, 100) + '...\n');

    logger.info(`Payment-Signature Header:`);
    logger.info(paymentHeader.substring(0, 100) + '...\n');

    // Step 7: Verify we can parse the header back
    logger.info('Step 7: Verifying header can be parsed back...');
    const parsed = X402PaymentBuilder.parsePaymentResponse(paymentHeader);
    logger.info(`✓ Parsed successfully`);
    logger.info(`  - Transaction: ${parsed.transaction.substring(0, 50)}...`);
    logger.info(`  - Signed: ${parsed.signed}`);
    logger.info(`  - Public Key: ${parsed.publicKey}`);
    logger.info(`  - Timestamp: ${parsed.timestamp}\n`);

    // Step 8: Parse instruction example
    logger.info('Step 8: Example payment instructions from server:');
    const instructions = {
      scheme: 'exact-v2',
      price: '$0.001',
      network: 'stellar:testnet',
      payTo: serverKeypair.publicKey,
      facilitatorUrl: 'https://channels.openzeppelin.com/x402/testnet',
    };
    logger.info(JSON.stringify(instructions, null, 2));

    logger.info('\n=== ✅ x402 Payment Flow Test Complete ===');
    logger.info('\nUsage in real scenario:');
    logger.info('1. Client gets 402 response with "instructions"');
    logger.info('2. Client calls buildUnsignedTransaction() with instructions');
    logger.info('3. Client calls signTransaction() with their secret key');
    logger.info('4. Client calls createPaymentSignatureHeader() to create header');
    logger.info('5. Client resubmits request with Payment-Signature header');
    logger.info('6. Server verifies with facilitator and settles on-chain');
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    if (error.response?.data) {
      logger.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    process.exit(1);
  }
}

runTest();
