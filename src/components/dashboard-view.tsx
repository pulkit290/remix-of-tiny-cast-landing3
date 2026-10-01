import { useEffect } from "react";
import type React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, Bug, FlaskConical, FolderKanban, PlugZap, Plus, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { workerStatus } from "@/lib/runs.functions";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge, timeAgo } from "@/components/status-badge";
import { NewProjectDialog, ProjectsView } from "@/components/projects-view";

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

function WorkerStrip() {
  const check = useServerFn(workerStatus);
  const { data, isLoading } = useQuery({ queryKey: ["worker-status"], queryFn: () => check(), staleTime: 60_000 });
  const ok = data?.reachable;
  return (
    <div className="flex items-center gap-2 w-fit rounded-full border px-3 py-1 font-mono text-[11px] uppercase">
      <span className={`h-2 w-2 rounded-full ${isLoading ? "bg-muted-foreground" : ok ? "bg-primary animate-pulse" : "bg-warning"}`} />
      {isLoading ? "Checking worker" : ok ? "Worker online" : data?.configured ? "Worker unreachable" : "Worker not configured"}
    </div>
  );
}

function WorkerNotice() {
  const check = useServerFn(workerStatus);
  const { data, isLoading } = useQuery({ queryKey: ["worker-status"], queryFn: () => check(), staleTime: 60_000 });
  if (isLoading || data?.reachable) return null;
  return (
    <div className="reveal flex items-start gap-3 border-l-2 border-warning pl-4 text-sm">
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

  const empty = !isLoading && data && data.counts.projects === 0;
  const name = user?.email?.split("@")[0];
  const stats = [
    ["Projects", data?.counts.projects, FolderKanban, "/projects"],
    ["Casts", data?.counts.casts, FlaskConical, "/tests"],
    ["Runs", data?.counts.runs, Radio, "/runs"],
    ["Open issues", data?.counts.issues, Bug, "/runs"],
  ] as const;

  const dot = (s: string) => s === "passed" ? "bg-primary" : s === "cancelled" ? "bg-muted-foreground" : "bg-destructive";
  const Head = ({ children, to }: { children: React.ReactNode; to?: "/runs" | "/tests" }) => (
    <div className="flex items-baseline justify-between border-b pb-3">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{children}</h2>
      {to && <Link to={to} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">View all <ArrowRight className="h-3 w-3" /></Link>}
    </div>
  );

  return (
    <div className="space-y-16">
      <header className="reveal flex flex-wrap items-end justify-between gap-6">
        <div>
          <WorkerStrip />
          <h1 className="mt-5 text-6xl leading-none md:text-7xl">Hi{name ? `, ${name}` : ""}</h1>
          <p className="mt-3 max-w-md text-muted-foreground">Everything your AI users have done across your projects, live from the database.</p>
        </div>
        <div className="flex items-center gap-3">
          <NewProjectDialog />
          <Link to="/tests/new" className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> New cast
          </Link>
        </div>
      </header>

      <WorkerNotice />

      {error && <p className="border-l-2 border-destructive pl-4 text-sm text-destructive">Could not load your data: {error.message}</p>}

      {empty ? (
        <section className="reveal">
          <Head>Get your first run going</Head>
          <ol className="mt-2 divide-y">
            {[
              ["01", "Add a project", "The URL of the app you want tested."],
              ["02", "Create a cast", "Two or more AI users, each with a role and goal."],
              ["03", "Press Run", "Watch each browser act live and review the report."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex items-baseline gap-8 py-6">
                <span className="font-display text-4xl text-primary">{n}</span>
                <div><p className="text-lg font-semibold">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <>
          <section className="reveal reveal-1 grid gap-10 border-y py-10 md:grid-cols-[1.3fr_repeat(4,1fr)] md:gap-0 md:divide-x">
            <div className="md:pr-10">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Pass rate</div>
              <div className="mt-3 font-display text-7xl leading-none text-primary">
                {isLoading ? <span className="inline-block h-16 w-28 animate-pulse rounded bg-muted" /> : data?.passRate == null ? "—" : `${data.passRate}%`}
              </div>
              <div className="mt-5 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-700" style={{ width: `${data?.passRate ?? 0}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{data?.passRate == null ? "No finished runs yet." : `Across the last ${data.finished} finished runs.`}</p>
            </div>
            {stats.map(([label, value, , to]) => (
              <Link key={label} to={to} className="group flex flex-col justify-between md:px-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground">{label}</div>
                <div className="mt-3 flex items-end justify-between font-display text-5xl leading-none">
                  {isLoading ? <span className="inline-block h-11 w-10 animate-pulse rounded bg-muted" /> : value}
                  <ArrowRight className="mb-1 h-4 w-4 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </section>

          {!!data?.active.length && (
            <section className="reveal">
              <div className="flex items-center gap-2 border-b border-accent/40 pb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> {data.active.length} running now
              </div>
              <div className="divide-y">
                {data.active.map((r) => (
                  <Link key={r.id} to="/runs/$id" params={{ id: r.id }} className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-primary">
                    <span className="truncate font-medium">{r.test_scenarios?.name ?? "Cast"}</span>
                    <span className="flex items-center gap-4"><span className="font-mono text-[11px] text-muted-foreground">started {timeAgo(r.created_at)}</span><StatusBadge status={r.status} /></span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-16 lg:grid-cols-[2fr_1fr]">
            <section className="reveal reveal-2">
              <Head to="/runs">Recent runs</Head>
              {isLoading && <p className="py-6 font-mono text-xs text-muted-foreground">Loading…</p>}
              {!isLoading && !data?.recent.length && <p className="py-6 text-sm text-muted-foreground">No finished runs yet. Open a cast and press Run.</p>}
              <div className="divide-y">
                {data?.recent.map((r) => (
                  <Link key={r.id} to="/runs/$id" params={{ id: r.id }} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
                    <span className={`h-2 w-2 rounded-full ${dot(r.status)}`} />
                    <div className="min-w-0">
                      <div className="truncate font-medium transition-colors group-hover:text-primary">{r.test_scenarios?.name ?? "Cast"}</div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {timeAgo(r.created_at)}{r.duration_ms ? ` · ${(r.duration_ms / 1000).toFixed(1)}s` : ""}{r.failure_reason ? ` · ${r.failure_reason}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            </section>

            <div className="reveal reveal-3 space-y-12">
              <section>
                <Head>Open issues</Head>
                {!isLoading && !data?.issues.length && <p className="py-5 text-sm text-muted-foreground">No open issues.</p>}
                <div className="divide-y">
                  {data?.issues.map((i) => (
                    <Link key={i.id} to="/runs/$id" params={{ id: i.test_run_id }} className="group flex items-start gap-3 py-4">
                      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${i.severity === "high" || i.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                      <div className="min-w-0">
                        <div className="truncate text-sm group-hover:text-primary">{i.title}</div>
                        <div className="mt-0.5 font-mono text-[11px] uppercase text-muted-foreground">{i.severity} · {timeAgo(i.created_at)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
              <section>
                <Head to="/tests">Recent casts</Head>
                {!isLoading && !data?.casts.length && <p className="py-5 text-sm text-muted-foreground">No casts yet.</p>}
                <div className="divide-y">
                  {data?.casts.map((c) => (
                    <Link key={c.id} to="/tests/$id" params={{ id: c.id }} className="group block py-4">
                      <div className="truncate text-sm font-medium group-hover:text-primary">{c.name}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.projects?.name} · {c.test_agents.length} AI users · {timeAgo(c.updated_at)}</div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      <ProjectsView title="Projects" compact />
    </div>
  );
}
