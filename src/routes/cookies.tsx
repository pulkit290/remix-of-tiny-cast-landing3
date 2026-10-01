import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site-shell";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Poolabs" },
      { name: "description", content: "How Poolabs uses cookies and browser storage." },
      { property: "og:title", content: "Cookie Policy — Poolabs" },
      { property: "og:description", content: "How Poolabs uses cookies and browser storage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell title="Cookie Policy">
      <p>Poolabs uses only essential browser storage. We do not use advertising or tracking cookies.</p>
      <h2>What we store</h2>
      <ul>
        <li>Your sign-in session, so you stay logged in.</li>
        <li>A note that you have seen the cookie notice.</li>
      </ul>
      <h2>Managing storage</h2>
      <p>You can clear this data in your browser settings. You will need to sign in again afterwards.</p>
    </PageShell>
  ),
});
