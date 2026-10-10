import { useEffect } from "react";
import type React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, PlugZap, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { workerStatus } from "@/lib/runs.functions";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge, timeAgo } from "@/components/status-badge";
import { NewProjectDialog } from "@/components/projects-view";

const ACTIVE = ["queued", "starting", "running"];

function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [projects, casts, runs, issues, castCount, runCount, issueCount] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("test_scenarios").select("id, name, updated_at, projects(name), test_agents(id)").order("updated_at", { ascending: false }).limit(5),
        supabase.from("test_runs").select("id, status, created_at, completed_at, duration_ms, failure_reason, test_scenarios(id, name)").order("created_at", { ascending: false }).limit(20),
        supabase.from("test_issues").select("id, title, severity, created_at, test_run_id").eq("status", "open").order("created_at", { ascending: false }).limit(5),
        supabase.from("test_scenarios").select("id", { count: "exact", head: true }),
        supabase.from("test_runs").select("id", { count: "exact", head: true }),
        supabase.from("test_issues").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      const err = projects.error ?? casts.error ?? runs.error ?? issues.error;
      if (err) throw err;
      const r = runs.data ?? [];
      const finished = r.filter((x) => x.status === "passed" || x.status === "failed" || x.status === "error");
      const passed = finished.filter((x) => x.status === "passed").length;
      return {
        counts: { projects: projects.count ?? 0, casts: castCount.count ?? 0, runs: runCount.count ?? 0, issues: issueCount.count ?? 0 },
        passRate: finished.length ? Math.round((passed / finished.length) * 100) : null,
        finished: finished.length,
        active: r.filter((x) => ACTIVE.includes(x.status)),
        recent: r.filter((x) => !ACTIVE.includes(x.status)).slice(0, 8),
        casts: casts.data ?? [], issues: issues.data ?? [],
      };
    },
  });
}

function WorkerNotice() {
  const check = useServerFn(workerStatus);
  const { data, isLoading } = useQuery({ queryKey: ["worker-status"], queryFn: () => check(), staleTime: 60_000 });
  if (isLoading || data?.reachable) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-muted-foreground">
        {data?.configured
          ? "The browser worker didn't answer its health check. Runs will fail until it's back."
          : "Runs can't start until the browser worker is deployed and connected. You can still create projects and casts."}
      </p>
    </div>
  );
}

export function DashboardView() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, error } = useDashboard();

  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: ["dashboard"] });
    const ch = supabase.channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "test_runs" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "test_issues" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const name = user?.email?.split("@")[0];
  const empty = !isLoading && data && data.counts.projects === 0;
  const runs = [...(data?.active ?? []), ...(data?.recent ?? [])].slice(0, 6);
  const stats = [
    ["Pass rate", data?.passRate == null ? "—" : `${data.passRate}%`],
    ["Tests run", data?.counts.runs ?? 0],
    ["Open issues", data?.counts.issues ?? 0],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl">Hi{name ? `, ${name}` : ""}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's how your tests are doing.</p>
        </div>
        <div className="flex gap-2">
          <NewProjectDialog />
          <Link to="/tests/new" className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> New test
          </Link>
        </div>
      </header>

      <WorkerNotice />
      {error && <p className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">Could not load your data: {error.message}</p>}

      {empty ? (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">Get started in 3 steps</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {["Add a project — the web address of the app to test.", "Create a test — two or more AI users, each with a goal.", "Press Run and watch the report come in."].map((t, i) => (
              <li key={t} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>{t}</li>
            ))}
          </ol>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-3">
            {stats.map(([k, v]) => (
              <div key={k} className="rounded-2xl border bg-card p-4">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="mt-1 text-3xl font-semibold">{isLoading ? "…" : v}</div>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-semibold">Latest tests</h2>
              <Link to="/runs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">See all <ArrowRight className="h-3 w-3" /></Link>
            </div>
            {!isLoading && runs.length === 0 && <p className="border-t px-5 py-6 text-sm text-muted-foreground">No tests yet. Open a test and press Run.</p>}
            {runs.map((r) => (
              <Link key={r.id} to="/runs/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 border-t px-5 py-3 transition-colors hover:bg-secondary">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.test_scenarios?.name ?? "Test"}</div>
                  <div className="text-xs text-muted-foreground">{timeAgo(r.created_at)}{r.duration_ms ? ` · ${Math.round(r.duration_ms / 1000)}s` : ""}</div>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </section>

          {!!data?.issues.length && (
            <section className="rounded-2xl border bg-card">
              <h2 className="px-5 py-4 font-semibold">Needs attention</h2>
              {data.issues.map((i) => (
                <Link key={i.id} to="/runs/$id" params={{ id: i.test_run_id }} className="flex items-start gap-3 border-t px-5 py-3 transition-colors hover:bg-secondary">
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${i.severity === "high" || i.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                  <div className="min-w-0"><div className="truncate text-sm">{i.title}</div><div className="text-xs text-muted-foreground">{timeAgo(i.created_at)}</div></div>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
