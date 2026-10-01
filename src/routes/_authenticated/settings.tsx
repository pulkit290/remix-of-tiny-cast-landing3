import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { workerStatus } from "@/lib/runs.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const check = useServerFn(workerStatus);
  const { data, isLoading } = useQuery({ queryKey: ["worker-status"], queryFn: () => check() });
  const label = isLoading ? "Checking…" : !data?.configured ? "Not configured" : data.reachable ? "Connected" : "Configured but unreachable";
  const tone = data?.reachable ? "text-success" : "text-warning";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-4xl">Settings</h1>
      <section className="rounded-xl border bg-card p-6">
        <h2 className="font-medium">Account</h2>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{user?.email}</p>
      </section>
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Browser worker</h2>
          <span className={`font-mono text-xs ${tone}`}>{label}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Tests run in real browsers on a separate worker service that launches one isolated browser per AI user.
          Until a worker is connected, runs are recorded as not started — nothing is simulated.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The worker code lives in the <span className="font-mono text-foreground">worker/</span> folder of this project. Deploy it, then add its address and shared secret to this app.
        </p>
      </section>
    </div>
  );
}
