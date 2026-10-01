import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (!data.session) { toast.success("Check your email to confirm your account."); return; }
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/dashboard" });
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error(r.error.message ?? "Google sign-in failed"); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
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
          <Button variant="outline" className="mt-6 w-full" onClick={google} type="button">Continue with Google</Button>
          <div className="my-5 flex items-center gap-3 font-mono text-[10px] uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button className="w-full" disabled={busy}>{busy ? "…" : mode === "login" ? "Sign in" : "Create account"}</Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? <>No account? <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">Sign up</Link></>
            : <>Have an account? <Link to="/login" className="text-foreground underline-offset-4 hover:underline">Sign in</Link></>}
        </p>
      </div>
    </div>
  );
}
