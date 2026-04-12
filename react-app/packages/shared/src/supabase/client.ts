// Supabase client factory — single client for both auth and data
// Supabase Auth handles login/signup/sessions natively.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
): TypedSupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}
