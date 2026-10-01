import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Pencil, Play, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AgentEditor, agentsValid, toAgentRow, type AgentDraft } from "@/components/agent-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startRun } from "@/lib/runs.functions";
import { Button } from "@/components/ui/button";
import { StatusBadge, timeAgo } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/tests/$id")({
  head: () => ({ meta: [{ title: "Test — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: TestPage,
});

function TestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const run = useServerFn(startRun);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ name: string; description: string; agents: AgentDraft[] } | null>(null);
  useEffect(() => {
    const ch = supabase.channel(`scenario-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "test_runs", filter: `scenario_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ["scenario", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);
  const { data: s, isLoading, error: loadError } = useQuery({
    queryKey: ["scenario", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_scenarios")
        .select("*, projects(id, name, app_url), test_agents(*), test_runs(*)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="font-mono text-xs text-muted-foreground">Loading…</p>;
  if (loadError) return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Could not load this cast: {loadError.message}</p>;
  if (!s) return <p>Cast not found.</p>;
  const scenario = s;

  function startEdit() {
    setDraft({ name: scenario.name, description: scenario.description ?? "", agents: scenario.test_agents.map((a) => ({
      id: a.id, name: a.name, role: a.role, goal: a.goal, system_instructions: a.system_instructions ?? "", account_email: a.account_email ?? "" })) });
    setEditing(true);
  }

  async function saveEdit() {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Give the cast a name"); return; }
    if (!agentsValid(draft.agents)) { toast.error("Every AI user needs a name, role and goal"); return; }
    setBusy(true);
    try {
      const { error: e1 } = await supabase.from("test_scenarios").update({ name: draft.name.trim(), description: draft.description.trim() || null, updated_at: new Date().toISOString() }).eq("id", id);
      if (e1) throw e1;
      const keep = new Set(draft.agents.map((a) => a.id).filter(Boolean));
      const removed = scenario.test_agents.filter((a) => !keep.has(a.id)).map((a) => a.id);
      if (removed.length) { const { error } = await supabase.from("test_agents").delete().in("id", removed); if (error) throw error; }
      for (const a of draft.agents.filter((x) => x.id)) {
        const { error } = await supabase.from("test_agents").update(toAgentRow(a, id)).eq("id", a.id!); if (error) throw error;
      }
      const added = draft.agents.filter((x) => !x.id).map((a) => toAgentRow(a, id));
      if (added.length) { const { error } = await supabase.from("test_agents").insert(added); if (error) throw error; }
      await qc.invalidateQueries({ queryKey: ["scenario", id] });
      setEditing(false);
      toast.success("Cast saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save cast");
    } finally { setBusy(false); }
  }

  async function removeCast() {
    if (!confirm("Delete this cast, its AI users and all of its runs and reports?")) return;
    const { error } = await supabase.from("test_scenarios").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cast deleted");
    qc.invalidateQueries();
    navigate(scenario.projects ? { to: "/projects/$id", params: { id: scenario.projects.id } } : { to: "/tests" });
  }

  async function go() {
    setBusy(true);
    try {
      const r = await run({ data: { scenarioId: id } });
      if (!r.started) toast.error(r.reason);
      navigate({ to: "/runs/$id", params: { id: r.runId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start run");
    } finally { setBusy(false); }
  }

  const runs = [...s.test_runs].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="mx-auto max-w-5xl">
      {s.projects && <Link to="/projects/$id" params={{ id: s.projects.id }} className="font-mono text-xs text-muted-foreground hover:text-foreground">← {s.projects.name}</Link>}
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-4xl">{s.name}</h1>
          {s.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{s.description}</p>}
        </div>
        {!editing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={removeCast} aria-label="Delete cast"><Trash2 className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={startEdit}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button onClick={go} disabled={busy || s.test_agents.length === 0}><Play className="h-4 w-4" /> {busy ? "Starting…" : "Run"}</Button>
          </div>
        )}
      </div>

      {editing && draft && (
        <div className="mt-8 space-y-6 rounded-xl border bg-card/50 p-6">
          <div className="space-y-1.5"><Label>Cast name</Label>
            <Input value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>What should happen overall?</Label>
            <Textarea value={draft.description} maxLength={2000} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          <AgentEditor agents={draft.agents} onChange={(agents) => setDraft({ ...draft, agents })} projectId={s.projects?.id ?? ""} description={draft.description} />
          <p className="text-xs text-muted-foreground">Removing a user also removes their history from past runs.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>{busy ? "Saving…" : "Save cast"}</Button>
          </div>
        </div>
      )}

      <div className={`mt-8 grid gap-4 md:grid-cols-2 ${editing ? "hidden" : ""}`}>
        {s.test_agents.map((a, i) => (
          <div key={a.id} className="rounded-xl border bg-card p-5">
            <div className="font-mono text-[11px] uppercase text-primary">Agent {String.fromCharCode(65 + i)} · {a.role}</div>
            <div className="mt-1 font-medium">{a.name}</div>
            <p className="mt-3 text-sm text-muted-foreground">“{a.goal}”</p>
            {a.account_email && <p className="mt-3 font-mono text-[11px] text-muted-foreground">{a.account_email}</p>}
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-medium text-muted-foreground">Runs</h2>
      <div className="mt-3 divide-y rounded-xl border bg-card">
        {runs.length === 0 && <p className="p-6 text-sm text-muted-foreground">No runs yet. Press Run to start a real browser session.</p>}
        {runs.map((r) => (
          <Link key={r.id} to="/runs/$id" params={{ id: r.id }} className="flex items-center justify-between p-4 hover:bg-secondary/40">
            <span className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)} · {timeAgo(r.created_at)}{r.duration_ms ? ` · ${(r.duration_ms / 1000).toFixed(1)}s` : ""}</span>
            <StatusBadge status={r.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
