import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" | "user" }) => PromiseLike<{ data: boolean | null }> }; userId: string };

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [messages, users, billing, payments, runs, projects] = await Promise.all([
      db.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200),
      db.auth.admin.listUsers({ perPage: 200 }),
      db.from("billing_accounts").select("user_id, plan, subscription_status, runs_included, runs_used, run_credits, period_end"),
      db.from("payment_events").select("id, event_type, user_id, created_at").order("created_at", { ascending: false }).limit(50),
      db.from("test_runs").select("id, status, created_at, duration_ms, test_scenarios(name)").order("created_at", { ascending: false }).limit(50),
      db.from("projects").select("id", { count: "exact", head: true }),
    ]);
    const emails = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return {
      messages: messages.data ?? [],
      users: (users.data?.users ?? []).map((u) => ({ id: u.id, email: u.email ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null })),
      billing: (billing.data ?? []).map((b) => ({ ...b, email: emails.get(b.user_id) ?? b.user_id })),
      payments: (payments.data ?? []).map((p) => ({ ...p, email: p.user_id ? emails.get(p.user_id) ?? p.user_id : "—" })),
      runs: (runs.data ?? []).map((r) => ({ id: r.id, status: r.status, created_at: r.created_at, duration_ms: r.duration_ms, name: (r.test_scenarios as { name: string } | null)?.name ?? "—" })),
      projectCount: projects.count ?? 0,
    };
  });

export const setMessageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["new", "done"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { error } = await db.from("contact_messages").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
