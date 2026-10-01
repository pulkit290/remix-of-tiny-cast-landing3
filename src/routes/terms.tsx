import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Poolabs" },
      { name: "description", content: "The terms for using Poolabs." },
      { property: "og:title", content: "Terms of Service — Poolabs" },
      { property: "og:description", content: "The terms for using Poolabs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell title="Terms of Service">
      <p>By using Poolabs you agree to these terms. This is a general template and should be reviewed by a legal professional.</p>
      <h2>Acceptable use</h2>
      <p>Only test applications you own or have written permission to test. Do not use Poolabs to attack, overload or access systems without authorisation.</p>
      <h2>Your account</h2>
      <p>You are responsible for activity under your account and for keeping your sign-in details secure.</p>
      <h2>Test results</h2>
      <p>Results come from AI users acting in real browsers and may be incomplete or wrong. Verify important findings yourself.</p>
      <h2>Changes</h2>
      <p>We may update these terms and the service. Continued use means you accept the changes.</p>
    </PageShell>
  ),
});
