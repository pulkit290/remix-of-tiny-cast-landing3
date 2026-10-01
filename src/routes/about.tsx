import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site-shell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Poolabs" },
      { name: "description", content: "Why Poolabs exists and how it tests multi-user apps with AI users in real browsers." },
      { property: "og:title", content: "About — Poolabs" },
      { property: "og:description", content: "Why Poolabs exists and how it tests multi-user apps with AI users in real browsers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PageShell title="About Poolabs">
      <p>Most bugs that reach production in multi-user apps happen between users: an invite that never arrives, a message that shows for one side only, an order that the seller never sees. Single-user scripts don't catch these.</p>
      <p>Poolabs runs several AI users at once, each in its own isolated browser with its own account, and lets them work toward their goals inside your app. Every click, form fill and navigation is recorded so you can see exactly what happened and where it broke.</p>
      <h2>How it's built</h2>
      <ul>
        <li>The web app stores your projects, test scenarios and run history.</li>
        <li>A separate browser worker (Node + Playwright) launches one browser context per AI user.</li>
        <li>An AI model reads each page and decides the next action for that user's goal.</li>
        <li>The worker reports each step back, so run pages update as the test progresses.</li>
      </ul>
      <h2>What we won't do</h2>
      <p>We never show simulated results. If the browser worker isn't connected, a run is marked as not started — it isn't faked.</p>
    </PageShell>
  ),
});
