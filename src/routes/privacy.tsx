import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Poolabs" },
      { name: "description", content: "How Poolabs collects, uses and protects your data." },
      { property: "og:title", content: "Privacy Policy — Poolabs" },
      { property: "og:description", content: "How Poolabs collects, uses and protects your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell title="Privacy Policy">
      <p>This policy explains what Poolabs collects and why. It is a general template and should be reviewed by a legal professional before you rely on it.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your email address and sign-in method.</li>
        <li>Content you create: projects, test scenarios, AI user definitions and run results.</li>
        <li>Messages you send through the contact form.</li>
      </ul>
      <h2>Test credentials</h2>
      <p>Passwords for the apps you test are only used by the browser worker during a run. We do not display them back to you.</p>
      <h2>How we use it</h2>
      <p>To run tests you request, operate and secure the service, and reply to your messages. We do not sell your data.</p>
      <h2>Your rights</h2>
      <p>You can ask us to access, correct or delete your data at any time through the contact page.</p>
    </PageShell>
  ),
});
