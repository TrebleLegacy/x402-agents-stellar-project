/**
 * Stellar Blockchain Client
 * Low-level interactions with Stellar network
 */

import { Keypair, Operation, Asset, Memo, Networks, TransactionBuilder, Horizon } from '@stellar/stellar-sdk';

interface BuildPaymentInput {
  sourcePublicKey: string;
  destination: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
  memoText?: string;
}

const getServer = (): Horizon.Server => {
  const network = process.env.STELLAR_NETWORK || 'testnet';
  const serverUrl = network === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
  return new Horizon.Server(serverUrl);
};

export class StellarClient {
  static generateKeypair(): { publicKey: string; secret: string } {
    const pair = Keypair.random();
    return {
      publicKey: pair.publicKey(),
      secret: pair.secret(),
    };
  }

  static async createTestAccount(): Promise<{ publicKey: string; secret: string }> {
    const { publicKey, secret } = this.generateKeypair();

    try {
      const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
      if (!response.ok) throw new Error('Failed to fund account using Friendbot.');
      await response.json();
    } catch (e) {
      console.error('Friendbot error:', e);
      throw new Error('Could not connect to Friendbot.');
    }

    return { publicKey, secret };
  }

  static async getAccount(publicKey: string): Promise<any> {
    const server = getServer();
    try {
      return await server.loadAccount(publicKey);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Account ${publicKey} not found on Stellar network.`);
      }
      throw error;
    }
  }

  static async getBalance(publicKey: string): Promise<string> {
    const account = await this.getAccount(publicKey);
    const native = account.balances.find((b: any) => b.asset_type === 'native');
    return native?.balance || '0';
  }

  static async buildPaymentXdr(input: BuildPaymentInput): Promise<string> {
    const { sourcePublicKey, destination, amount, assetCode, assetIssuer, memoText } = input;
    const sourceAccount = await this.getAccount(sourcePublicKey);

    const asset = assetCode && assetIssuer ? new Asset(assetCode, assetIssuer) : Asset.native();

    const balanceLine = sourceAccount.balances.find((b: any) => {
      if (asset.isNative()) return b.asset_type === 'native';
      return b.asset_type !== 'native' && b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer();
    });

    if (!balanceLine || parseFloat(balanceLine.balance) < parseFloat(amount)) {
      throw new Error(`Insufficient balance for ${amount} ${assetCode || 'XLM'}`);
    }

    let builder = new TransactionBuilder(sourceAccount, {
      fee: '10000',
      networkPassphrase: Networks.TESTNET,
    });

    builder = builder.addOperation(
      Operation.payment({ destination, asset, amount })
    );

    if (memoText) {
      builder = builder.addMemo(Memo.text(memoText));
    }

    return builder.setTimeout(300).build().toXDR();
  }

  static async submitTransaction(signedXdr: string): Promise<string> {
    const server = getServer();
    const transaction = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    const result = await server.submitTransaction(transaction);
    return result.hash;
  }

  static signTransaction(xdr: string, secretKey: string): string {
    const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    const keypair = Keypair.fromSecret(secretKey);
    transaction.sign(keypair);
    return transaction.toXDR();
  }

  static async getOperationHistory(publicKey: string, limit: number = 10): Promise<any[]> {
    const server = getServer();
    try {
      const operations = await server.operations()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc')
        .call();
      return operations.records || [];
    } catch (error) {
      console.error('Error fetching operation history:', error);
      return [];
    }
  }
}
