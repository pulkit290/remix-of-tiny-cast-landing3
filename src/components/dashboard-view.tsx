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

  const dot = (s: string) => s === "passed" ? "bg-success" : s === "cancelled" ? "bg-muted-foreground" : "bg-destructive";
  const Head = ({ children, to, icon: Icon }: { children: React.ReactNode; to?: "/runs" | "/tests"; icon: typeof Radio }) => (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
      <h2 className="flex items-center gap-2.5 font-body text-sm font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary"><Icon className="h-4 w-4" /></span>
        {children}
      </h2>
      {to && <Link to={to} className="press group/v inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">View all <ArrowRight className="h-3 w-3 transition-transform group-hover/v:translate-x-0.5" /></Link>}
    </div>
  );
  const rate = data?.passRate ?? 0;
  const C = 2 * Math.PI * 52;
  const tones = ["text-pop-teal", "text-pop-purple", "text-accent", "text-warning"];

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="reveal panel relative overflow-hidden p-6 sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <WorkerStrip />
            <h1 className="mt-5 truncate text-5xl leading-none sm:text-6xl md:text-7xl">Hi{name ? `, ${name}` : ""}</h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">Everything your AI users have done across your projects, updated live.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NewProjectDialog />
            <Link to="/tests/new" className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-10px_var(--glow)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_var(--glow)]">
              <Plus className="h-4 w-4" /> New cast
            </Link>
          </div>
        </div>
      </header>

      <WorkerNotice />

      {error && <p className="panel border-destructive/40 p-4 text-sm text-destructive">Could not load your data: {error.message}</p>}

      {empty ? (
        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["01", "Add a project", "The URL of the app you want tested."],
            ["02", "Create a cast", "Two or more AI users, each with a role and goal."],
            ["03", "Press Run", "Watch each browser act live and review the report."],
          ].map(([n, t, d], i) => (
            <div key={n} data-reveal style={{ ["--d" as string]: `${i * 0.1}s` }} className="panel lift p-6">
              <span className="font-display text-5xl text-primary">{n}</span>
              <p className="mt-3 text-lg font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div data-reveal className="panel relative flex items-center gap-6 overflow-hidden p-6 sm:col-span-2 lg:col-span-1 lg:row-span-2">
              <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90 sm:h-36 sm:w-36">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--muted)" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C - (C * rate) / 100} className="transition-[stroke-dashoffset] duration-1000 ease-out" />
              </svg>
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Pass rate</div>
                <div className="mt-1 font-display text-6xl leading-none text-primary sm:text-7xl">
                  {isLoading ? <span className="inline-block h-14 w-24 animate-pulse rounded-xl bg-muted" /> : data?.passRate == null ? "—" : `${data.passRate}%`}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{data?.passRate == null ? "No finished runs yet." : `Across the last ${data.finished} finished runs.`}</p>
              </div>
            </div>
            {stats.map(([label, value, Icon, to], i) => (
              <Link key={label} to={to} data-reveal style={{ ["--d" as string]: `${(i + 1) * 0.07}s` }} className="panel lift press group flex items-center justify-between gap-4 p-5 hover:border-primary/40">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-foreground">{label}</div>
                  <div className="mt-2 font-display text-5xl leading-none">
                    {isLoading ? <span className="inline-block h-11 w-12 animate-pulse rounded-xl bg-muted" /> : value}
                  </div>
                </div>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${tones[i]}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </Link>
            ))}
          </section>

          {!!data?.active.length && (
            <section data-reveal className="panel border-accent/40 p-2">
              <div className="flex items-center gap-2 px-4 pt-3 text-xs font-semibold uppercase tracking-widest text-accent">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-70" /><span className="h-2.5 w-2.5 rounded-full bg-accent" /></span>
                {data.active.length} running now
              </div>
              <div className="mt-2 space-y-1">
                {data.active.map((r) => (
                  <Link key={r.id} to="/runs/$id" params={{ id: r.id }} className="flex flex-col gap-2 rounded-2xl px-4 py-3 transition-colors hover:bg-secondary sm:flex-row sm:items-center sm:justify-between">
                    <span className="truncate font-medium">{r.test_scenarios?.name ?? "Cast"}</span>
                    <span className="flex items-center gap-3"><span className="text-xs text-muted-foreground">started {timeAgo(r.created_at)}</span><StatusBadge status={r.status} /></span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.7fr_1fr]">
            <section data-reveal className="panel pb-3">
              <Head to="/runs" icon={Radio}>Recent runs</Head>
              {isLoading && <div className="space-y-2 p-5">{[0, 1, 2].map((k) => <div key={k} className="h-14 animate-pulse rounded-2xl bg-muted" />)}</div>}
              {!isLoading && !data?.recent.length && <p className="px-6 py-8 text-sm text-muted-foreground">No finished runs yet. Open a cast and press Run.</p>}
              <div className="mt-3 space-y-1 px-2 sm:px-3">
                {data?.recent.map((r) => (
                  <Link key={r.id} to="/runs/$id" params={{ id: r.id }} className="press group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-secondary sm:gap-4">
                    <span className={`h-2.5 w-2.5 rounded-full ring-4 ring-background ${dot(r.status)}`} />
                    <div className="min-w-0">
                      <div className="truncate font-medium transition-colors group-hover:text-primary">{r.test_scenarios?.name ?? "Cast"}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {timeAgo(r.created_at)}{r.duration_ms ? ` · ${(r.duration_ms / 1000).toFixed(1)}s` : ""}{r.failure_reason ? ` · ${r.failure_reason}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            </section>

            <div className="space-y-4 sm:space-y-6">
              <section data-reveal style={{ ["--d" as string]: "0.08s" }} className="panel pb-3">
                <Head icon={Bug}>Open issues</Head>
                {!isLoading && !data?.issues.length && <p className="px-6 py-6 text-sm text-muted-foreground">No open issues. Nice.</p>}
                <div className="mt-3 space-y-1 px-2 sm:px-3">
                  {data?.issues.map((i) => (
                    <Link key={i.id} to="/runs/$id" params={{ id: i.test_run_id }} className="group flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-secondary">
                      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${i.severity === "high" || i.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                      <div className="min-w-0">
                        <div className="truncate text-sm group-hover:text-primary">{i.title}</div>
                        <div className="mt-0.5 text-xs capitalize text-muted-foreground">{i.severity} · {timeAgo(i.created_at)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
              <section data-reveal style={{ ["--d" as string]: "0.16s" }} className="panel pb-3">
                <Head to="/tests" icon={FlaskConical}>Recent casts</Head>
                {!isLoading && !data?.casts.length && <p className="px-6 py-6 text-sm text-muted-foreground">No casts yet.</p>}
                <div className="mt-3 space-y-1 px-2 sm:px-3">
                  {data?.casts.map((c) => (
                    <Link key={c.id} to="/tests/$id" params={{ id: c.id }} className="group block rounded-2xl px-3 py-3 transition-colors hover:bg-secondary">
                      <div className="truncate text-sm font-medium group-hover:text-primary">{c.name}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.projects?.name} · {c.test_agents.length} AI users · {timeAgo(c.updated_at)}</div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      <div data-reveal className="pt-4"><ProjectsView title="Projects" compact /></div>
    </div>
  );
}
