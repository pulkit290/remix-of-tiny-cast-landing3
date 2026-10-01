import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReportDoc } from "./report-format";

type Loaded = { report: ReportDoc; shareToken: string | null; evidenceUrls: Record<string, string> };

async function signEvidence(doc: ReportDoc): Promise<Record<string, string>> {
  const paths = doc.evidence.map((e) => e.storagePath).filter((p): p is string => !!p);
  if (paths.length === 0) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const out: Record<string, string> = {};
  const { data } = await supabaseAdmin.storage.from("run-evidence").createSignedUrls(paths, 3600);
  for (const s of data ?? []) if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
  return out;
}

/** Owner view. Generates the report on demand if the run finished before reports existed. */
export const getRunReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<Loaded | { report: null; reason: string }> => {
    // RLS: fails unless the caller owns the run.
    const { data: run, error } = await context.supabase
      .from("test_runs")
      .select("id, status")
      .eq("id", data.runId)
      .single();
    if (error || !run) throw new Error("Run not found");
    if (!["passed", "failed", "error"].includes(run.status))
      return { report: null, reason: "This run has not finished yet, so there is no report." };

    const { data: row } = await context.supabase
      .from("test_reports")
      .select("report, share_token")
      .eq("test_run_id", data.runId)
      .maybeSingle();

    let doc = row?.report as ReportDoc | undefined;
    const shareToken = row?.share_token ?? null;
    if (!doc) {
      const { buildAndSaveReport } = await import("./report.server");
      const built = await buildAndSaveReport(data.runId);
      if (!built) return { report: null, reason: "No run data was recorded, so no report can be produced." };
      doc = built;
    }
    return { report: doc, shareToken, evidenceUrls: await signEvidence(doc) };
  });

export const regenerateRunReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<Loaded> => {
    const { error } = await context.supabase.from("test_runs").select("id").eq("id", data.runId).single();
    if (error) throw new Error("Run not found");
    const { buildAndSaveReport } = await import("./report.server");
    const doc = await buildAndSaveReport(data.runId);
    if (!doc) throw new Error("No run data was recorded for this run.");
    const { data: row } = await context.supabase
      .from("test_reports").select("share_token").eq("test_run_id", data.runId).maybeSingle();
    return { report: doc, shareToken: row?.share_token ?? null, evidenceUrls: await signEvidence(doc) };
  });

/** Turn the read-only share link on or off. */
export const setReportSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ runId: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("test_reports").select("id, share_token").eq("test_run_id", data.runId).maybeSingle();
    if (error) throw new Error("Report not found");
    if (!row) throw new Error("Generate the report first.");
    const token = data.enabled ? (row.share_token ?? crypto.randomUUID().replace(/-/g, "")) : null;
    const { error: upErr } = await context.supabase
      .from("test_reports").update({ share_token: token }).eq("id", row.id);
    if (upErr) throw new Error("Could not update sharing");
    return { shareToken: token };
  });

/** Public, read-only: resolves a share token to its report. No listing possible. */
export const getSharedReport = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(16).max(64) }).parse(d))
  .handler(async ({ data }): Promise<{ report: ReportDoc | null; evidenceUrls: Record<string, string> }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("test_reports").select("report").eq("share_token", data.token).maybeSingle();
    if (!row) return { report: null, evidenceUrls: {} };
    const doc = row.report as ReportDoc;
    return { report: doc, evidenceUrls: await signEvidence(doc) };
  });
