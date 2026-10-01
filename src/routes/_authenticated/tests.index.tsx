import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tests/")({
  head: () => ({ meta: [{ title: "Tests — Poolabs" }, { name: "robots", content: "noindex" }] }),
  component: Tests,
});

function Tests() {
  const { data, isLoading } = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("test_scenarios")
        .select("id, name, created_at, projects(name), test_agents(id)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl">Casts</h1>
        <Button size="sm" asChild><Link to="/tests/new" search={{}}><Plus className="h-4 w-4" /> New cast</Link></Button>
      </div>
      <div className="mt-8 divide-y rounded-xl border bg-card">
        {isLoading && <p className="p-6 font-mono text-xs text-muted-foreground">Loading…</p>}
        {data?.length === 0 && <p className="p-6 text-sm text-muted-foreground">No casts yet.</p>}
        {data?.map((s) => (
          <Link key={s.id} to="/tests/$id" params={{ id: s.id }} className="flex items-center justify-between p-4 hover:bg-secondary/40">
            <span className="text-sm">{s.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{s.projects?.name} · {s.test_agents.length} users</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
