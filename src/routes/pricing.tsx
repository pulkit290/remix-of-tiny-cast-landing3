import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site-shell";
import { AuthLink } from "@/components/auth-link";

const desc = "Simple Poolabs pricing: $1 per test run, Pro $9/month with 20 runs, Team $19/month with 60 runs.";

const plans = [
  { name: "Pay as you go", price: "$1", per: "per run", points: ["Unlock one full test report", "Screenshots, timeline and evidence", "Exports and share links", "No subscription"] },
  { name: "Pro", price: "$9", per: "per month", points: ["20 test runs every month", "Up to 5 users", "Full reports, screenshots and exports", "Cancel anytime"], featured: true },
  { name: "Team", price: "$19", per: "per month", points: ["60 test runs every month", "Up to 7 users", "Full reports, screenshots and exports", "Cancel anytime"] },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Poolabs" },
      { name: "description", content: desc },
      { property: "og:title", content: "Pricing — Poolabs" },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <PageShell title="Pricing">
      <p>Run tests for free and see whether they passed. Pay only when you want the full report, screenshots, evidence and exports.</p>
      <div className="not-prose mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className={`lift flex flex-col rounded-3xl border-2 border-ink p-6 ${p.featured ? "bg-primary text-primary-foreground" : "bg-paper"}`}>
            <div className="font-mono text-xs uppercase">{p.name}</div>
            <div className="mt-3 text-5xl font-bold">{p.price}</div>
            <div className="font-mono text-xs uppercase opacity-80">{p.per}</div>
            <ul className="mt-5 flex-1 space-y-2 !list-none !pl-0">
              {p.points.map((x) => <li key={x}>✓ {x}</li>)}
            </ul>
            <AuthLink to="/signup" className="press mt-6 rounded-full bg-ink px-5 py-3 text-center text-xs font-bold uppercase text-paper">Get started</AuthLink>
          </div>
        ))}
      </div>
      <h2>Questions</h2>
      <p><strong>Do unused runs carry over?</strong> Plan runs reset each month. Pay-as-you-go runs never expire.</p>
      <p><strong>How do I pay?</strong> Payments are handled securely by Dodo Payments. You can buy from Settings → Plan & billing, or from any locked report.</p>
    </PageShell>
  );
}
