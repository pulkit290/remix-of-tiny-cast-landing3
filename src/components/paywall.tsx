import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { createCheckout } from "@/lib/billing.functions";
import { Button } from "@/components/ui/button";

const PLANS = [
  { kind: "payg" as const, name: "One run", price: "$1", note: "Unlock this report" },
  { kind: "pro" as const, name: "Pro", price: "$9/mo", note: "20 runs a month, 3 users" },
  { kind: "team" as const, name: "Team", price: "$19/mo", note: "60 runs a month, 5 users" },
];

export function BuyButtons({ returnPath }: { returnPath: string }) {
  const checkout = useServerFn(createCheckout);
  const m = useMutation({
    mutationFn: (kind: "payg" | "pro" | "team") => checkout({ data: { kind, quantity: 1, returnPath } }),
    onSuccess: (r) => { window.location.href = r.url; },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not open checkout"),
  });
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PLANS.map((p) => (
        <div key={p.kind} className="lift rounded-2xl border bg-card p-4">
          <p className="font-medium">{p.name}</p>
          <p className="mt-1 text-2xl">{p.price}</p>
          <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
          <Button className="mt-3 w-full" size="sm" variant={p.kind === "pro" ? "default" : "outline"} disabled={m.isPending} onClick={() => m.mutate(p.kind)}>
            {m.isPending && m.variables === p.kind ? "Opening…" : "Buy"}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function Paywall({ reason, returnPath }: { reason: string; returnPath: string }) {
  return (
    <div className="mt-6 rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /><h2 className="text-xl">Report locked</h2></div>
      <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
      <div className="mt-5"><BuyButtons returnPath={returnPath} /></div>
      <p className="mt-4 text-xs text-muted-foreground">After paying, come back here and the report opens automatically.</p>
    </div>
  );
}
