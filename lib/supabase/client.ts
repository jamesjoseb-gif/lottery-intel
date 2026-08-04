import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';

let browserClient: SupabaseClient | undefined;
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase public environment variables.');
  }

  browserClient ??= createBrowserClient(url, key);
  return browserClient;
}

/** Reuse a registered session, or create a persistent anonymous auth user for V1. */
export async function getOrCreateUser(): Promise<User> {
  const client = createClient();
  const { data, error } = await client.auth.getUser();
  if (error && !error.message.toLowerCase().includes("session")) throw error;
  if (data.user) return data.user;

  const anonymous = await client.auth.signInAnonymously();
  if (anonymous.error) throw anonymous.error;
  if (!anonymous.data.user) throw new Error("The anonymous session could not be created.");
  return anonymous.data.user;
}
