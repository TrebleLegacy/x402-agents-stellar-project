/**
 * Forge Wallet — SmartAccountKit wrapper
 *
 * Manages passkey-based smart wallet on Stellar/Soroban.
 * Uses Touch ID / Face ID for all signing operations.
 */

import { SmartAccountKit, IndexedDBStorage } from 'smart-account-kit';

// Testnet contract addresses — OZ official values
// Source: github.com/kalepail/smart-account-kit/demo/.env.example
const TESTNET_CONFIG = {
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ||
    'https://soroban-testnet.stellar.org',
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
    'Test SDF Network ; September 2015',
  accountWasmHash:
    process.env.NEXT_PUBLIC_ACCOUNT_WASM_HASH ||
    '3e51f5b222dec74650f0b33367acb42a41ce497f72639230463070e666abba2c',
  webauthnVerifierAddress:
    process.env.NEXT_PUBLIC_WEBAUTHN_VERIFIER ||
    'CATPTBRWVMH5ZCIKO5HN2F4FMPXVZEXC56RKGHRXCM7EEZGGXK7PICEH',
  nativeTokenContract:
    process.env.NEXT_PUBLIC_NATIVE_CONTRACT ||
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  usdcTokenContract:
    process.env.NEXT_PUBLIC_USDC_CONTRACT || '',
  spendingLimitPolicy:
    process.env.NEXT_PUBLIC_SPENDING_LIMIT_POLICY ||
    'CBYLPYZGLQ6JVY2IQ5P23QLQPR3KAMMKMZLNWG6RUUKJDNYGPLVHK7U4',
  relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL || undefined,
};

export interface WalletState {
  connected: boolean;
  contractId: string | null;
  loading: boolean;
  error: string | null;
}

export interface WalletBalance {
  xlm: string;
  usdc: string;
}

let kitInstance: SmartAccountKit | null = null;

/**
 * Get or create the singleton SmartAccountKit instance.
 * Must be called client-side only (needs IndexedDB).
 */
export function getKit(): SmartAccountKit {
  if (kitInstance) return kitInstance;

  kitInstance = new SmartAccountKit({
    rpcUrl: TESTNET_CONFIG.rpcUrl,
    networkPassphrase: TESTNET_CONFIG.networkPassphrase,
    accountWasmHash: TESTNET_CONFIG.accountWasmHash,
    webauthnVerifierAddress: TESTNET_CONFIG.webauthnVerifierAddress,
    storage: new IndexedDBStorage(),
    rpId: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost',
    rpName: 'Forge',
    ...(TESTNET_CONFIG.relayerUrl
      ? { relayerUrl: TESTNET_CONFIG.relayerUrl }
      : {}),
  });

  return kitInstance;
}

/**
 * Create a new smart wallet secured by a passkey.
 * Triggers biometric prompt (Touch ID / Face ID).
 */
export async function createWallet(
  userName: string
): Promise<{ contractId: string; credentialId: string }> {
  const kit = getKit();

  const result = await kit.createWallet('Forge', userName, {
    autoSubmit: true,
    autoFund: true,
    nativeTokenContract: TESTNET_CONFIG.nativeTokenContract || undefined,
  });

  return {
    contractId: result.contractId,
    credentialId: result.credentialId,
  };
}

/**
 * Connect to an existing wallet.
 * First attempts silent session restore from IndexedDB.
 * If no session, prompts for passkey selection.
 */
export async function connectWallet(options?: {
  prompt?: boolean;
  contractId?: string;
}): Promise<{ contractId: string } | null> {
  const kit = getKit();

  const result = await kit.connectWallet({
    prompt: options?.prompt,
    contractId: options?.contractId,
  });

  if (!result) return null;

  return { contractId: result.contractId };
}

/**
 * Disconnect and clear session.
 */
export async function disconnectWallet(): Promise<void> {
  const kit = getKit();
  await kit.disconnect();
}

/**
 * Get wallet contract ID if connected.
 */
export function getContractId(): string | null {
  const kit = getKit();
  return (kit as any).contractId || null;
}

/**
 * Transfer USDC to a destination address.
 * Triggers passkey signature (biometric).
 */
export async function transferUSDC(
  destination: string,
  amount: number
): Promise<{ success: boolean; hash?: string }> {
  const kit = getKit();
  const usdcContract = TESTNET_CONFIG.usdcTokenContract;

  if (!usdcContract) {
    throw new Error('USDC SAC contract not configured');
  }

  try {
    const result = await kit.transfer(usdcContract, destination, amount);
    return {
      success: true,
      hash: (result as any)?.hash || (result as any)?.txHash,
    };
  } catch (error: any) {
    return { success: false };
  }
}

/**
 * Sign and submit an arbitrary transaction.
 * Used by x402-agent for payment signing.
 */
export async function signAndSubmit(
  transaction: any
): Promise<any> {
  const kit = getKit();
  return kit.signAndSubmit(transaction);
}

/**
 * Get the raw kit instance for advanced operations.
 */
export function getRawKit(): SmartAccountKit {
  return getKit();
}
