/**
 * Freighter Wallet Integration (v6.x)
 *
 * Thin wrapper around @stellar/freighter-api for wallet connection
 * and transaction signing. Used as the pluggable signer for x402 payments.
 */

import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';

/** Check if Freighter extension is installed and available */
export async function isFreighterAvailable(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Connect to Freighter and get the user's public key.
 * Uses requestAccess() which prompts the user to authorize the app
 * on first use, and returns the key immediately on subsequent uses.
 */
export async function connectFreighter(): Promise<string> {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error(
      'Freighter wallet extension not found. Please install it from freighter.app'
    );
  }

  // requestAccess prompts the Freighter popup for authorization
  const result = await requestAccess();

  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.address) {
    throw new Error('No address returned from Freighter. User may have denied access.');
  }

  return result.address;
}

/**
 * Get the currently connected address without prompting.
 * Returns null if not previously authorized.
 */
export async function getFreighterAddress(): Promise<string | null> {
  try {
    const result = await getAddress();
    return result.address || null;
  } catch {
    return null;
  }
}

/**
 * Sign a transaction XDR using Freighter.
 * This is the TransactionSigner compatible function used by AgentAPIClient.
 */
export async function freighterSigner(
  xdr: string,
  networkPassphrase: string
): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase,
  });

  if (result.error) {
    throw new Error(`Freighter signing failed: ${result.error}`);
  }

  return result.signedTxXdr;
}
