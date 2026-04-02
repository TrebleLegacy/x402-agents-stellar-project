import { supabase } from '../config/supabase';
import { Wallet } from '../types';

export class WalletRepository {
  async getWalletsByUser(userId: string): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('userId', userId);

    if (error) throw error;
    return data || [];
  }

  async getDefaultWallet(userId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('userId', userId)
      .eq('isDefault', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async createWallet(wallet: Omit<Wallet, 'id' | 'createdAt'>): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .insert([wallet])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWallet(id: string, update: Partial<Wallet>): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteWallet(id: string): Promise<void> {
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
