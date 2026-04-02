import { Horizon, Keypair, Transaction } from '@stellar/stellar-sdk';

const TESTNET_SERVER = 'https://horizon-testnet.stellar.org';
const MAINNET_SERVER = 'https://horizon.stellar.org';

export class StellarUtil {
  private server: Horizon.Server;
  private network: 'testnet' | 'mainnet';

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
    const serverUrl = network === 'testnet' ? TESTNET_SERVER : MAINNET_SERVER;
    this.server = new Horizon.Server(serverUrl);
  }

  async fundAccountWithFriendbot(publicKey: string): Promise<boolean> {
    try {
      if (this.network !== 'testnet') {
        throw new Error('Friendbot only available on testnet');
      }

      const response = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
      );

      if (!response.ok) {
        throw new Error(`Friendbot error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Friendbot funding error:', error);
      throw error;
    }
  }

  async getBalance(publicKey: string): Promise<string> {
    try {
      const account = await this.server.accounts().accountId(publicKey).call();
      const nativeBalance = account.balances.find(
        (balance) => balance.asset_type === 'native'
      );

      if (!nativeBalance) {
        return '0';
      }

      return nativeBalance.balance;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return '0';
      }
      console.error('Balance fetch error:', error);
      throw error;
    }
  }

  async submitTransaction(transaction: Transaction): Promise<string> {
    try {
      const result = await this.server.submitTransaction(transaction);
      return result.id;
    } catch (error) {
      console.error('Transaction submission error:', error);
      throw error;
    }
  }
}
