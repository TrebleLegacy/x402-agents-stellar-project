import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase configured');
} else {
  console.warn('⚠️  Supabase credentials not configured. Database features will not work.');
  // Create a mock client that won't throw errors but won't do anything
  supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }), exec: () => Promise.resolve({ data: null, error: null }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }), exec: () => Promise.resolve({ data: null, error: null }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }), exec: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }), exec: () => Promise.resolve({ data: null, error: null }) }),
    }),
  } as any;
}

export { supabase };
