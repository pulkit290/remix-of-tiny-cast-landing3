import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site-shell";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Poolabs" },
      { name: "description", content: "How Poolabs protects your account, test data and test credentials." },
      { property: "og:title", content: "Security — Poolabs" },
      { property: "og:description", content: "How Poolabs protects your account, test data and test credentials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell title="Security">
      <h2>Data isolation</h2>
      <p>Every project, test and run is tied to your account. Database row-level security ensures you can only read your own data.</p>
      <h2>Run records are server-written</h2>
      <p>Agent actions, run status and issues can only be written by the server after the browser worker authenticates with a shared secret. Users can read them but cannot edit them.</p>
      <h2>Test account passwords</h2>
      <p>Poolabs stores only the email of each test account. Passwords stay on the browser worker you deploy and are never saved in our database.</p>
      <h2>Isolated browsers</h2>
      <p>Each AI user gets a fresh browser context — separate cookies, storage and session — which is discarded when the run ends.</p>
      <h2>Responsible use</h2>
      <p>Only test applications you own or are authorized to test. See our <Link to="/terms" className="underline">Terms</Link>.</p>
      <h2>Reporting a vulnerability</h2>
      <p>Found an issue? Tell us through the <Link to="/contact" className="underline">contact form</Link> with "Security" in your message.</p>
    </PageShell>
  ),
});
