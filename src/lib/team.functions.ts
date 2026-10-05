import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Team writes go through the server (service role); users only read via RLS.
const SEATS = { none: 1, pro: 3, team: 5 } as const;

async function ctxInfo(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { subscriptionActive } = await import("./billing.server");
  const { data: me } = await supabaseAdmin.from("team_members").select("owner_id, role").eq("user_id", userId).maybeSingle();
  const ownerId = me?.owner_id ?? userId;
  const role = me ? (me.role as "admin" | "member") : "owner";
  const { data: acc } = await supabaseAdmin.from("billing_accounts").select("*").eq("user_id", ownerId).maybeSingle();
  const plan = (subscriptionActive(acc) ? acc!.plan : "none") as keyof typeof SEATS;
  return { db: supabaseAdmin, ownerId, role, plan, seats: SEATS[plan] ?? 1 };
}

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, ownerId, role, plan, seats } = await ctxInfo(context.userId);
    const email = ((context.claims as { email?: string }).email ?? "").toLowerCase();
    const [{ data: members }, { data: invites }, { data: mine }, owner] = await Promise.all([
      db.from("team_members").select("user_id, role, email, created_at").eq("owner_id", ownerId).order("created_at"),
      db.from("team_invites").select("id, email, role, created_at").eq("owner_id", ownerId).order("created_at"),
      email ? db.from("team_invites").select("id, owner_id, role").ilike("email", email) : Promise.resolve({ data: [] as { id: string; owner_id: string; role: string }[] }),
      db.auth.admin.getUserById(ownerId),
    ]);
    const incoming = await Promise.all((mine ?? []).filter((i) => i.owner_id !== ownerId).map(async (i) => {
      const u = await db.auth.admin.getUserById(i.owner_id);
      return { id: i.id, role: i.role, from: u.data.user?.email ?? "a team" };
    }));
    return {
      me: context.userId, role, plan, seats,
      ownerEmail: owner.data.user?.email ?? null,
      members: members ?? [], invites: invites ?? [], incoming,
      used: 1 + (members?.length ?? 0) + (invites?.length ?? 0),
    };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().trim().toLowerCase().email().max(255), role: z.enum(["admin", "member"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, ownerId, role, plan, seats } = await ctxInfo(context.userId);
    if (role === "member") throw new Error("Only the owner or an admin can invite people.");
    if (plan === "none") throw new Error("Team members need a Pro or Team plan.");
    const [{ count: m }, { count: i }] = await Promise.all([
      db.from("team_members").select("*", { count: "exact", head: true }).eq("owner_id", ownerId),
      db.from("team_invites").select("*", { count: "exact", head: true }).eq("owner_id", ownerId),
    ]);
    if (1 + (m ?? 0) + (i ?? 0) >= seats) throw new Error(`Your plan allows ${seats} users. Upgrade to add more.`);
    const { error } = await db.from("team_invites").upsert({ owner_id: ownerId, email: data.email, role: data.role, invited_by: context.userId }, { onConflict: "owner_id,email" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, ownerId, role } = await ctxInfo(context.userId);
    const email = ((context.claims as { email?: string }).email ?? "").toLowerCase();
    const { data: inv } = await db.from("team_invites").select("owner_id, email").eq("id", data.id).maybeSingle();
    if (!inv) return { ok: true };
    const mineToDecline = inv.email.toLowerCase() === email;
    if (!mineToDecline && (inv.owner_id !== ownerId || role === "member")) throw new Error("Not allowed.");
    await db.from("team_invites").delete().eq("id", data.id);
    return { ok: true };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const email = ((context.claims as { email?: string }).email ?? "").toLowerCase();
    const { data: inv } = await db.from("team_invites").select("*").eq("id", data.id).maybeSingle();
    if (!inv || inv.email.toLowerCase() !== email) throw new Error("This invite isn't for your account.");
    const [{ data: already }, { count: own }] = await Promise.all([
      db.from("team_members").select("owner_id").eq("user_id", context.userId).maybeSingle(),
      db.from("team_members").select("*", { count: "exact", head: true }).eq("owner_id", context.userId),
    ]);
    if (already) throw new Error("Leave your current team first.");
    if (own) throw new Error("You already own a team with members. Remove them first.");
    const { error } = await db.from("team_members").insert({ user_id: context.userId, owner_id: inv.owner_id, role: inv.role, email });
    if (error) throw new Error(error.message);
    await db.from("team_invites").delete().eq("id", inv.id);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, ownerId, role } = await ctxInfo(context.userId);
    const self = data.userId === context.userId;
    if (!self && role === "member") throw new Error("Only the owner or an admin can remove people.");
    const { data: target } = await db.from("team_members").select("role").eq("user_id", data.userId).eq("owner_id", ownerId).maybeSingle();
    if (!target) throw new Error("Not in your team.");
    if (!self && role === "admin" && target.role === "admin") throw new Error("Only the owner can remove an admin.");
    await db.from("team_members").delete().eq("user_id", data.userId);
    return { ok: true };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), role: z.enum(["admin", "member"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, ownerId, role } = await ctxInfo(context.userId);
    if (role !== "owner") throw new Error("Only the owner can change roles.");
    await db.from("team_members").update({ role: data.role }).eq("user_id", data.userId).eq("owner_id", ownerId);
    return { ok: true };
  });
