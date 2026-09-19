import type { LoginInput, PatientSignupInput, SafeProfile, UserRole } from "@nfc/contracts";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

import { fetchCurrentProfile } from "../../lib/api";
import { ApiClientError } from "../../lib/api";
import { getSupabaseClient } from "../../lib/supabase";
import { authReducer, initialAuthState } from "./auth-reducer";
import { buildPatientSignupOptions } from "./signup";

interface SignupResult { requiresEmailConfirmation: boolean }
interface AuthContextValue {
  session: Session | null; user: User | null; profile: SafeProfile | null; role: UserRole | null;
  loading: boolean; error: string | null;
  signIn(input: LoginInput): Promise<SafeProfile>;
  signUp(input: PatientSignupInput): Promise<SignupResult>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<SafeProfile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export function friendlySignInError(error:{code?:string|undefined;message?:string|undefined}|null){if(error?.code==="email_not_confirmed"||/email not confirmed/i.test(error?.message??""))return "Confirm your email before signing in.";if(error?.code==="invalid_credentials"||/invalid login credentials/i.test(error?.message??""))return "The email or password is incorrect.";return "Sign in could not be completed. Check your connection and try again.";}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const queryClient = useQueryClient();

  const loadProfile = useCallback(async (session: Session) => {
    const auth = await queryClient.fetchQuery({
      queryKey: ["auth", "me", session.user.id],
      queryFn: () => fetchCurrentProfile(session.access_token),
      staleTime: 60_000,
      retry: (failureCount, error) => !(error instanceof ApiClientError && [401, 403, 404].includes(error.status)) && failureCount < 1,
    });
    dispatch({ type: "AUTHENTICATED", session, profile: auth.profile });
    return auth.profile;
  }, [queryClient]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session) {
        dispatch({ type: "SIGNED_OUT" });
        return;
      }
      if (["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        if(event === "INITIAL_SESSION") dispatch({ type: "LOADING" });
        void loadProfile(session).catch((profileError: unknown) => dispatch({
          type: "ERROR",
          message: profileError instanceof Error ? profileError.message : "Your clinic profile is unavailable.",
        }));
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    role: state.profile?.role ?? null,
    async signIn(input) {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword(input);
      if (error || !data.session) { dispatch({ type: "SIGNED_OUT" }); throw new Error(friendlySignInError(error)); }
      return loadProfile(data.session);
    },
    async signUp(input) {
      const { data, error } = await getSupabaseClient().auth.signUp(buildPatientSignupOptions(input, `${window.location.origin}/`));
      if (error) throw new Error(error.message);
      if (data.session) await loadProfile(data.session);
      return { requiresEmailConfirmation: !data.session };
    },
    async signOut() {
      await getSupabaseClient().auth.signOut();
      queryClient.removeQueries({ queryKey: ["auth"] });
      dispatch({ type: "SIGNED_OUT" });
    },
    async refreshProfile() {
      if (!state.session) throw new Error("Your session is unavailable.");
      await queryClient.invalidateQueries({ queryKey: ["auth", "me", state.session.user.id] });
      return loadProfile(state.session);
    },
  }), [loadProfile, queryClient, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
