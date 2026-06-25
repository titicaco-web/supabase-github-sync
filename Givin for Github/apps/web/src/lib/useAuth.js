import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Tiny auth hook: tracks the Supabase session.
export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    loading: session === undefined,
    user: session?.user ?? null,
    signInWithLinkedIn: () =>
      supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: { redirectTo: window.location.origin + "/app" },
      }),
    signOut: () => supabase.auth.signOut(),
  };
}
