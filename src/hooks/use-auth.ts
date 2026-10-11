import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Relies on onAuthStateChange only: INITIAL_SESSION fires after the stored session
// has been recovered (and refreshed if expired), so we never redirect on a half-loaded state.
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    // Renew the sign-in when the tab comes back after a long time away.
    const onVisible = () => {
      if (document.visibilityState === "visible") void supabase.auth.getSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}
