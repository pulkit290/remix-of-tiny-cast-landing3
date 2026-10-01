import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AgentEditor, agentsValid, blankAgent as blank, toAgentRow, type AgentDraft } from "@/components/agent-editor";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/components/projects-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/tests/new")({
  validateSearch: (s) => z.object({ projectId: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "New test — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: NewTest,
});


function NewTest() {
  const { projectId } = Route.useSearch();
  const { data: projects } = useProjects();
  const navigate = useNavigate();
  const [project, setProject] = useState(projectId ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agents, setAgents] = useState<AgentDraft[]>([blank("Host", "host"), blank("Guest", "guest")]);
  const [busy, setBusy] = useState(false);


  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!project) { toast.error("Choose a project"); return; }
    if (!name.trim()) { toast.error("Give the test a name"); return; }
    if (!agentsValid(agents)) { toast.error("Every AI user needs a name, role and goal"); return; }
    setBusy(true);
    const { data: s, error } = await supabase.from("test_scenarios")
      .insert({ project_id: project, name: name.trim(), description: description.trim() || null }).select().single();
    if (error) { setBusy(false); toast.error(error.message); return; }
    const { error: aErr } = await supabase.from("test_agents").insert(
      agents.map((a) => toAgentRow(a, s.id)),
    );
    setBusy(false);
    if (aErr) { await supabase.from("test_scenarios").delete().eq("id", s.id); toast.error(aErr.message); return; }
    toast.success("Cast saved");
    navigate({ to: "/tests/$id", params: { id: s.id } });
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-4xl">New cast</h1>
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-1.5"><Label>Project</Label>
          <select value={project} onChange={(e) => setProject(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="">Select a project…</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.app_url}</option>)}
          </select></div>
        <div className="space-y-1.5"><Label>Cast name</Label>
          <Input placeholder="Buyer purchases seller's listing" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>What should happen overall?</Label>
          <Textarea placeholder="Seller lists a blue shirt for ₹800, buyer finds and purchases it." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>

      <AgentEditor agents={agents} onChange={setAgents} projectId={project} description={description} />
      <Button disabled={busy} className="w-full">{busy ? "Saving…" : "Save cast"}</Button>
    </form>
  );
}
