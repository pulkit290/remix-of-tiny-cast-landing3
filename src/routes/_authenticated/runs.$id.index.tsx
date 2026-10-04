import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Square } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cancelRun } from "@/lib/runs.functions";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/runs/$id/")({
  head: () => ({ meta: [{ title: "Run — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: RunPage,
});

function RunPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [sel, setSel] = useState<string | null>(null);
  const key = ["run", id];
  const cancel = useServerFn(cancelRun);
  const [cancelling, setCancelling] = useState(false);

  const { data: run, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("test_runs")
        .select("*, test_scenarios(id, name), agent_runs(*, test_agents(name, role, goal), agent_actions(*)), test_issues(*)")
        .eq("id", id).single();
      if (error) throw error;
      return data;
    },
    // Fallback in case live updates are delayed: re-check every 3s while the run is still going.
    refetchInterval: (q) => (["queued", "starting", "running"].includes(q.state.data?.status ?? "queued") ? 3000 : false),
  });

  useEffect(() => {
    const ch = supabase.channel(`run-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "test_runs", filter: `id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: key }))
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_runs", filter: `test_run_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: key }))
      .on("postgres_changes", { event: "*", schema: "public", table: "test_issues", filter: `test_run_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: key }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_actions" }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) return <p className="font-mono text-xs text-muted-foreground">Loading…</p>;
  if (!run) return <p>Run not found.</p>;

  const agents = run.agent_runs;
  const all = agents.flatMap((a) => a.agent_actions.map((x) => ({ ...x, agent: a.test_agents?.name ?? "Agent", agentRunId: a.id })))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const shown = sel ? all.filter((a) => a.agentRunId === sel) : all;

  return (
    <div className="mx-auto max-w-6xl">
      {run.test_scenarios && <Link to="/tests/$id" params={{ id: run.test_scenarios.id }} className="font-mono text-xs text-muted-foreground hover:text-foreground">← {run.test_scenarios.name}</Link>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl">Run {run.id.slice(0, 8)}</h1>
          <StatusBadge status={run.status} />
        </div>
        <div className="flex gap-2">
          {["queued", "starting", "running"].includes(run.status) && (
            <Button variant="outline" size="sm" disabled={cancelling} onClick={async () => {
              if (!confirm("Stop this run? Browsers will close after their current step.")) return;
              setCancelling(true);
              try {
                const r = await cancel({ data: { runId: id } });
                toast.success(r.workerNotified ? "Run cancelled" : "Run marked cancelled (worker could not be notified)");
                qc.invalidateQueries({ queryKey: key });
              } catch (e) { toast.error(e instanceof Error ? e.message : "Could not cancel"); }
              finally { setCancelling(false); }
            }}><Square className="h-4 w-4" /> {cancelling ? "Cancelling…" : "Cancel run"}</Button>
          )}
          {!["queued", "starting", "running"].includes(run.status) && (
            <Button size="sm" asChild><Link to="/runs/$id/report" params={{ id }}><FileText className="h-4 w-4" /> Report</Link></Button>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-6 font-mono text-[11px] text-muted-foreground">
        <span>created {new Date(run.created_at).toLocaleString()}</span>
        {run.started_at && <span>started {new Date(run.started_at).toLocaleTimeString()}</span>}
        {run.completed_at && <span>ended {new Date(run.completed_at).toLocaleTimeString()}</span>}
        <span>{agents.length} users</span><span>{all.length} actions</span>
        {run.duration_ms != null && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
      </div>

      {run.failure_reason && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div>{run.failure_reason}</div>
            {run.failure_reason.startsWith("Browser worker") && (
              <p className="mt-1 text-xs text-muted-foreground">Connect a browser worker in <Link to="/settings" className="underline">Settings</Link> to run real browser sessions.</p>
            )}
          </div>
        </div>
      )}
      {run.summary && <div className="mt-6 rounded-xl border bg-card p-4 text-sm">{run.summary}</div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          <button onClick={() => setSel(null)} className={cn("w-full rounded-lg border p-3 text-left text-sm", !sel && "border-primary/50 bg-secondary")}>All users</button>
          {agents.map((a) => (
            <button key={a.id} onClick={() => setSel(a.id)} className={cn("w-full rounded-lg border bg-card p-3 text-left", sel === a.id && "border-primary/50")}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{a.test_agents?.name}</span><StatusBadge status={a.status} />
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{a.test_agents?.role}</div>
              {a.current_url && <div className="mt-2 truncate font-mono text-[11px] text-accent">{a.current_url}</div>}
              {a.current_action && <div className="mt-1 truncate text-xs text-muted-foreground">{a.current_action}</div>}
            </button>
          ))}
        </div>

        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3 font-mono text-[11px] uppercase text-muted-foreground">Timeline</div>
          {shown.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {["queued", "starting", "running"].includes(run.status) ? "Waiting for the browser worker to report actions…" : "No actions were recorded."}
            </p>
          ) : (
            <ol className="divide-y">
              {shown.map((a) => (
                <li key={a.id} className="grid grid-cols-[90px_110px_1fr] gap-3 px-4 py-3 text-sm">
                  <span className="font-mono text-[11px] text-muted-foreground">{new Date(a.timestamp).toLocaleTimeString()}</span>
                  <span className="truncate font-mono text-[11px] text-primary">{a.agent} · {a.action_type}</span>
                  <div>
                    <div>{a.description}</div>
                    {a.target && <div className="font-mono text-[11px] text-muted-foreground">{a.target}</div>}
                    {a.result && <div className="mt-1 text-xs text-muted-foreground">→ {a.result}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {run.test_issues.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-medium text-muted-foreground">Issues found</h2>
          <div className="mt-3 space-y-2">
            {run.test_issues.map((i) => (
              <div key={i.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2"><span className="font-mono text-[10px] uppercase text-warning">{i.severity}</span><span className="text-sm font-medium">{i.title}</span></div>
                {i.description && <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
