/**
 * x402 Payment Builder
 * Build and sign payment transactions for x402 protocol
 */

import {
  Keypair,
  Operation,
  TransactionBuilder,
  Networks,
  Horizon,
  Asset,
  Memo,
} from '@stellar/stellar-sdk';
import { logger } from '../utils/logger';

interface X402PaymentInput {
  sourcePublicKey: string;
  receiveSigningPublicKey: string; // Server's public key to sign with
  destinationAddress: string;
  amount: string;
  assetContract: string;
  price: string;
}

interface X402SignatureData {
  transaction: string;
  signed: boolean;
  publicKey: string;
  timestamp: string;
}

const getServer = (): Horizon.Server => {
  const network = process.env.STELLAR_NETWORK || 'testnet';
  const serverUrl = network === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
  return new Horizon.Server(serverUrl);
};

export class X402PaymentBuilder {
  /**
   * Build an unsigned x402 payment transaction
   * This transaction can be passed to a client for signing
   */
  static async buildUnsignedTransaction(input: X402PaymentInput): Promise<string> {
    const { sourcePublicKey, destinationAddress, amount, price } = input;
    
    try {
      const server = getServer();
      const sourceAccount = await server.loadAccount(sourcePublicKey);

      // Build a standard Stellar payment transaction for x402
      // x402 works with any standard Stellar transaction
      const builder = new TransactionBuilder(sourceAccount, {
        fee: '10000',
        networkPassphrase: Networks.TESTNET,
      });

      // Add payment operation
      builder.addOperation(
        Operation.payment({
          destination: destinationAddress,
          asset: Asset.native(),
          amount: amount, // In XLM
        })
      );

      // Add memo with x402 price info
      builder.addMemo(Memo.text(`x402:${price}`));

      const tx = builder.setTimeout(300).build();
      return tx.toXDR();
    } catch (error: any) {
      logger.error(`Failed to build x402 transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sign a transaction XDR with a Stellar keypair
   * Returns base64-encoded signature data for x402 header
   */
  static signTransaction(xdr: string, secretKey: string): X402SignatureData {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);

      // Sign the transaction
      transaction.sign(keypair);

      // Get the signed XDR
      const signedXdr = transaction.toXDR();
      
      const signatureData: X402SignatureData = {
        transaction: signedXdr,
        signed: true,
        publicKey: keypair.publicKey(),
        timestamp: new Date().toISOString(),
      };

      return signatureData;
    } catch (error: any) {
      logger.error(`Failed to sign x402 transaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create the Payment-Signature header value
   * Base64-encoded JSON of signature data
   */
  static createPaymentSignatureHeader(signatureData: X402SignatureData): string {
    const encoded = Buffer.from(JSON.stringify(signatureData)).toString('base64');
    return encoded;
  }

  /**
   * Parse Payment-Response header from server
   */
  static parsePaymentResponse(headerValue: string): any {
    try {
      const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error: any) {
      logger.error(`Failed to parse payment response header: ${error.message}`);
      throw error;
    }
  }

  /**
   * Full flow: build, sign, and create header
   */
  static async buildAndSign(
    input: X402PaymentInput,
    secretKey: string
  ): Promise<string> {
    // Build the transaction
    const unsignedXdr = await this.buildUnsignedTransaction(input);

    // Sign it
    const signatureData = this.signTransaction(unsignedXdr, secretKey);

    // Create the header
    return this.createPaymentSignatureHeader(signatureData);
  }
}
