import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NOT_CONFIGURED = "Browser worker not configured. Set BROWSER_WORKER_URL and WORKER_SECRET in the project secrets, then run again. Your test has not started.";
const UNREACHABLE = "Browser worker unreachable at the configured BROWSER_WORKER_URL. Your test has not started.";

export const startRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ scenarioId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // RLS ensures the caller owns this scenario.
    const { data: scenario, error } = await supabase
      .from("test_scenarios")
      .select("id, name, description, projects(app_url), test_agents(*)")
      .eq("id", data.scenarioId)
      .single();
    if (error || !scenario) throw new Error("Test not found");
    const agents = scenario.test_agents ?? [];
    if (agents.length < 1) throw new Error("Add at least one AI user before running.");

    const { data: run, error: runErr } = await supabase
      .from("test_runs")
      .insert({ scenario_id: scenario.id, status: "queued" })
      .select()
      .single();
    if (runErr || !run) throw new Error("Could not create run");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agentRuns } = await supabaseAdmin
      .from("agent_runs")
      .insert(agents.map((a) => ({ test_run_id: run.id, agent_id: a.id, status: "queued" })))
      .select();

    const fail = async (reason: string) => {
      await supabaseAdmin.from("test_runs").update({
        status: "failed", failure_reason: reason, completed_at: new Date().toISOString(),
      }).eq("id", run.id);
      await supabaseAdmin.from("agent_runs").update({ status: "cancelled" }).eq("test_run_id", run.id);
      return { runId: run.id, started: false, reason };
    };

    const workerUrl = process.env["BROWSER_WORKER_URL"];
    const workerSecret = process.env["WORKER_SECRET"];
    if (!workerUrl || !workerSecret) return fail(NOT_CONFIGURED);

    // The worker runs elsewhere, so it must call back to a publicly reachable app URL.
    const origin = (process.env["PUBLIC_APP_URL"] || new URL(getRequest().url).origin).replace(/\/$/, "");
    const payload = {
      runId: run.id,
      appUrl: (scenario.projects as { app_url: string } | null)?.app_url,
      scenario: { name: scenario.name, description: scenario.description },
      callbackUrl: `${origin}/api/public/worker/events`,
      agents: (agentRuns ?? []).map((ar) => {
        const a = agents.find((x) => x.id === ar.agent_id)!;
        return {
          agentRunId: ar.id, name: a.name, role: a.role, goal: a.goal,
          instructions: a.system_instructions, accountEmail: a.account_email, accountUsername: a.account_username,
        };
      }),
    };

    try {
      const res = await fetch(`${workerUrl.replace(/\/$/, "")}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${workerSecret}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("worker rejected run", res.status, await res.text());
        return fail(`Browser worker rejected the run (HTTP ${res.status}). Your test has not started.`);
      }
    } catch (e) {
      console.error("worker unreachable", e);
      return fail(UNREACHABLE);
    }
    // Worker accepted the job; it moves the run to "running" once browsers are up.
    await supabaseAdmin.from("test_runs").update({ status: "starting" }).eq("id", run.id).eq("status", "queued");
    return { runId: run.id, started: true, reason: null };
  });

export const workerStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const url = process.env["BROWSER_WORKER_URL"];
    const secret = process.env["WORKER_SECRET"];
    if (!url || !secret) return { configured: false, reachable: false };
    try {
      const r = await fetch(`${url.replace(/\/$/, "")}/health`, { headers: { authorization: `Bearer ${secret}` } });
      return { configured: true, reachable: r.ok };
    } catch {
      return { configured: true, reachable: false };
    }
  });

export const cancelRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS: only the owner can read this run.
    const { data: run, error } = await context.supabase.from("test_runs").select("id, status, started_at").eq("id", data.runId).single();
    if (error || !run) throw new Error("Run not found");
    if (!["queued", "starting", "running"].includes(run.status)) throw new Error(`Run is already ${run.status}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    await supabaseAdmin.from("test_runs").update({
      status: "cancelled", completed_at: now.toISOString(), failure_reason: "Cancelled by user.",
      duration_ms: run.started_at ? now.getTime() - new Date(run.started_at).getTime() : null,
    }).eq("id", run.id);
    await supabaseAdmin.from("agent_runs").update({ status: "cancelled", completed_at: now.toISOString() })
      .eq("test_run_id", run.id).in("status", ["queued", "running"]);
    const url = process.env["BROWSER_WORKER_URL"];
    const secret = process.env["WORKER_SECRET"];
    let workerNotified = false;
    if (url && secret) {
      try {
        const r = await fetch(`${url.replace(/\/$/, "")}/runs/${run.id}/cancel`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
        workerNotified = r.ok;
      } catch (e) { console.error("cancel notify failed", e); }
    }
    const { buildAndSaveReport } = await import("@/lib/report.server");
    await buildAndSaveReport(run.id).catch((e) => console.error("report build failed", e));
    return { ok: true, workerNotified };
  });

const AgentSuggestion = z.object({
  name: z.string().min(1).max(60), role: z.string().min(1).max(40), goal: z.string().min(1).max(500),
  system_instructions: z.string().max(1000).optional().default(""),
});

export const suggestAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid(), description: z.string().max(2000), count: z.number().int().min(2).max(6) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: project, error } = await context.supabase.from("projects").select("name, app_url, description").eq("id", data.projectId).single();
    if (error || !project) throw new Error("Project not found");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch", "content-type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        store: false,
        stream: true,
        reasoning: { effort: "medium" },
        text: { format: { type: "json_object" } },
        input: [
          { role: "system", content: "You design multi-user browser test casts. Each AI user gets a short name, a lowercase role, and one concrete, verifiable goal that depends on the other users where possible. Goals must say exactly what to do and what visible result proves success, with no extra steps. Never invent test account credentials. Reply ONLY with JSON: {\"users\":[{\"name\":\"\",\"role\":\"\",\"goal\":\"\",\"system_instructions\":\"\"}]}" },
          { role: "user", content: `App: ${project.name} (${project.app_url}). ${project.description ?? ""}\nWhat to test: ${data.description || "the core multi-user flow"}\nCreate exactly ${data.count} AI users.` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("AI is rate limited right now. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits are used up. Add credits in workspace settings.");
    if (!res.ok || !res.body) { console.error("ai error", res.status, await res.text()); throw new Error("AI could not suggest users."); }
    let content = "", buf = "";
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) content += ev.delta;
          if (ev.type === "response.failed" || ev.type === "error") throw new Error("AI could not suggest users.");
        } catch (e) { if (e instanceof Error && e.message.startsWith("AI")) throw e; }
      }
    }
    let json: unknown = null;
    try { json = JSON.parse(content); } catch { /* handled below */ }
    const parsed = z.object({ users: z.array(AgentSuggestion).min(1) }).safeParse(json);
    if (!parsed.success) throw new Error("AI returned an unusable answer. Try again.");
    return { users: parsed.data.users.slice(0, data.count) };
  });
