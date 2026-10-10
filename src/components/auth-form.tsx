import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function google() {
    setBusy(true);
    // Uses the project's own Google OAuth credentials, so it works on any host (Lovable or Vercel).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setBusy(false); toast.error(error.message ?? "Google sign-in failed"); return; }
    // Browser is redirected to Google; on return the session is picked up from the URL.
    void navigate;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-10 flex justify-center"><Logo /></Link>
        <div className="rounded-xl border bg-card p-6">
          <h1 className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Welcome back." : "Start testing multi-user workflows."}
          </p>
          <Button className="mt-6 w-full" onClick={google} disabled={busy} type="button">
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">Poolabs uses Google sign-in only.</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? <>No account? <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">Sign up</Link></>
            : <>Have an account? <Link to="/login" className="text-foreground underline-offset-4 hover:underline">Sign in</Link></>}
        </p>
      </div>
    </div>
  );
}
