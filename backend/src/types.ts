export interface User {
  id: string;
  email: string;
  stellarPublicKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  stellarAddress: string;
  createdAt?: string;
}

export interface Operation {
  id: string;
  userId: string;
  type: 'payment' | 'onboard' | 'balance_check';
  sourceAddress?: string;
  destinationAddress?: string;
  amount?: string;
  transactionHash?: string;
  stellar_transaction_hash?: string;
  status: 'pending' | 'completed' | 'failed';
  context?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  publicKey: string;
  name?: string;
  isDefault: boolean;
  createdAt?: string;
}
