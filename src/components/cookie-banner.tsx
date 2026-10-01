import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "poolabs-cookie-notice";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!localStorage.getItem(KEY)); }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl bg-paper p-4 text-sm text-ink shadow-[4px_4px_0_var(--ink)] ring-2 ring-ink">
      <p className="min-w-0 flex-1">
        We only use essential storage to keep you signed in. See our <Link to="/cookies" className="underline">cookie policy</Link>.
      </p>
      <button
        onClick={() => { localStorage.setItem(KEY, "1"); setShow(false); }}
        className="rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase text-primary-foreground"
      >
        Got it
      </button>
    </div>
  );
}
