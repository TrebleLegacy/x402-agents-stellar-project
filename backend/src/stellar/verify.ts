/**
 * Stellar Verification & Validation
 */

export class StellarVerify {
  static isValidPublicKey(key: string): boolean {
    return /^G[A-Z2-7]{55}$/.test(key);
  }

  static isValidSecretKey(key: string): boolean {
    return /^S[A-Z2-7]{55}$/.test(key);
  }

  static isValidAddress(address: string): boolean {
    return this.isValidPublicKey(address);
  }

  static extractPublicKeyFromAddress(addressOrKey: string): string | null {
    if (this.isValidPublicKey(addressOrKey)) {
      return addressOrKey;
    }
    return null;
  }

  static extractSecretKey(text: string): string | undefined {
    const regex = /\bS[A-Z2-7]{55}\b/;
    const match = text.match(regex);
    return match ? match[0] : undefined;
  }

  static sanitizeSecretKey(text: string): string {
    return text.replace(/\bS[A-Z2-7]{55}\b/g, '[REDACTED_SECRET_KEY]');
  }

  static isValidAmount(amount: string): boolean {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  }
}
