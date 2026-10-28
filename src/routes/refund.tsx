import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site-shell";

const D = "How refunds work for Poolabs runs and subscriptions.";
export const Route = createFileRoute("/refund")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.poolabs.in/refund" }],
    meta: [
      { property: "og:url", content: "https://www.poolabs.in/refund" },
      { title: "Refund Policy — Poolabs" },
      { name: "description", content: D },
      { property: "og:title", content: "Refund Policy — Poolabs" },
      { property: "og:description", content: D },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://www.poolabs.in/og-image.jpg" },
      { name: "twitter:image", content: "https://www.poolabs.in/og-image.jpg" },
    ],
  }),
  component: () => (
    <PageShell title="Refund Policy">
      <p>This policy explains when you can get your money back. It is a general template and should be reviewed by a legal professional.</p>
      <h2>Single runs ($1)</h2>
      <p>A run is used when you unlock a report. Unused prepaid runs can be refunded within 14 days of purchase. Runs already used to unlock a report are not refundable, unless the report failed because of a problem on our side.</p>
      <h2>Subscriptions (Pro and Team)</h2>
      <p>You can cancel any time; your plan stays active until the end of the period you paid for and won't renew. If you ask within 7 days of a new payment and haven't used any runs from that period, we'll refund it.</p>
      <h2>Failed runs</h2>
      <p>If a run fails because of our service (for example the test browsers were down), tell us and we'll return the run or refund it.</p>
      <h2>How to ask</h2>
      <p>Send a message through the <Link to="/contact" className="underline">contact page</Link> with your account email and the date of the payment. Approved refunds go back to the original payment method, usually within 5–10 business days.</p>
    </PageShell>
  ),
});
