import type { Json } from "@/integrations/supabase/types";
// Client-safe report types and formatters. Never invents data — only formats what the run produced.

export type ReportVerdict = "passed" | "failed" | "partial" | "error" | "cancelled";

export type ReportAgent = {
  id: string;
  name: string;
  role: string;
  goal: string;
  status: string;
  outcome: string | null;
  lastUrl: string | null;
  actionCount: number;
  startedAt: string | null;
  completedAt: string | null;
};

export type ReportAction = {
  id: string;
  agent: string;
  agentRunId: string;
  sequence: number;
  at: string;
  type: string;
  description: string | null;
  target: string | null;
  input: Json;
  result: string | null;
  failed: boolean;
};

export type ReportIssue = {
  id: string;
  severity: string;
  title: string;
  description: string | null;
  reproductionSteps: string[];
  evidence: Json;
};

export type ReportEvidence = {
  id: string;
  agent: string | null;
  sequence: number | null;
  at: string;
  storagePath: string | null;
};

export type ReportDoc = {
  version: 1;
  runId: string;
  generatedAt: string;
  verdict: ReportVerdict;
  status: string;
  scenario: { id: string | null; name: string | null; description: string | null };
  project: { name: string | null; appUrl: string | null };
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  summary: string | null;
  failureReason: string | null;
  agents: ReportAgent[];
  timeline: ReportAction[];
  failures: ReportAction[];
  expectedVsActual: { agent: string; expected: string; actual: string }[];
  issues: ReportIssue[];
  evidence: ReportEvidence[];
};

export const verdictLabel: Record<ReportVerdict, string> = {
  passed: "PASS",
  failed: "FAIL",
  partial: "PARTIAL",
  cancelled: "CANCELLED",
  error: "ERROR",
};

export function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function reportToMarkdown(r: ReportDoc): string {
  const L: string[] = [];
  L.push(`# Test report — ${r.scenario.name ?? "Run"} (${verdictLabel[r.verdict]})`);
  L.push("");
  L.push(`- Run: \`${r.runId}\``);
  if (r.project.appUrl) L.push(`- App: ${r.project.appUrl}`);
  L.push(`- Started: ${r.startedAt ?? "—"}`);
  L.push(`- Completed: ${r.completedAt ?? "—"}`);
  L.push(`- Duration: ${fmtDuration(r.durationMs)}`);
  L.push(`- Report generated: ${r.generatedAt}`);
  if (r.summary) L.push("", "## Summary", "", r.summary);
  if (r.failureReason) L.push("", "## Failure reason", "", r.failureReason);

  L.push("", "## AI users", "");
  if (r.agents.length === 0) L.push("_No AI user sessions were recorded._");
  for (const a of r.agents) {
    L.push(`### ${a.name} — ${a.role} (${a.status})`);
    L.push(`- Goal: ${a.goal}`);
    L.push(`- Result: ${a.outcome ?? "no result reported"}`);
    L.push(`- Actions: ${a.actionCount}${a.lastUrl ? ` · Last URL: ${a.lastUrl}` : ""}`);
    L.push("");
  }

  if (r.expectedVsActual.length) {
    L.push("## Expected vs actual", "");
    L.push("| AI user | Expected | Actual |", "| --- | --- | --- |");
    for (const e of r.expectedVsActual)
      L.push(`| ${e.agent} | ${e.expected.replace(/\|/g, "/")} | ${e.actual.replace(/\|/g, "/")} |`);
    L.push("");
  }

  L.push("## Action timeline", "");
  if (r.timeline.length === 0) L.push("_No actions were reported by the browser worker._");
  for (const a of r.timeline)
    L.push(
      `- ${a.at} · **${a.agent}** · \`${a.type}\` ${a.description ?? ""}${a.target ? ` → ${a.target}` : ""}${a.result ? ` (${a.result})` : ""}`,
    );

  if (r.failures.length) {
    L.push("", "## Failed actions", "");
    for (const f of r.failures)
      L.push(`- ${f.at} · **${f.agent}** · \`${f.type}\` ${f.description ?? ""} — ${f.result ?? ""}`);
  }

  if (r.issues.length) {
    L.push("", "## Issues", "");
    for (const i of r.issues) {
      L.push(`### [${i.severity.toUpperCase()}] ${i.title}`);
      if (i.description) L.push("", i.description);
      if (i.reproductionSteps.length) {
        L.push("", "Reproduction steps:");
        i.reproductionSteps.forEach((s, n) => L.push(`${n + 1}. ${s}`));
      }
      L.push("");
    }
  }

  L.push("", `## Evidence`, "", r.evidence.length ? `${r.evidence.length} screenshot(s) captured during the run.` : "_No screenshots were captured by the browser worker._");
  return L.join("\n");
}
