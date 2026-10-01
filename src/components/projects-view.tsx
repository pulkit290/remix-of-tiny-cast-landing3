import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge, timeAgo } from "@/components/status-badge";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, test_scenarios(id, test_runs(status, created_at))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((p) => {
        const runs = p.test_scenarios.flatMap((s) => s.test_runs).sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { ...p, testCount: p.test_scenarios.length, lastRun: runs[0] ?? null };
      });
    },
  });
}

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  app_url: z.string().trim().url().max(500).refine((u) => /^https?:\/\//.test(u), "URL must start with http:// or https://"),
  description: z.string().trim().max(1000),
});

type EditableProject = { id: string; name: string; app_url: string; description: string | null };

export function NewProjectDialog({ project, trigger }: { project?: EditableProject; trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project?.name ?? "");
  const [url, setUrl] = useState(project?.app_url ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const v = schema.safeParse({ name, app_url: url, description });
    if (!v.success) { toast.error(v.error.issues[0]?.message === "Invalid url" ? "Enter a full URL starting with https://" : (v.error.issues[0]?.message ?? "Check the form")); return; }
    const row = { name: v.data.name, app_url: v.data.app_url, description: v.data.description || null };
    setBusy(true);
    const res = project
      ? await supabase.from("projects").update({ ...row, updated_at: new Date().toISOString() }).eq("id", project.id).select().single()
      : await supabase.from("projects").insert(row).select().single();
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    qc.invalidateQueries();
    setOpen(false);
    toast.success(project ? "Project updated" : "Project created");
    if (!project) navigate({ to: "/projects/$id", params: { id: res.data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm"><Plus className="h-4 w-4" /> New project</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5"><Label>Project name</Label>
            <Input placeholder="My Marketplace" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Application URL</Label>
            <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description (optional)</Label>
            <Input placeholder="What the app does — helps AI suggest users" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <Button className="w-full" disabled={busy}>{busy ? "Saving…" : project ? "Save changes" : "Create project"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectsView({ title, compact }: { title: string; compact?: boolean }) {
  const { data, isLoading, error } = useProjects();
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        {compact ? <h2 className="text-2xl">{title}</h2> : <h1 className="text-4xl">{title}</h1>}
        {!compact && <NewProjectDialog />}
      </div>
      {error && <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Could not load projects: {error.message}</p>}
      {isLoading ? (
        <p className="mt-10 font-mono text-xs text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <div className="mt-10 rounded-xl border border-dashed p-16 text-center">
          <p className="text-muted-foreground">Add your first app and create a multi-user test.</p>
          <div className="mt-5 flex justify-center"><NewProjectDialog /></div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link key={p.id} to="/projects/$id" params={{ id: p.id }}
              className="lift group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{p.name}</h3>
                <StatusBadge status={p.lastRun?.status} />
              </div>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{p.app_url}</p>
              <div className="mt-6 flex gap-6 font-mono text-[11px] text-muted-foreground">
                <span>{p.testCount} casts</span>
                <span>last run {timeAgo(p.lastRun?.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
