import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, timeAgo } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/runs/")({
  head: () => ({ meta: [{ title: "Runs — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: Runs,
});

function Runs() {
  const qc = useQueryClient();
  // Live: new runs and status changes appear without a reload.
  useEffect(() => {
    const ch = supabase.channel("runs-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "test_runs" }, () => qc.invalidateQueries({ queryKey: ["runs"] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);
  const { data, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_runs")
        .select("id, status, created_at, duration_ms, test_scenarios(name)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => (q.state.data?.some((r) => ["queued", "starting", "running"].includes(r.status)) ? 5000 : false),
  });
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-4xl">Runs</h1>
      <div className="mt-8 divide-y rounded-xl border bg-card">
        {isLoading && <p className="p-6 font-mono text-xs text-muted-foreground">Loading…</p>}
        {data?.length === 0 && <p className="p-6 text-sm text-muted-foreground">No runs yet.</p>}
        {data?.map((r) => (
          <Link key={r.id} to="/runs/$id" params={{ id: r.id }} className="flex items-center justify-between p-4 hover:bg-secondary/40">
            <div>
              <div className="text-sm">{r.test_scenarios?.name}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{r.id.slice(0, 8)} · {timeAgo(r.created_at)}</div>
            </div>
            <StatusBadge status={r.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
