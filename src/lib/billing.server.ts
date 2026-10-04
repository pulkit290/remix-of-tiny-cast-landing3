// Server-only billing helpers. Payment state is written only by the Dodo webhook.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PLAN_RUNS = { pro: 20, team: 60 } as const;

export function dodoBase() {
  return process.env["DODO_PAYMENTS_ENVIRONMENT"] === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

type Account = {
  user_id: string; plan: string; subscription_status: string | null; period_end: string | null;
  runs_included: number; runs_used: number; run_credits: number;
};

export function subscriptionActive(a: Pick<Account, "plan" | "subscription_status" | "period_end"> | null) {
  if (!a || a.plan === "none") return false;
  const live = a.subscription_status === "active" || a.subscription_status === "cancelled";
  return live && (!a.period_end || new Date(a.period_end).getTime() > Date.now());
}

/** Unlocks a finished run's report by spending one plan run or one pay-as-you-go credit. */
export async function unlockRun(runId: string, userId: string): Promise<boolean> {
  const { data: run } = await supabaseAdmin.from("test_runs").select("id, unlocked_at").eq("id", runId).single();
  if (!run) return false;
  if (run.unlocked_at) return true;
  const { data: acc } = await supabaseAdmin.from("billing_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (!acc) return false;
  let spent = false;
  if (subscriptionActive(acc) && acc.runs_used < acc.runs_included) {
    const { data } = await supabaseAdmin.from("billing_accounts")
      .update({ runs_used: acc.runs_used + 1, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("runs_used", acc.runs_used).select("user_id");
    spent = !!data?.length;
  }
  if (!spent && acc.run_credits > 0) {
    const { data } = await supabaseAdmin.from("billing_accounts")
      .update({ run_credits: acc.run_credits - 1, updated_at: new Date().toISOString() })
      .eq("user_id", userId).eq("run_credits", acc.run_credits).select("user_id");
    spent = !!data?.length;
  }
  if (!spent) return false;
  await supabaseAdmin.from("test_runs").update({ unlocked_at: new Date().toISOString() }).eq("id", runId).is("unlocked_at", null);
  return true;
}
