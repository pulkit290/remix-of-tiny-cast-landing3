// Server-only: builds a test report strictly from data the browser worker reported.
import type { ReportAction, ReportDoc, ReportIssue, ReportVerdict } from "./report-format";

export async function buildAndSaveReport(runId: string): Promise<ReportDoc | null> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

  const { data: run } = await db
    .from("test_runs")
    .select(
      "*, test_scenarios(id, name, description, projects(name, app_url)), agent_runs(*, test_agents(id, name, role, goal), agent_actions(*)), test_issues(*)",
    )
    .eq("id", runId)
    .single();
  if (!run) return null;

  const { data: shots } = await db
    .from("screenshots")
    .select("id, agent_run_id, action_sequence, storage_path, created_at")
    .eq("test_run_id", runId)
    .order("created_at", { ascending: true });

  const agentRuns = run.agent_runs ?? [];
  const nameOf = new Map(agentRuns.map((a) => [a.id, a.test_agents?.name ?? "Agent"]));

  const failed = (result: string | null) =>
    !!result && /^error|gave up|invalid action|timeout/i.test(result.trim());

  const timeline: ReportAction[] = agentRuns
    .flatMap((ar) =>
      (ar.agent_actions ?? []).map((x) => ({
        id: x.id,
        agent: ar.test_agents?.name ?? "Agent",
        agentRunId: ar.id,
        sequence: x.sequence,
        at: x.timestamp,
        type: x.action_type,
        description: x.description,
        target: x.target,
        input: x.input_data,
        result: x.result,
        failed: failed(x.result),
      })),
    )
    .sort((a, b) => a.at.localeCompare(b.at) || a.sequence - b.sequence);

  const agents = agentRuns.map((ar) => {
    const acts = (ar.agent_actions ?? []).slice().sort((a, b) => a.sequence - b.sequence);
    const last = acts[acts.length - 1];
    return {
      id: ar.id,
      name: ar.test_agents?.name ?? "Agent",
      role: ar.test_agents?.role ?? "",
      goal: ar.test_agents?.goal ?? "",
      status: ar.status,
      outcome: ar.outcome ?? (last?.action_type === "done" || last?.action_type === "fail" ? last.description : null),
      lastUrl: ar.current_url,
      actionCount: acts.length,
      startedAt: ar.started_at,
      completedAt: ar.completed_at,
    };
  });

  const completed = agents.filter((a) => a.status === "completed").length;
  const verdict: ReportVerdict =
    run.status === "cancelled"
      ? "cancelled"
      : run.status === "error"
      ? "error"
      : agents.length === 0
        ? "failed"
        : completed === agents.length
          ? "passed"
          : completed === 0
            ? "failed"
            : "partial";

  // Reproduction steps are the real, ordered actions that the affected AI user performed.
  const issues: ReportIssue[] = (run.test_issues ?? []).map((i) => {
    const ev = (i.evidence ?? null) as { agentRunId?: string } | null;
    const agentRunId =
      ev?.agentRunId ?? agentRuns.find((ar) => i.title.startsWith(ar.test_agents?.name ?? "\u0000"))?.id ?? null;
    const steps = agentRunId
      ? timeline
          .filter((t) => t.agentRunId === agentRunId)
          .map((t) => `${t.type}${t.target ? ` “${t.target}”` : ""}${t.description ? ` — ${t.description}` : ""}${t.result ? ` → ${t.result}` : ""}`)
      : [];
    return {
      id: i.id,
      severity: i.severity,
      title: i.title,
      description: i.description,
      reproductionSteps: (i.reproduction_steps as string[] | null) ?? steps,
      evidence: i.evidence,
    };
  });

  const doc: ReportDoc = {
    version: 1,
    runId: run.id,
    generatedAt: new Date().toISOString(),
    verdict,
    status: run.status,
    scenario: {
      id: run.test_scenarios?.id ?? null,
      name: run.test_scenarios?.name ?? null,
      description: run.test_scenarios?.description ?? null,
    },
    project: {
      name: run.test_scenarios?.projects?.name ?? null,
      appUrl: run.test_scenarios?.projects?.app_url ?? null,
    },
    startedAt: run.started_at,
    completedAt: run.completed_at,
    durationMs: run.duration_ms,
    summary: run.summary,
    failureReason: run.failure_reason,
    agents,
    timeline,
    failures: timeline.filter((t) => t.failed || t.type === "fail"),
    expectedVsActual: agents.map((a) => ({
      agent: a.name,
      expected: a.goal,
      actual:
        a.status === "completed"
          ? (a.outcome ?? "goal reached")
          : (a.outcome ?? `not reached — session ${a.status}`),
    })),
    issues,
    evidence: (shots ?? []).map((s) => ({
      id: s.id,
      agent: s.agent_run_id ? (nameOf.get(s.agent_run_id) ?? null) : null,
      sequence: s.action_sequence,
      at: s.created_at,
      storagePath: s.storage_path,
    })),
  };

  // Persist derived reproduction steps so the DB holds the full record.
  for (const i of issues) {
    if (i.reproductionSteps.length) {
      await db.from("test_issues").update({ reproduction_steps: i.reproductionSteps }).eq("id", i.id);
    }
  }

  const { data: existing } = await db.from("test_reports").select("id, share_token").eq("test_run_id", runId).maybeSingle();
  if (existing) {
    await db.from("test_reports").update({ verdict, report: doc }).eq("id", existing.id);
  } else {
    await db.from("test_reports").insert({ test_run_id: runId, verdict, report: doc });
  }
  return doc;
}
