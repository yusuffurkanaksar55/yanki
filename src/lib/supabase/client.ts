import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readPublicEnvironment } from "../../config/environment";
import type { Database } from "../../types/supabase";

let cachedClient: SupabaseClient<Database> | null = null;

export function getBrowserSupabaseClient(): SupabaseClient<Database> {
  if (!cachedClient) {
    const environment = readPublicEnvironment();

    cachedClient = createClient<Database>(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      }
    );
  }

  return cachedClient;
}
