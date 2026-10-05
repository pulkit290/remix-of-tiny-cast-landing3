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

/** Drafts a support reply with the built-in AI. The admin copies and sends it themselves. */
export const draftSupportReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: m } = await db.from("contact_messages").select("name, message").eq("id", data.id).single();
    if (!m) throw new Error("Message not found");
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch", "content-type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", store: false, stream: true, reasoning: { effort: "low" },
        input: [
          { role: "system", content: "You write support replies for Poolabs, a paid tool where several AI users test a multi-user web app at once, each in its own real browser, and a report shows what happened. Pricing: $1 per run, Pro $9/month (20 runs, 5 users), Team $19/month (60 runs, 7 users, advanced AI user settings). Reports, screenshots and exports unlock by using one run. Sign-in is Google only. Write a short, warm, plain-English reply under 150 words. Never promise refunds, features, dates or fixes you don't know about; if unsure, say the team will look into it. Sign off as 'The Poolabs team'. Plain text only." },
          { role: "user", content: `From: ${m.name}\nMessage:\n${m.message}` },
        ],
      }),
    });
    if (res.status === 429) throw new Error("AI is busy right now. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits are used up. Add credits in workspace settings.");
    if (!res.ok || !res.body) { console.error("ai error", res.status, await res.text()); throw new Error("AI could not draft a reply."); }
    let text = "", buf = "";
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
        try {
          const ev = JSON.parse(line.slice(5).trim()) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
          if (ev.type === "response.failed" || ev.type === "error") throw new Error("AI could not draft a reply.");
        } catch (e) { if (e instanceof Error && e.message.startsWith("AI")) throw e; }
      }
    }
    if (!text.trim()) throw new Error("AI could not draft a reply.");
    return { reply: text.trim() };
  });
