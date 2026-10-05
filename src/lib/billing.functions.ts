import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: owner } = await context.supabase.rpc("team_owner", { _uid: context.userId });
    const payer = (owner as string | null) ?? context.userId;
    const { data } = await context.supabase.from("billing_accounts").select("*").eq("user_id", payer).maybeSingle();
    const { subscriptionActive } = await import("./billing.server");
    const active = subscriptionActive(data);
    return {
      configured: !!process.env["DODO_PAYMENTS_API_KEY"],
      plan: active ? data!.plan : "none",
      status: data?.subscription_status ?? null,
      periodEnd: data?.period_end ?? null,
      runsLeft: active ? Math.max(0, data!.runs_included - data!.runs_used) : 0,
      runsIncluded: active ? data!.runs_included : 0,
      credits: data?.run_credits ?? 0,
      isTeamOwner: payer === context.userId,
    };
  });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    kind: z.enum(["payg", "pro", "team"]),
    quantity: z.number().int().min(1).max(100).default(1),
    returnPath: z.string().startsWith("/").max(200).default("/settings"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env["DODO_PAYMENTS_API_KEY"];
    const productId = process.env[{ payg: "DODO_PRODUCT_PAYG", pro: "DODO_PRODUCT_PRO", team: "DODO_PRODUCT_TEAM" }[data.kind]];
    if (!key || !productId) throw new Error("Payments are not set up yet. Please try again later.");
    const { dodoBase, teamOwnerOf } = await import("./billing.server");
    const payer = await teamOwnerOf(context.userId);
    if (payer !== context.userId && data.kind !== "payg") throw new Error("Only the team owner can change the plan.");
    const origin = (process.env["PUBLIC_APP_URL"] || new URL(getRequest().url).origin).replace(/\/$/, "");
    const email = (context.claims as { email?: string }).email;
    const res = await fetch(`${dodoBase()}/checkouts`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: data.kind === "payg" ? data.quantity : 1 }],
        ...(email ? { customer: { email } } : {}),
        return_url: `${origin}${data.returnPath}${data.returnPath.includes("?") ? "&" : "?"}paid=1`,
        metadata: { user_id: payer, kind: data.kind, quantity: String(data.kind === "payg" ? data.quantity : 1) },
      }),
    });
    if (!res.ok) {
      console.error("dodo checkout failed", res.status, await res.text());
      throw new Error(`Could not open checkout (HTTP ${res.status}).`);
    }
    const json = (await res.json()) as { checkout_url?: string };
    if (!json.checkout_url) throw new Error("Checkout did not return a payment link.");
    return { url: json.checkout_url };
  });
