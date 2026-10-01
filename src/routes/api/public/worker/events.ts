/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const Event = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_status"), runId: z.string().uuid(),
    status: z.enum(["running", "passed", "failed", "error"]),
    summary: z.string().max(5000).optional(), failureReason: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("agent_status"), agentRunId: z.string().uuid(),
    status: z.enum(["running", "completed", "failed", "error"]),
    currentUrl: z.string().max(2000).optional(), currentAction: z.string().max(500).optional(),
    browserSessionId: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal("action"), agentRunId: z.string().uuid(), sequence: z.number().int(),
    actionType: z.string().max(50), description: z.string().max(1000).optional(),
    target: z.string().max(500).optional(), inputData: z.any().optional(), result: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("issue"), runId: z.string().uuid(),
    severity: z.enum(["low", "medium", "high", "critical"]), title: z.string().max(300),
    description: z.string().max(5000).optional(), evidence: z.any().optional(),
    agentRunId: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal("screenshot"), runId: z.string().uuid(), agentRunId: z.string().uuid().optional(),
    sequence: z.number().int().optional(),
    // Raw PNG bytes, base64 encoded, captured by the worker's real browser page.
    imageBase64: z.string().min(50).max(12_000_000),
  }),
]);

function authorized(req: Request) {
  const secret = process.env["WORKER_SECRET"];
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !token) return false;
  const a = Buffer.from(token), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/worker/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const parsed = Event.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid event" }, { status: 400 });
        const e = parsed.data;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        if (e.type === "run_status") {
          const { data: cur } = await db.from("test_runs").select("status").eq("id", e.runId).single();
          if (cur?.status === "cancelled") return Response.json({ ok: true, ignored: "cancelled" });
          const patch: any = { status: e.status };
          if (e.status === "running") patch.started_at = now;
          else {
            const { data: r } = await db.from("test_runs").select("started_at").eq("id", e.runId).single();
            patch.completed_at = now;
            if (r?.started_at) patch.duration_ms = Date.now() - new Date(r.started_at).getTime();
            patch.summary = e.summary ?? null;
            patch.failure_reason = e.failureReason ?? null;
          }
          await db.from("test_runs").update(patch).eq("id", e.runId);
          if (e.status !== "running") {
            // Report is built only from what the worker actually recorded.
            const { buildAndSaveReport } = await import("@/lib/report.server");
            await buildAndSaveReport(e.runId).catch((err) => console.error("report build failed", err));
          }
        } else if (e.type === "agent_status") {
          const patch: any = { status: e.status };
          if (e.currentUrl) patch.current_url = e.currentUrl;
          if (e.currentAction) patch.current_action = e.currentAction;
          if (e.browserSessionId) patch.browser_session_id = e.browserSessionId;
          if (e.status === "running") patch.started_at = now; else patch.completed_at = now;
          await db.from("agent_runs").update(patch).eq("id", e.agentRunId);
        } else if (e.type === "action") {
          await db.from("agent_actions").insert({
            agent_run_id: e.agentRunId, sequence: e.sequence, action_type: e.actionType,
            description: e.description ?? null, target: e.target ?? null, input_data: e.inputData ?? null, result: e.result ?? null,
          });
          await db.from("agent_runs").update({ current_action: e.description ?? e.actionType }).eq("id", e.agentRunId);
        } else if (e.type === "issue") {
          await db.from("test_issues").insert({
            test_run_id: e.runId, severity: e.severity, title: e.title,
            description: e.description ?? null,
            evidence: { ...(e.evidence ?? {}), ...(e.agentRunId ? { agentRunId: e.agentRunId } : {}) },
          });
        } else {
          const bytes = Buffer.from(e.imageBase64, "base64");
          const path = `${e.runId}/${e.agentRunId ?? "run"}-${e.sequence ?? Date.now()}.png`;
          const up = await db.storage.from("run-evidence").upload(path, bytes, {
            contentType: "image/png", upsert: true,
          });
          if (up.error) return Response.json({ error: "Could not store screenshot" }, { status: 500 });
          await db.from("screenshots").insert({
            test_run_id: e.runId, agent_run_id: e.agentRunId ?? null,
            action_sequence: e.sequence ?? null, storage_path: path,
          });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
