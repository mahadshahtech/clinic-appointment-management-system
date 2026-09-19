import { createClient } from "@supabase/supabase-js";

import { ApiError } from "../http/api-error.js";
import type { TokenVerifier } from "./types.js";

export function createSupabaseTokenVerifier(url: string, publishableKey: string): TokenVerifier {
  const supabase = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  return {
    async verify(accessToken) {
      const { data, error } = await supabase.auth.getClaims(accessToken);
      const claims = data?.claims;
      const subject = claims?.sub;
      if (error || typeof subject !== "string") {
        throw new ApiError(401, "UNAUTHORIZED", "Your session is invalid or has expired.");
      }
      const email = typeof claims?.email === "string" ? claims.email : null;
      return { userId: subject, email };
    },
  };
}
