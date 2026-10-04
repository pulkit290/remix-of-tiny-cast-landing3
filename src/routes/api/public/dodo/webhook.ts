import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Dodo Payments webhook (Standard Webhooks signing). Only writer of billing state.
function verify(secret: string, id: string, ts: string, body: string, header: string) {
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return header.split(" ").some((part) => {
    const sig = Buffer.from(part.split(",")[1] ?? "", "base64");
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

type Data = {
  payment_id?: string; subscription_id?: string | null; product_id?: string; status?: string;
  next_billing_date?: string; metadata?: Record<string, string>;
  customer?: { customer_id?: string; email?: string };
};

export const Route = createFileRoute("/api/public/dodo/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["DODO_PAYMENTS_WEBHOOK_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const body = await request.text();
        const id = request.headers.get("webhook-id") ?? "";
        const ts = request.headers.get("webhook-timestamp") ?? "";
        const sig = request.headers.get("webhook-signature") ?? "";
        if (!id || !verify(secret, id, ts, body, sig)) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(body) as { type: string; data: Data };
        const d = event.data ?? {};
        const userId = d.metadata?.user_id;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error: dupErr } = await supabaseAdmin.from("payment_events")
          .insert({ id, event_type: event.type, user_id: userId ?? null, payload: event as never });
        if (dupErr) return new Response("ok"); // already processed
        if (!userId || !/^[0-9a-f-]{36}$/.test(userId)) return new Response("ok");

        const { data: acc } = await supabaseAdmin.from("billing_accounts").select("*").eq("user_id", userId).maybeSingle();
        const base = acc ?? { user_id: userId, plan: "none", runs_included: 0, runs_used: 0, run_credits: 0 };
        const now = new Date().toISOString();
        const save = (patch: Record<string, unknown>) =>
          supabaseAdmin.from("billing_accounts").upsert({ ...base, ...patch, user_id: userId, updated_at: now });

        if (event.type === "payment.succeeded" && !d.subscription_id && d.metadata?.kind === "payg") {
          const qty = Math.max(1, Math.min(100, parseInt(d.metadata.quantity ?? "1", 10) || 1));
          await save({ run_credits: (base.run_credits ?? 0) + qty, dodo_customer_id: d.customer?.customer_id ?? acc?.dodo_customer_id ?? null });
        } else if (event.type === "subscription.active" || event.type === "subscription.renewed" || event.type === "subscription.plan_changed") {
          const plan = d.product_id === process.env["DODO_PRODUCT_TEAM"] ? "team" : d.product_id === process.env["DODO_PRODUCT_PRO"] ? "pro" : null;
          if (plan) {
            const { PLAN_RUNS } = await import("@/lib/billing.server");
            const newPeriod = d.next_billing_date ?? null;
            const reset = event.type === "subscription.renewed" || newPeriod !== acc?.period_end || acc?.plan !== plan;
            await save({
              plan, subscription_status: "active", dodo_subscription_id: d.subscription_id ?? null,
              dodo_customer_id: d.customer?.customer_id ?? null, period_end: newPeriod,
              runs_included: PLAN_RUNS[plan], runs_used: reset ? 0 : base.runs_used,
            });
          }
        } else if (event.type === "subscription.cancelled") {
          await save({ subscription_status: "cancelled" }); // keeps access until period_end
        } else if (["subscription.expired", "subscription.failed", "subscription.on_hold"].includes(event.type)) {
          await save({ plan: "none", subscription_status: event.type.split(".")[1], runs_included: 0, runs_used: 0 });
        }
        return new Response("ok");
      },
    },
  },
});
