import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { RELAY_TARGETS } from "@/lib/auth-relay";

// Receives Google sign-in on the Lovable site and passes it to the site the visitor
// started on. Must not touch the Supabase client, so the sign-in stays in the URL.
export const Route = createFileRoute("/auth/relay")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Poolabs" },
      { name: "description", content: "Finishing your Poolabs sign-in." },
      { property: "og:title", content: "Signing you in — Poolabs" },
      { property: "og:description", content: "Finishing your Poolabs sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Relay,
});

function Relay() {
  useEffect(() => {
    const to = new URLSearchParams(window.location.search).get("to") ?? "";
    const hash = window.location.hash;
    if (RELAY_TARGETS.includes(to)) {
      window.location.replace(`${to}/${hash}`);
    } else {
      window.location.replace(`/${hash}`);
    }
  }, []);
  return <div className="flex min-h-screen items-center justify-center font-mono text-xs text-muted-foreground">Signing you in…</div>;
}
