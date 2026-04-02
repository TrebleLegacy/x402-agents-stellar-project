/**
 * Onboarding/User Service - Business Logic for User Account Creation
 */

import { StellarClient } from '../stellar/client';
import { logger } from '../utils/logger';

export interface OnboardPayload {
  email?: string;
  phoneNumber?: string;
  publicKey?: string;
  secretKey?: string;
}

export class OnboardingService {
  static async createOrImportWallet(payload: OnboardPayload): Promise<{
    publicKey: string;
    secretKey?: string;
    balance?: string;
    isNew: boolean;
  }> {
    logger.info('Processing wallet creation/import');

    // If secret key provided, import existing wallet
    if (payload.secretKey) {
      const keypair = require('@stellar/stellar-sdk').Keypair.fromSecret(payload.secretKey);
      const publicKey = keypair.publicKey();
      return {
        publicKey,
        secretKey: payload.secretKey,
        isNew: false,
      };
    }

    // If public key provided, link existing account
    if (payload.publicKey) {
      return {
        publicKey: payload.publicKey,
        isNew: false,
      };
    }

    // Create new test account
    const { publicKey, secret } = await StellarClient.createTestAccount();
    const balance = await StellarClient.getBalance(publicKey);

    logger.info(`New wallet created: ${publicKey} with balance ${balance} XLM`);

    return {
      publicKey,
      secretKey: secret,
      balance,
      isNew: true,
    };
  }
}
