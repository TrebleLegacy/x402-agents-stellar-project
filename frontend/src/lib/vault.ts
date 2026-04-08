import { Buffer } from 'buffer';

const ALGO = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;
const VAULT_KEY = 'forge_vault_data';

export interface WalletIdentity {
  alias: string;
  publicKey: string;
  secretKey: string;
}

export interface VaultPayload {
  wallets: WalletIdentity[];
  apiKeys: Record<string, string>;
  agentData?: Record<string, any>;
}

export class VaultManager {
  /**
   * Helper: Converters
   */
  private static bufferToBase64(buf: ArrayBuffer): string {
    return Buffer.from(buf).toString('base64');
  }

  private static base64ToBuffer(b64: string): ArrayBuffer {
    return Uint8Array.from(Buffer.from(b64, 'base64')).buffer;
  }

  /**
   * Deriva uma chave AES-GCM 256-bit a partir de uma senha e um salt usando PBKDF2.
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
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: ALGO, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Checa se existe um cofre registrado localmente.
   */
  public static hasVault(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(VAULT_KEY);
  }

  /**
   * Escreve o banco de dados inteiro no Cofre criptografado com a senha mestre.
   */
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

    // Estrutura de armazenamento: base64(salt) + ':' + base64(iv) + ':' + base64(encrypted)
    const saltB64 = this.bufferToBase64(salt.buffer);
    const ivB64 = this.bufferToBase64(iv.buffer);
    const contentB64 = this.bufferToBase64(encryptedContent);

    const finalBlob = `${saltB64}:${ivB64}:${contentB64}`;
    localStorage.setItem(VAULT_KEY, finalBlob);
  }

  /**
   * Tenta destrancar o cofre com a senha. Retorna o Payload se sucesso, ou lança um erro.
   */
  public static async decryptVault(password: string): Promise<VaultPayload> {
    const payload = localStorage.getItem(VAULT_KEY);
    if (!payload) throw new Error('Nenhum cofre encontrado no dispositivo.');

    const parts = payload.split(':');
    if (parts.length !== 3) throw new Error('Cofre corrompido ou formato inválido.');

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
    } catch (e) {
      throw new Error('Senha incorreta.');
    }
  }

  /**
   * Apaga o cofre permanentemente.
   */
  public static wipeVault(): void {
    localStorage.removeItem(VAULT_KEY);
  }
}
