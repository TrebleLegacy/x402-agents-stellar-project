import { Buffer } from 'buffer';

const ALGO = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;
const VAULT_KEY = 'forge_vault_data';

/**
 * VaultPayload — what gets encrypted and persisted in localStorage.
 * No secret keys stored — Freighter manages those.
 */
export interface VaultPayload {
  /** Freighter public keys the user has connected */
  connectedWallets: string[];
  /** Currently active wallet public key */
  activeWallet: string | null;
  /** Saved agent configurations / preferences */
  agentPreferences: Record<string, any>;
  /** Session ID history by wallet pubkey */
  sessionHistory: Record<string, string>;
}

export class VaultManager {
  private static bufferToBase64(buf: ArrayBuffer): string {
    return Buffer.from(buf).toString('base64');
  }

  private static base64ToBuffer(b64: string): ArrayBuffer {
    return Uint8Array.from(Buffer.from(b64, 'base64')).buffer;
  }

  /**
   * Derive an AES-GCM 256-bit key from a password + salt via PBKDF2.
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: ALGO, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /** Check if a vault exists in localStorage */
  public static hasVault(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(VAULT_KEY);
  }

  /** Encrypt and save the vault payload with the master password */
  public static async encryptAndSave(password: string, data: VaultPayload): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const enc = new TextEncoder();
    const encodedData = enc.encode(JSON.stringify(data));

    const encryptedContent = await crypto.subtle.encrypt(
      { name: ALGO, iv: iv },
      key,
      encodedData
    );

    const saltB64 = this.bufferToBase64(salt.buffer);
    const ivB64 = this.bufferToBase64(iv.buffer);
    const contentB64 = this.bufferToBase64(encryptedContent);

    localStorage.setItem(VAULT_KEY, `${saltB64}:${ivB64}:${contentB64}`);
  }

  /** Decrypt the vault with the master password. Throws on wrong password. */
  public static async decryptVault(password: string): Promise<VaultPayload> {
    const payload = localStorage.getItem(VAULT_KEY);
    if (!payload) throw new Error('No vault found on this device.');

    const parts = payload.split(':');
    if (parts.length !== 3) throw new Error('Vault corrupted or invalid format.');

    const [saltB64, ivB64, contentB64] = parts;
    const salt = new Uint8Array(this.base64ToBuffer(saltB64));
    const iv = new Uint8Array(this.base64ToBuffer(ivB64));
    const encryptedData = this.base64ToBuffer(contentB64);

    const key = await this.deriveKey(password, salt);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: ALGO, iv: iv },
        key,
        encryptedData
      );

      const dec = new TextDecoder();
      const rawText = dec.decode(decryptedBuffer);
      return JSON.parse(rawText) as VaultPayload;
    } catch {
      throw new Error('Incorrect password.');
    }
  }

  /** Permanently wipe the vault from localStorage */
  public static wipeVault(): void {
    localStorage.removeItem(VAULT_KEY);
  }

  /** Create an empty vault payload */
  public static createEmpty(): VaultPayload {
    return {
      connectedWallets: [],
      activeWallet: null,
      agentPreferences: {},
      sessionHistory: {},
    };
  }
}
