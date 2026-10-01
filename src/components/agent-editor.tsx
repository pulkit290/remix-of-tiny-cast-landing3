import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { suggestAgents } from "@/lib/runs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type AgentDraft = { id?: string | undefined; name: string; role: string; goal: string; system_instructions: string; account_email: string };
export const blankAgent = (name: string, role: string): AgentDraft => ({ name, role, goal: "", system_instructions: "", account_email: "" });

export function agentsValid(agents: AgentDraft[]) {
  return agents.length > 0 && agents.every((a) => a.name.trim() && a.role.trim() && a.goal.trim());
}

/** Editable list of AI users. "Suggest with AI" asks the model to draft users from the cast description. */
export function AgentEditor({ agents, onChange, projectId, description }: {
  agents: AgentDraft[]; onChange: (a: AgentDraft[]) => void; projectId: string; description: string;
}) {
  const suggest = useServerFn(suggestAgents);
  const [thinking, setThinking] = useState(false);
  const update = (i: number, k: keyof AgentDraft, v: string) => onChange(agents.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function aiFill() {
    if (!projectId) { toast.error("Choose a project first"); return; }
    setThinking(true);
    try {
      const r = await suggest({ data: { projectId, description, count: Math.max(2, Math.min(6, agents.length)) } });
      // Keep existing ids so editing a saved cast updates rows in place.
      onChange(r.users.map((u, i) => ({ id: agents[i]?.id, name: u.name, role: u.role, goal: u.goal,
        system_instructions: u.system_instructions ?? "", account_email: agents[i]?.account_email ?? "" })));
      toast.success("AI drafted the users. Review them before saving.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI could not suggest users");
    } finally { setThinking(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">AI users ({agents.length})</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={aiFill} disabled={thinking}>
            <Sparkles className="h-4 w-4" /> {thinking ? "Drafting…" : "Suggest with AI"}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={agents.length >= 6}
            onClick={() => onChange([...agents, blankAgent(`User ${agents.length + 1}`, "user")])}>
            <Plus className="h-4 w-4" /> Add user
          </Button>
        </div>
      </div>
      {agents.map((a, i) => (
        <div key={a.id ?? `new-${i}`} className="space-y-3 rounded-xl border bg-card p-5 transition-colors focus-within:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase text-primary">Agent {String.fromCharCode(65 + i)}</span>
            {agents.length > 1 && (
              <button type="button" aria-label="Remove user" className="press" onClick={() => onChange(agents.filter((_, j) => j !== i))}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Name" value={a.name} onChange={(e) => update(i, "name", e.target.value)} maxLength={60} />
            <Input placeholder="Role (host, guest, admin…)" value={a.role} onChange={(e) => update(i, "role", e.target.value)} maxLength={40} />
          </div>
          <Textarea placeholder="Goal — e.g. Book the Saturday 10:00 slot and confirm it." value={a.goal} onChange={(e) => update(i, "goal", e.target.value)} maxLength={500} />
          <Input placeholder="Test account email (optional — password is kept on your browser worker)" value={a.account_email} onChange={(e) => update(i, "account_email", e.target.value)} maxLength={200} />
          <Textarea placeholder="Extra instructions (optional)" value={a.system_instructions} onChange={(e) => update(i, "system_instructions", e.target.value)} maxLength={1000} />
        </div>
      ))}
    </div>
  );
}

export function toAgentRow(a: AgentDraft, scenarioId: string) {
  return {
    scenario_id: scenarioId, name: a.name.trim(), role: a.role.trim(), goal: a.goal.trim(),
    system_instructions: a.system_instructions.trim() || null, account_email: a.account_email.trim() || null,
  };
}
