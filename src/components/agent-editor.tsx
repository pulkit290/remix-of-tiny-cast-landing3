import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Lock, Plus, Sparkles, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBilling } from "@/lib/billing.functions";
import { toast } from "sonner";
import { suggestAgents } from "@/lib/runs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type Advanced = { locale?: string; timezone?: string; latitude?: string; longitude?: string; device?: "desktop" | "mobile" | "tablet"; colorScheme?: "light" | "dark" };
export type AgentDraft = { id?: string | undefined; name: string; role: string; goal: string; system_instructions: string; account_email: string; advanced: Advanced };
export const blankAgent = (name: string, role: string): AgentDraft => ({ name, role, goal: "", system_instructions: "", account_email: "", advanced: {} });

export function agentsValid(agents: AgentDraft[]) {
  return agents.length > 0 && agents.every((a) => a.name.trim() && a.role.trim() && a.goal.trim());
}

/** Editable list of AI users. "Suggest with AI" asks the model to draft users from the cast description. */
export function AgentEditor({ agents, onChange, projectId, description }: {
  agents: AgentDraft[]; onChange: (a: AgentDraft[]) => void; projectId: string; description: string;
}) {
  const suggest = useServerFn(suggestAgents);
  const [thinking, setThinking] = useState(false);
  const loadBilling = useServerFn(getBilling);
  const { data: billing } = useQuery({ queryKey: ["billing"], queryFn: () => loadBilling() });
  const isTeam = billing?.plan === "team";
  const update = (i: number, k: keyof AgentDraft, v: string) => onChange(agents.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function aiFill() {
    if (!projectId) { toast.error("Choose a project first"); return; }
    setThinking(true);
    try {
      const r = await suggest({ data: { projectId, description, count: Math.max(2, Math.min(6, agents.length)) } });
      // Keep existing ids so editing a saved cast updates rows in place.
      onChange(r.users.map((u, i) => ({ id: agents[i]?.id, name: u.name, role: u.role, goal: u.goal,
        system_instructions: u.system_instructions ?? "", account_email: agents[i]?.account_email ?? "", advanced: agents[i]?.advanced ?? {} })));
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
          <AdvancedSettings value={a.advanced} isTeam={isTeam} onChange={(v) => onChange(agents.map((x, j) => (j === i ? { ...x, advanced: v } : x)))} />
        </div>
      ))}
    </div>
  );
}

export function toAgentRow(a: AgentDraft, scenarioId: string) {
  return {
    scenario_id: scenarioId, name: a.name.trim(), role: a.role.trim(), goal: a.goal.trim(),
    system_instructions: a.system_instructions.trim() || null, account_email: a.account_email.trim() || null,
    advanced: Object.fromEntries(Object.entries(a.advanced ?? {}).filter(([, v]) => v)),
  };
}

const sel = "h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50";

/** Opt-in browser environment per AI user. Editable on the Team plan only; the server ignores it otherwise. */
function AdvancedSettings({ value, onChange, isTeam }: { value: Advanced; onChange: (v: Advanced) => void; isTeam: boolean }) {
  const [open, setOpen] = useState(false);
  const set = (k: keyof Advanced, v: string) => onChange({ ...value, [k]: v || undefined });
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} /> Advanced settings
        <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase">Team</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-dashed p-4">
          {!isTeam && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Available on the Team plan. Upgrade in Settings to edit these.</p>}
          <fieldset disabled={!isTeam} className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Language, e.g. en-IN, fr-FR" value={value.locale ?? ""} onChange={(e) => set("locale", e.target.value)} maxLength={20} />
            <Input placeholder="Time zone, e.g. Asia/Kolkata" value={value.timezone ?? ""} onChange={(e) => set("timezone", e.target.value)} maxLength={60} />
            <Input placeholder="Location latitude, e.g. 28.61" value={value.latitude ?? ""} onChange={(e) => set("latitude", e.target.value)} maxLength={12} />
            <Input placeholder="Location longitude, e.g. 77.21" value={value.longitude ?? ""} onChange={(e) => set("longitude", e.target.value)} maxLength={12} />
            <select className={sel} value={value.device ?? ""} onChange={(e) => set("device", e.target.value)}>
              <option value="">Device: desktop (default)</option><option value="mobile">Device: phone</option><option value="tablet">Device: tablet</option>
            </select>
            <select className={sel} value={value.colorScheme ?? ""} onChange={(e) => set("colorScheme", e.target.value)}>
              <option value="">Theme: light (default)</option><option value="dark">Theme: dark</option>
            </select>
          </fieldset>
        </div>
      )}
    </div>
  );
}
