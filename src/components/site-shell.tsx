import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  const l = "hover:underline underline-offset-4";
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-6 text-center font-mono text-[11px] uppercase text-ink">
      <span>© Poolabs</span>
      <Link to="/about" className={l}>About</Link>
      <Link to="/pricing" className={l}>Pricing</Link>
      <Link to="/security" className={l}>Security</Link>
      <Link to="/contact" className={l}>Contact</Link>
      <Link to="/privacy" className={l}>Privacy</Link>
      <Link to="/terms" className={l}>Terms</Link>
      <Link to="/cookies" className={l}>Cookies</Link>
      <Link to="/login" className={l}>Sign in</Link>
    </footer>
  );
}

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-sun p-3 md:p-6">
      <div className="overflow-hidden rounded-[2rem] bg-ink text-paper">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/"><Logo /></Link>
          <Link to="/login" className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground">Sign in</Link>
        </header>
        <div className="mx-2 mt-8 rounded-t-[2rem] border-t-[10px] border-accent bg-paper px-6 pb-20 pt-12 text-ink md:mx-10">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-6xl">{title}</h1>
            <div className="mt-6 space-y-4 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:text-3xl [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
