import * as StellarSdk from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';

export interface X402PaymentInput {
  sourcePublicKey: string;
  receiveSigningPublicKey: string;
  destinationAddress: string;
  amount: string;
  assetContract: string;
  price: string;
  assetCode?: string;
  assetIssuer?: string;
}

export interface PaymentSignatureData {
  transaction: string;
  signed: boolean;
  publicKey: string;
  timestamp: number;
}

export interface AgentWallet {
  publicKey: string;
  secretKey: string;
}

/**
 * Deterministically derive an agent wallet from the main wallet public key.
 * Uses SHA-256(domain_separator + pubkey) as the ed25519 seed.
 * Same main wallet → same agent wallet, on any device/browser.
 */
export async function deriveAgentWallet(mainWalletPublicKey: string): Promise<AgentWallet> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`x402-agentpay-v1:${mainWalletPublicKey}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const seed = new Uint8Array(hashBuffer); // 32 bytes
  const kp = StellarSdk.Keypair.fromRawEd25519Seed(Buffer.from(seed));
  return { publicKey: kp.publicKey(), secretKey: kp.secret() };
}

/**
 * Create a TransactionSigner that signs locally with a secret key.
 * No Freighter popup — for autonomous agent payments within budget.
 */
export function agentWalletSigner(secretKey: string) {
  return async (xdr: string, networkPassphrase: string): Promise<string> => {
    const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, networkPassphrase);
    const kp = StellarSdk.Keypair.fromSecret(secretKey);
    tx.sign(kp);
    return tx.toXDR();
  };
}

// ── Horizon URL by network ──────────────────────────────────────
function horizonUrl(network: 'testnet' | 'mainnet'): string {
  return network === 'mainnet'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
}

export class X402PaymentClient {
  private network: 'testnet' | 'mainnet';
  // Local sequence cache: avoids re-fetching from Horizon on every TX
  private sequenceCache: Map<string, string> = new Map();

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
  }

  getNetworkPassphrase(): string {
    return this.network === 'testnet'
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC;
  }

  /**
   * Fetch the real account sequence from Horizon.
   * Caches locally and increments client-side after each use
   * to avoid stale-sequence errors on rapid payments.
   */
  private async getSequence(publicKey: string): Promise<string> {
    const cached = this.sequenceCache.get(publicKey);
    if (cached) {
      // Increment local cache for the next TX
      const next = (BigInt(cached) + 1n).toString();
      this.sequenceCache.set(publicKey, next);
      return cached;
    }

    // Fetch from Horizon
    const url = `${horizonUrl(this.network)}/accounts/${publicKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Account ${publicKey} not found on ${this.network} (${res.status})`);
    }
    const data = await res.json();
    const seq = data.sequence as string;
    // Cache the next sequence (Horizon returns last-used, TX needs last-used)
    this.sequenceCache.set(publicKey, (BigInt(seq) + 1n).toString());
    return seq;
  }

  /** Reset sequence cache (call after tx_bad_seq error) */
  resetSequenceCache(publicKey?: string): void {
    if (publicKey) {
      this.sequenceCache.delete(publicKey);
    } else {
      this.sequenceCache.clear();
    }
  }

  /**
   * Build an unsigned payment TX with the REAL account sequence from Horizon.
   */
  async buildUnsignedTransaction(props: X402PaymentInput): Promise<string> {
    const { sourcePublicKey, destinationAddress, amount, assetCode, assetIssuer } = props;

    const sequence = await this.getSequence(sourcePublicKey);
    const account = new StellarSdk.Account(sourcePublicKey, sequence);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.getNetworkPassphrase(),
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destinationAddress,
          amount: amount,
          asset: assetCode && assetIssuer
            ? new StellarSdk.Asset(assetCode, assetIssuer)
            : StellarSdk.Asset.native(),
        })
      )
      .setTimeout(60)
      .build();

    return transaction.toXDR();
  }

  signTransaction(xdr: string, secretKey: string): PaymentSignatureData {
    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      xdr,
      this.getNetworkPassphrase()
    );

    transaction.sign(keypair);

    return {
      transaction: transaction.toXDR(),
      signed: true,
      publicKey: keypair.publicKey(),
      timestamp: Date.now(),
    };
  }

  buildAndSign(
    props: X402PaymentInput,
    secretKey: string
  ): Promise<PaymentSignatureData> {
    return this.buildUnsignedTransaction(props).then(unsignedXdr =>
      this.signTransaction(unsignedXdr, secretKey)
    );
  }

  createPaymentSignatureHeader(data: PaymentSignatureData): string {
    const headerData = JSON.stringify(data);
    return btoa(headerData);
  }

  parsePaymentHeader(headerValue: string): PaymentSignatureData {
    const decoded = atob(headerValue);
    return JSON.parse(decoded);
  }

  parsePaymentResponse(headerValue: string): Record<string, unknown> {
    const decoded = atob(headerValue);
    return JSON.parse(decoded);
  }
}
