import type { SafeProfile } from "@nfc/contracts";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthState { session: Session | null; user: User | null; profile: SafeProfile | null; loading: boolean; error: string | null }
export type AuthAction =
  | { type: "LOADING" }
  | { type: "AUTHENTICATED"; session: Session; profile: SafeProfile }
  | { type: "SIGNED_OUT" }
  | { type: "ERROR"; message: string };

export const initialAuthState: AuthState = { session: null, user: null, profile: null, loading: true, error: null };

export function authReducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOADING": return { ..._state, loading: true, error: null };
    case "AUTHENTICATED": return { session: action.session, user: action.session.user, profile: action.profile, loading: false, error: null };
    case "SIGNED_OUT": return { session: null, user: null, profile: null, loading: false, error: null };
    case "ERROR": return { session: null, user: null, profile: null, loading: false, error: action.message };
  }
}
