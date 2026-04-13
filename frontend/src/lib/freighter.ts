/**
 * Freighter Wallet Integration
 *
 * Thin wrapper around @stellar/freighter-api for wallet connection
 * and transaction signing. Used as the pluggable signer for x402 payments.
 */

import {
  isConnected,
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

/** Connect to Freighter and get the user's public key */
export async function connectFreighter(): Promise<string> {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error(
      'Freighter wallet extension not found. Please install it from freighter.app'
    );
  }

  const result = await getAddress();
  if (result.error) {
    throw new Error(result.error);
  }
  return result.address;
}

/**
 * Sign a transaction XDR using Freighter.
 * This is the TransactionSigner compatible function used by AgentAPIClient.
 *
 * @param xdr - Unsigned transaction XDR (base64)
 * @param networkPassphrase - Stellar network passphrase
 * @returns Signed transaction XDR
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
