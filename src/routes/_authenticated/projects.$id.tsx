import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { NewProjectDialog } from "@/components/projects-view";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge, timeAgo } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({ meta: [{ title: "Project — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: p, isLoading, error: loadError } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, test_scenarios(*, test_agents(id), test_runs(id, status, created_at, duration_ms))")
        .eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="font-mono text-xs text-muted-foreground">Loading…</p>;
  if (loadError) return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Could not load this project: {loadError.message}</p>;
  if (!p) return <p>Project not found.</p>;

  const runs = p.test_scenarios.flatMap((s) => s.test_runs);
  const passed = runs.filter((r) => r.status === "passed").length;
  const done = runs.filter((r) => ["passed", "failed", "error"].includes(r.status)).length;

  async function remove() {
    if (!confirm("Delete this project and all its tests?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Project deleted");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl">{p.name}</h1>
          <a href={p.app_url} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted-foreground hover:text-foreground">{p.app_url}</a>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={remove} aria-label="Delete project"><Trash2 className="h-4 w-4" /></Button>
          <NewProjectDialog key={p.updated_at} project={p} trigger={<Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Edit</Button>} />
          <Button size="sm" asChild><Link to="/tests/new" search={{ projectId: id }}><Plus className="h-4 w-4" /> New cast</Link></Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {[["Casts", p.test_scenarios.length], ["Runs", runs.length], ["Pass rate", done ? `${Math.round((passed / done) * 100)}%` : "—"]].map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-5">
            <div className="font-mono text-[11px] uppercase text-muted-foreground">{k}</div>
            <div className="mt-2 text-4xl">{v}</div>
          </div>
        ))}
      </div>

      {p.description && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{p.description}</p>}
      <h2 className="mt-10 text-sm font-medium text-muted-foreground">Casts</h2>
      <div className="mt-3 divide-y rounded-xl border bg-card">
        {p.test_scenarios.length === 0 && <p className="p-6 text-sm text-muted-foreground">No casts yet. Create one with two or more AI users.</p>}
        {p.test_scenarios.map((s) => {
          const last = [...s.test_runs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
          return (
            <Link key={s.id} to="/tests/$id" params={{ id: s.id }} className="flex items-center justify-between p-4 hover:bg-secondary/40">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{s.test_agents.length} AI users · {s.test_runs.length} runs · last {timeAgo(last?.created_at)}</div>
              </div>
              <StatusBadge status={last?.status} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
