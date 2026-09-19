import { createClient } from "@supabase/supabase-js";

import { loadWebEnvironment } from "../config/env";

let client: ReturnType<typeof createClient> | undefined;

export function getSupabaseClient() {
  if (!client) {
    const environment = loadWebEnvironment();
    client = createClient(environment.VITE_SUPABASE_URL, environment.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
