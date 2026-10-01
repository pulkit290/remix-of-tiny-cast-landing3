import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppLayout,
});

const nav = [
  { to: "/dashboard", label: "Overview" },
  { to: "/projects", label: "Projects" },
  { to: "/tests", label: "Casts" },
  { to: "/runs", label: "Runs" },
] as const;

function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        className="press flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-xs uppercase text-primary-foreground"
      >
        {email[0]}
      </button>
      {open && (
        <div className="reveal absolute right-0 top-11 z-50 w-60 rounded-xl border bg-popover p-1.5 shadow-2xl">
          <div className="px-3 py-2.5">
            <div className="truncate text-sm">{email}</div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Free plan</div>
          </div>
          <div className="my-1 border-t" />
          <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Settings className="h-3.5 w-3.5" /> Settings
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center font-mono text-xs text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-10 px-6 md:px-10">
          <Link to="/dashboard" className="shrink-0"><Logo /></Link>
          <nav className="-mb-px flex h-16 items-stretch gap-7 overflow-x-auto">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center border-b-2 border-transparent text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "!border-primary !text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto"><AccountMenu email={user.email ?? "?"} /></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16"><Outlet /></main>
    </div>
  );
}
