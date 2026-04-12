// Supabase client factory
// Each platform (web/mobile) passes its own URL + anon key at initialization

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type TypedSupabaseClient = SupabaseClient<Database>;

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken?: string,
): TypedSupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // We manage auth via DynamoDB / our own JWT — disable Supabase's built-in auth
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
  });
}
